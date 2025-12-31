// app/api/accounting/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const accountingFilePath = path.join(process.cwd(), 'data', 'accounting.json');
const batchFilePath = path.join(process.cwd(), 'data', 'batch.json');
const salesFilePath = path.join(process.cwd(), 'data', 'sales.json');
const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');
const inventoryFilePath = path.join(process.cwd(), 'data', 'inventory.json');
const defectsFilePath = path.join(process.cwd(), 'data', 'defects.json');

// Ensure accounting file exists
function ensureAccountingFile() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(accountingFilePath)) {
    const initialData = {
      journalEntries: [],
      ledgerAccounts: {},
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(accountingFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Read file helper
function readFromFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Write accounting data
function writeAccountingData(data: any) {
  fs.writeFileSync(accountingFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Create journal entry
function createJournalEntry(id: string, date: string, type: string, description: string, accounts: any[]) {
  return {
    id,
    date,
    type,
    description,
    accounts,
    createdAt: new Date().toISOString()
  };
}

// Update ledger account
function updateLedger(ledger: any, accountName: string, debit: number, credit: number, date: string, ref: string) {
  if (!ledger[accountName]) {
    ledger[accountName] = {
      debit: 0,
      credit: 0,
      balance: 0,
      entries: []
    };
  }
  
  ledger[accountName].debit += debit;
  ledger[accountName].credit += credit;
  ledger[accountName].balance += (debit - credit);
  ledger[accountName].entries.push({
    date,
    ref,
    debit,
    credit,
    balance: ledger[accountName].balance
  });
}

// Process all accounting data
function processAccountingData() {
  const batches = readFromFile(batchFilePath);
  const sales = readFromFile(salesFilePath);
  const orders = readFromFile(ordersFilePath);
  const inventory = readFromFile(inventoryFilePath);
  const defects = readFromFile(defectsFilePath);

  const journalEntries: any[] = [];
  const ledger: any = {};

  // 1. PROCESS BATCH CREATION (Inventory Purchase)
  batches.forEach((batch: any) => {
    const entryId = `BATCH-${batch.id}`;
    const totalCost = batch.costPrice * batch.quantity;
    const date = batch.createdAt || new Date().toISOString();

    // Journal Entry: Dr. Inventory, Cr. Cash
    journalEntries.push(createJournalEntry(
      entryId,
      date,
      'Batch Creation',
      `Purchased ${batch.quantity} units at ৳${batch.costPrice} each (Base Code: ${batch.baseCode})`,
      [
        { account: 'Inventory', debit: totalCost, credit: 0 },
        { account: 'Cash', debit: 0, credit: totalCost }
      ]
    ));

    updateLedger(ledger, 'Inventory', totalCost, 0, date, entryId);
    updateLedger(ledger, 'Cash', 0, totalCost, date, entryId);
  });

  // 2. PROCESS POS SALES
  sales.forEach((sale: any) => {
    const entryId = `SALE-${sale.id}`;
    const revenue = sale.amounts?.total || 0;
    const date = sale.createdAt || new Date().toISOString();

    // Calculate COGS
    let cogs = 0;
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach((item: any) => {
        if (item.isDefective) {
          // For defective items, use the original cost from defects
          const defect = defects.find((d: any) => d.id === item.defectId);
          if (defect) {
            cogs += defect.costPrice || 0;
          }
        } else {
          // For regular items, find cost from inventory
          const invItem = inventory.find((inv: any) => inv.productId === item.productId);
          if (invItem) {
            cogs += (invItem.costPrice || 0) * item.qty;
          }
        }
      });
    }

    // Revenue Recognition Entry
    const revenueAccounts: any[] = [];
    if (sale.payments?.cash > 0) {
      revenueAccounts.push({ account: 'Cash', debit: sale.payments.cash, credit: 0 });
      updateLedger(ledger, 'Cash', sale.payments.cash, 0, date, entryId);
    }
    if (sale.payments?.card > 0) {
      revenueAccounts.push({ account: 'Card Receivable', debit: sale.payments.card, credit: 0 });
      updateLedger(ledger, 'Card Receivable', sale.payments.card, 0, date, entryId);
    }
    if (sale.payments?.bkash > 0) {
      revenueAccounts.push({ account: 'Bkash Receivable', debit: sale.payments.bkash, credit: 0 });
      updateLedger(ledger, 'Bkash Receivable', sale.payments.bkash, 0, date, entryId);
    }
    if (sale.payments?.nagad > 0) {
      revenueAccounts.push({ account: 'Nagad Receivable', debit: sale.payments.nagad, credit: 0 });
      updateLedger(ledger, 'Nagad Receivable', sale.payments.nagad, 0, date, entryId);
    }
    if (sale.payments?.due > 0) {
      revenueAccounts.push({ account: 'Accounts Receivable', debit: sale.payments.due, credit: 0 });
      updateLedger(ledger, 'Accounts Receivable', sale.payments.due, 0, date, entryId);
    }
    
    revenueAccounts.push({ account: 'Sales Revenue', debit: 0, credit: revenue });
    updateLedger(ledger, 'Sales Revenue', 0, revenue, date, entryId);

    journalEntries.push(createJournalEntry(
      entryId,
      date,
      'POS Sale',
      `Sale to ${sale.customer?.name || 'Walk-in Customer'} - ${sale.items?.length || 0} items`,
      revenueAccounts
    ));

    // COGS Entry
    if (cogs > 0) {
      journalEntries.push(createJournalEntry(
        `${entryId}-COGS`,
        date,
        'Cost of Goods Sold',
        `COGS for Sale ${sale.id}`,
        [
          { account: 'Cost of Goods Sold', debit: cogs, credit: 0 },
          { account: 'Inventory', debit: 0, credit: cogs }
        ]
      ));

      updateLedger(ledger, 'Cost of Goods Sold', cogs, 0, date, `${entryId}-COGS`);
      updateLedger(ledger, 'Inventory', 0, cogs, date, `${entryId}-COGS`);
    }

    // Handle Returns
    if (sale.returnHistory && sale.returnHistory.length > 0) {
      sale.returnHistory.forEach((returnEntry: any, idx: number) => {
        const returnId = `${entryId}-RETURN-${idx}`;
        const returnAmount = returnEntry.refundToCustomer || 0;
        const returnDate = returnEntry.timestamp || returnEntry.date;

        if (returnAmount > 0) {
          journalEntries.push(createJournalEntry(
            returnId,
            returnDate,
            'Sales Return',
            `Return for Sale ${sale.id} - Refund ৳${returnAmount}`,
            [
              { account: 'Sales Returns', debit: returnAmount, credit: 0 },
              { account: 'Cash', debit: 0, credit: returnAmount }
            ]
          ));

          updateLedger(ledger, 'Sales Returns', returnAmount, 0, returnDate, returnId);
          updateLedger(ledger, 'Cash', 0, returnAmount, returnDate, returnId);
        }
      });
    }

    // Handle Exchanges
    if (sale.exchangeHistory && sale.exchangeHistory.length > 0) {
      sale.exchangeHistory.forEach((exchange: any, idx: number) => {
        const exchangeId = `${entryId}-EXCHANGE-${idx}`;
        const difference = exchange.difference || 0;
        const exchangeDate = exchange.date;

        if (difference > 0) {
          // Customer owes more
          journalEntries.push(createJournalEntry(
            exchangeId,
            exchangeDate,
            'Sales Exchange',
            `Exchange for Sale ${sale.id} - Additional charge ৳${difference}`,
            [
              { account: 'Cash', debit: difference, credit: 0 },
              { account: 'Sales Revenue', debit: 0, credit: difference }
            ]
          ));

          updateLedger(ledger, 'Cash', difference, 0, exchangeDate, exchangeId);
          updateLedger(ledger, 'Sales Revenue', 0, difference, exchangeDate, exchangeId);
        } else if (difference < 0) {
          // Refund to customer
          const refund = Math.abs(difference);
          journalEntries.push(createJournalEntry(
            exchangeId,
            exchangeDate,
            'Sales Exchange',
            `Exchange for Sale ${sale.id} - Refund ৳${refund}`,
            [
              { account: 'Sales Returns', debit: refund, credit: 0 },
              { account: 'Cash', debit: 0, credit: refund }
            ]
          ));

          updateLedger(ledger, 'Sales Returns', refund, 0, exchangeDate, exchangeId);
          updateLedger(ledger, 'Cash', 0, refund, exchangeDate, exchangeId);
        }
      });
    }
  });

  // 3. PROCESS SOCIAL COMMERCE ORDERS
  orders.forEach((order: any) => {
    const entryId = `ORDER-${order.id}`;
    const revenue = order.amounts?.total || 0;
    const date = order.createdAt || new Date().toISOString();

    // Calculate COGS
    let cogs = 0;
    if (order.products && Array.isArray(order.products)) {
      order.products.forEach((product: any) => {
        if (product.isDefective) {
          const defect = defects.find((d: any) => d.id === product.defectId);
          if (defect) {
            cogs += defect.costPrice || 0;
          }
        } else {
          const invItem = inventory.find((inv: any) => inv.productId === product.productId);
          if (invItem) {
            cogs += (invItem.costPrice || 0) * product.qty;
          }
        }
      });
    }

    // Revenue Recognition Entry
    const revenueAccounts: any[] = [];
    if (order.payments?.cash > 0) {
      revenueAccounts.push({ account: 'Cash', debit: order.payments.cash, credit: 0 });
      updateLedger(ledger, 'Cash', order.payments.cash, 0, date, entryId);
    }
    if (order.payments?.bkash > 0) {
      revenueAccounts.push({ account: 'Bkash Receivable', debit: order.payments.bkash, credit: 0 });
      updateLedger(ledger, 'Bkash Receivable', order.payments.bkash, 0, date, entryId);
    }
    if (order.payments?.nagad > 0) {
      revenueAccounts.push({ account: 'Nagad Receivable', debit: order.payments.nagad, credit: 0 });
      updateLedger(ledger, 'Nagad Receivable', order.payments.nagad, 0, date, entryId);
    }
    if (order.payments?.due > 0) {
      revenueAccounts.push({ account: 'Accounts Receivable', debit: order.payments.due, credit: 0 });
      updateLedger(ledger, 'Accounts Receivable', order.payments.due, 0, date, entryId);
    }

    revenueAccounts.push({ account: 'Sales Revenue', debit: 0, credit: revenue });
    updateLedger(ledger, 'Sales Revenue', 0, revenue, date, entryId);

    journalEntries.push(createJournalEntry(
      entryId,
      date,
      'Social Order',
      `Order from ${order.customerName || 'Customer'} - ${order.products?.length || 0} items`,
      revenueAccounts
    ));

    // COGS Entry
    if (cogs > 0) {
      journalEntries.push(createJournalEntry(
        `${entryId}-COGS`,
        date,
        'Cost of Goods Sold',
        `COGS for Order ${order.id}`,
        [
          { account: 'Cost of Goods Sold', debit: cogs, credit: 0 },
          { account: 'Inventory', debit: 0, credit: cogs }
        ]
      ));

      updateLedger(ledger, 'Cost of Goods Sold', cogs, 0, date, `${entryId}-COGS`);
      updateLedger(ledger, 'Inventory', 0, cogs, date, `${entryId}-COGS`);
    }

    // Handle Returns
    if (order.returnHistory && order.returnHistory.length > 0) {
      order.returnHistory.forEach((returnEntry: any, idx: number) => {
        const returnId = `${entryId}-RETURN-${idx}`;
        const returnAmount = returnEntry.refundToCustomer || 0;
        const returnDate = returnEntry.timestamp || returnEntry.date;

        if (returnAmount > 0) {
          journalEntries.push(createJournalEntry(
            returnId,
            returnDate,
            'Order Return',
            `Return for Order ${order.id} - Refund ৳${returnAmount}`,
            [
              { account: 'Sales Returns', debit: returnAmount, credit: 0 },
              { account: 'Cash', debit: 0, credit: returnAmount }
            ]
          ));

          updateLedger(ledger, 'Sales Returns', returnAmount, 0, returnDate, returnId);
          updateLedger(ledger, 'Cash', 0, returnAmount, returnDate, returnId);
        }
      });
    }

    // Handle Exchanges
    if (order.exchangeHistory && order.exchangeHistory.length > 0) {
      order.exchangeHistory.forEach((exchange: any, idx: number) => {
        const exchangeId = `${entryId}-EXCHANGE-${idx}`;
        const difference = exchange.difference || 0;
        const exchangeDate = exchange.date;

        if (difference > 0) {
          journalEntries.push(createJournalEntry(
            exchangeId,
            exchangeDate,
            'Order Exchange',
            `Exchange for Order ${order.id} - Additional charge ৳${difference}`,
            [
              { account: 'Cash', debit: difference, credit: 0 },
              { account: 'Sales Revenue', debit: 0, credit: difference }
            ]
          ));

          updateLedger(ledger, 'Cash', difference, 0, exchangeDate, exchangeId);
          updateLedger(ledger, 'Sales Revenue', 0, difference, exchangeDate, exchangeId);
        } else if (difference < 0) {
          const refund = Math.abs(difference);
          journalEntries.push(createJournalEntry(
            exchangeId,
            exchangeDate,
            'Order Exchange',
            `Exchange for Order ${order.id} - Refund ৳${refund}`,
            [
              { account: 'Sales Returns', debit: refund, credit: 0 },
              { account: 'Cash', debit: 0, credit: refund }
            ]
          ));

          updateLedger(ledger, 'Sales Returns', refund, 0, exchangeDate, exchangeId);
          updateLedger(ledger, 'Cash', 0, refund, exchangeDate, exchangeId);
        }
      });
    }
  });

  // Sort journal entries by date (newest first)
  journalEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    journalEntries,
    ledgerAccounts: ledger,
    lastUpdated: new Date().toISOString()
  };
}

// GET - Fetch accounting data
export async function GET(req: NextRequest) {
  try {
    ensureAccountingFile();
    
    // Regenerate accounting data from source files
    const accountingData = processAccountingData();
    
    // Save to file
    writeAccountingData(accountingData);
    
    return NextResponse.json(accountingData);
  } catch (error) {
    console.error('Error fetching accounting data:', error);
    return NextResponse.json({ error: 'Failed to load accounting data' }, { status: 500 });
  }
}

// POST - Regenerate accounting data (manual refresh)
export async function POST(req: NextRequest) {
  try {
    ensureAccountingFile();
    
    const accountingData = processAccountingData();
    writeAccountingData(accountingData);
    
    return NextResponse.json({
      success: true,
      message: 'Accounting data regenerated successfully',
      data: accountingData
    });
  } catch (error) {
    console.error('Error regenerating accounting data:', error);
    return NextResponse.json({ error: 'Failed to regenerate accounting data' }, { status: 500 });
  }
}
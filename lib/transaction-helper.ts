// lib/transaction-helper.ts
// Automatically creates transaction entries from ALL ERP operations

import fs from 'fs';
import path from 'path';

const transactionsFilePath = path.join(process.cwd(), 'data', 'transactions.json');

interface Transaction {
  id: string;
  name: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  comment?: string;
  receiptImage?: string;
  createdAt: string;
  source: 'manual' | 'sale' | 'order' | 'batch' | 'return' | 'exchange';
  referenceId: string;
}

interface TransactionData {
  categories: any[];
  transactions: Transaction[];
}

// Read transactions
function readTransactions(): TransactionData {
  const dataDir = path.dirname(transactionsFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(transactionsFilePath)) {
    const initialData: TransactionData = {
      categories: [
        { id: 'cat-1', name: 'POS Sales', type: 'income', createdAt: new Date().toISOString() },
        { id: 'cat-2', name: 'Online Orders', type: 'income', createdAt: new Date().toISOString() },
        { id: 'cat-3', name: 'Inventory Purchase', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-4', name: 'Sales Return', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-5', name: 'Order Return', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-6', name: 'Salary & Wages', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-7', name: 'Rent', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-8', name: 'Utilities', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-9', name: 'Marketing', type: 'expense', createdAt: new Date().toISOString() },
      ],
      transactions: []
    };
    fs.writeFileSync(transactionsFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  
  const data = fs.readFileSync(transactionsFilePath, 'utf-8');
  return JSON.parse(data);
}

// Write transactions
function writeTransactions(data: TransactionData) {
  fs.writeFileSync(transactionsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 1. BATCH CREATION - Inventory Purchase (Expense)
 */
export function createBatchTransaction(batchData: any) {
  try {
    const data = readTransactions();
    const totalCost = batchData.costPrice * batchData.quantity;
    
    const transaction: Transaction = {
      id: `txn-batch-${batchData.id}`,
      name: `Inventory Purchase - Batch ${batchData.baseCode || batchData.id}`,
      description: `Purchased ${batchData.quantity} units @ ৳${batchData.costPrice} each`,
      type: 'expense',
      amount: totalCost,
      category: 'Inventory Purchase',
      date: batchData.createdAt || new Date().toISOString(),
      comment: `Expected Revenue: ৳${batchData.sellingPrice * batchData.quantity}, Expected Profit: ৳${(batchData.sellingPrice - batchData.costPrice) * batchData.quantity}`,
      createdAt: new Date().toISOString(),
      source: 'batch',
      referenceId: String(batchData.id)
    };
    
    const existingIndex = data.transactions.findIndex(t => t.id === transaction.id);
    if (existingIndex !== -1) {
      data.transactions[existingIndex] = transaction;
    } else {
      data.transactions.push(transaction);
    }
    
    writeTransactions(data);
    console.log(`✅ Transaction created: Batch Purchase ৳${totalCost}`);
  } catch (error) {
    console.error('Error creating batch transaction:', error);
  }
}

/**
 * 2. POS SALE - Customer Purchase (Income)
 */
export function createSaleTransaction(saleData: any) {
  try {
    const data = readTransactions();
    const totalAmount = saleData.amounts?.total || 0;
    const itemCount = saleData.items?.length || 0;
    const itemNames = saleData.items?.map((item: any) => item.productName || item.name).join(', ') || 'Items';
    
    const transaction: Transaction = {
      id: `txn-sale-${saleData.id}`,
      name: itemCount === 1 ? `Sale: ${itemNames}` : `Sale: ${itemNames.split(',')[0]} +${itemCount - 1} more`,
      description: `POS Sale to ${saleData.customer?.name || saleData.customerName || 'Walk-in Customer'}`,
      type: 'income',
      amount: totalAmount,
      category: 'POS Sales',
      date: saleData.createdAt || new Date().toISOString(),
      comment: `Items: ${itemCount}, Cash: ৳${saleData.payments?.cash || 0}, Card: ৳${saleData.payments?.card || 0}, Bkash: ৳${saleData.payments?.bkash || 0}, Nagad: ৳${saleData.payments?.nagad || 0}, Due: ৳${saleData.payments?.due || 0}`,
      createdAt: new Date().toISOString(),
      source: 'sale',
      referenceId: String(saleData.id)
    };
    
    const existingIndex = data.transactions.findIndex(t => t.id === transaction.id);
    if (existingIndex !== -1) {
      data.transactions[existingIndex] = transaction;
    } else {
      data.transactions.push(transaction);
    }
    
    writeTransactions(data);
    console.log(`✅ Transaction created: POS Sale ৳${totalAmount}`);
  } catch (error) {
    console.error('Error creating sale transaction:', error);
  }
}

/**
 * 3. SOCIAL COMMERCE ORDER - Customer Purchase (Income)
 */
export function createOrderTransaction(orderData: any) {
  try {
    const data = readTransactions();
    const totalAmount = orderData.amounts?.total || orderData.totalAmount || 0;
    const productCount = orderData.products?.length || 0;
    const productNames = orderData.products?.map((p: any) => p.productName || p.name).join(', ') || 'Products';
    
    const transaction: Transaction = {
      id: `txn-order-${orderData.id}`,
      name: productCount === 1 ? `Order: ${productNames}` : `Order: ${productNames.split(',')[0]} +${productCount - 1} more`,
      description: `Social Order from ${orderData.customerName || 'Customer'}`,
      type: 'income',
      amount: totalAmount,
      category: 'Online Orders',
      date: orderData.createdAt || new Date().toISOString(),
      comment: `Platform: ${orderData.platform || 'Social Media'}, Products: ${productCount}, Cash: ৳${orderData.payments?.cash || 0}, Bkash: ৳${orderData.payments?.bkash || 0}, Due: ৳${orderData.payments?.due || 0}`,
      createdAt: new Date().toISOString(),
      source: 'order',
      referenceId: String(orderData.id)
    };
    
    const existingIndex = data.transactions.findIndex(t => t.id === transaction.id);
    if (existingIndex !== -1) {
      data.transactions[existingIndex] = transaction;
    } else {
      data.transactions.push(transaction);
    }
    
    writeTransactions(data);
    console.log(`✅ Transaction created: Social Order ৳${totalAmount}`);
  } catch (error) {
    console.error('Error creating order transaction:', error);
  }
}

/**
 * 4. SALES RETURN - Refund to Customer (Expense)
 */
export function createSaleReturnTransaction(saleId: string, returnData: any) {
  try {
    const data = readTransactions();
    const refundAmount = returnData.refundToCustomer || returnData.refundAmount || 0;
    
    if (refundAmount <= 0) return; // No transaction if no refund
    
    const transaction: Transaction = {
      id: `txn-return-sale-${saleId}-${Date.now()}`,
      name: `Sales Return - Refund`,
      description: `Refund for returned items from Sale #${saleId}`,
      type: 'expense',
      amount: refundAmount,
      category: 'Sales Return',
      date: returnData.timestamp || returnData.date || new Date().toISOString(),
      comment: `Returned Products: ${returnData.returnedProducts?.map((p: any) => `${p.productName || 'Item'} (${p.quantity})`).join(', ')}`,
      createdAt: new Date().toISOString(),
      source: 'return',
      referenceId: `sale-${saleId}`
    };
    
    data.transactions.push(transaction);
    writeTransactions(data);
    console.log(`✅ Transaction created: Sales Return Refund ৳${refundAmount}`);
  } catch (error) {
    console.error('Error creating sale return transaction:', error);
  }
}

/**
 * 5. ORDER RETURN - Refund to Customer (Expense)
 */
export function createOrderReturnTransaction(orderId: string, returnData: any) {
  try {
    const data = readTransactions();
    const refundAmount = returnData.refundToCustomer || returnData.refundAmount || 0;
    
    if (refundAmount <= 0) return;
    
    const transaction: Transaction = {
      id: `txn-return-order-${orderId}-${Date.now()}`,
      name: `Order Return - Refund`,
      description: `Refund for returned items from Order #${orderId}`,
      type: 'expense',
      amount: refundAmount,
      category: 'Order Return',
      date: returnData.timestamp || returnData.date || new Date().toISOString(),
      comment: `Returned Products: ${returnData.returnedProducts?.map((p: any) => `${p.productName || 'Item'} (${p.quantity})`).join(', ')}`,
      createdAt: new Date().toISOString(),
      source: 'return',
      referenceId: `order-${orderId}`
    };
    
    data.transactions.push(transaction);
    writeTransactions(data);
    console.log(`✅ Transaction created: Order Return Refund ৳${refundAmount}`);
  } catch (error) {
    console.error('Error creating order return transaction:', error);
  }
}

/**
 * 6. SALES EXCHANGE - Adjustment (Income or Expense)
 */
export function createSaleExchangeTransaction(saleId: string, exchangeData: any) {
  try {
    const data = readTransactions();
    const difference = exchangeData.difference || 0;
    
    if (difference === 0) return; // No transaction if equal exchange
    
    const isCustomerPaying = difference > 0;
    
    const transaction: Transaction = {
      id: `txn-exchange-sale-${saleId}-${Date.now()}`,
      name: `Sales Exchange - ${isCustomerPaying ? 'Additional Payment' : 'Refund'}`,
      description: `Exchange adjustment for Sale #${saleId}`,
      type: isCustomerPaying ? 'income' : 'expense',
      amount: Math.abs(difference),
      category: 'POS Sales',
      date: exchangeData.date || new Date().toISOString(),
      comment: `Removed: ${exchangeData.removedProducts?.map((p: any) => `${p.productName || 'Item'} (${p.quantity})`).join(', ')}. Added: ${exchangeData.replacementProducts?.map((p: any) => `${p.name || 'Item'} (${p.quantity})`).join(', ')}`,
      createdAt: new Date().toISOString(),
      source: 'exchange',
      referenceId: `sale-${saleId}`
    };
    
    data.transactions.push(transaction);
    writeTransactions(data);
    console.log(`✅ Transaction created: Sales Exchange ${isCustomerPaying ? '+' : '-'}৳${Math.abs(difference)}`);
  } catch (error) {
    console.error('Error creating sale exchange transaction:', error);
  }
}

/**
 * 7. ORDER EXCHANGE - Adjustment (Income or Expense)
 */
export function createOrderExchangeTransaction(orderId: string, exchangeData: any) {
  try {
    const data = readTransactions();
    const difference = exchangeData.difference || 0;
    
    if (difference === 0) return;
    
    const isCustomerPaying = difference > 0;
    
    const transaction: Transaction = {
      id: `txn-exchange-order-${orderId}-${Date.now()}`,
      name: `Order Exchange - ${isCustomerPaying ? 'Additional Payment' : 'Refund'}`,
      description: `Exchange adjustment for Order #${orderId}`,
      type: isCustomerPaying ? 'income' : 'expense',
      amount: Math.abs(difference),
      category: 'Online Orders',
      date: exchangeData.date || new Date().toISOString(),
      comment: `Removed: ${exchangeData.removedProducts?.map((p: any) => `${p.productName || 'Item'} (${p.quantity})`).join(', ')}. Added: ${exchangeData.replacementProducts?.map((p: any) => `${p.name || 'Item'} (${p.quantity})`).join(', ')}`,
      createdAt: new Date().toISOString(),
      source: 'exchange',
      referenceId: `order-${orderId}`
    };
    
    data.transactions.push(transaction);
    writeTransactions(data);
    console.log(`✅ Transaction created: Order Exchange ${isCustomerPaying ? '+' : '-'}৳${Math.abs(difference)}`);
  } catch (error) {
    console.error('Error creating order exchange transaction:', error);
  }
}

/**
 * REMOVE TRANSACTION - When sale/order/batch is deleted
 */
export function removeTransaction(source: 'sale' | 'order' | 'batch', referenceId: string) {
  try {
    const data = readTransactions();
    const transactionId = `txn-${source}-${referenceId}`;
    
    const initialLength = data.transactions.length;
    data.transactions = data.transactions.filter(t => t.id !== transactionId);
    
    if (data.transactions.length < initialLength) {
      writeTransactions(data);
      console.log(`✅ Transaction removed for ${source} ${referenceId}`);
    }
  } catch (error) {
    console.error('Error removing transaction:', error);
  }
}

/**
 * UPDATE TRANSACTION - When sale/order is modified
 */
export function updateTransaction(source: 'sale' | 'order', referenceId: string, newData: any) {
  try {
    removeTransaction(source, referenceId);
    
    if (source === 'sale') {
      createSaleTransaction(newData);
    } else if (source === 'order') {
      createOrderTransaction(newData);
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
  }
}



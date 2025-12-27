// app/api/sales/exchange/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { triggerAccountingUpdate } from '@/lib/accounting-helper';
import { createSaleExchangeTransaction } from '@/lib/transaction-helper';

const salesFilePath = path.resolve('data', 'sales.json');
const inventoryFilePath = path.resolve('data', 'inventory.json');

const readSalesFromFile = () => {
  try {
    if (fs.existsSync(salesFilePath)) {
      const fileData = fs.readFileSync(salesFilePath, 'utf8');
      return JSON.parse(fileData);
    }
    return [];
  } catch (error) {
    console.error('❌ Error reading sales file:', error);
    return [];
  }
};

const writeSalesToFile = (sales: any[]) => {
  try {
    fs.mkdirSync(path.dirname(salesFilePath), { recursive: true });
    fs.writeFileSync(salesFilePath, JSON.stringify(sales, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Error writing sales file:', error);
    throw error;
  }
};

const readInventoryFromFile = () => {
  try {
    if (fs.existsSync(inventoryFilePath)) {
      const fileData = fs.readFileSync(inventoryFilePath, 'utf8');
      return JSON.parse(fileData);
    }
    return [];
  } catch (error) {
    console.error('❌ Error reading inventory file:', error);
    return [];
  }
};

const writeInventoryToFile = (inventory: any[]) => {
  try {
    fs.mkdirSync(path.dirname(inventoryFilePath), { recursive: true });
    fs.writeFileSync(inventoryFilePath, JSON.stringify(inventory, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Error writing inventory file:', error);
    throw error;
  }
};

export async function POST(request: Request) {
  try {
    const exchangeData = await request.json();
    const { saleId, removedProducts, replacementProducts } = exchangeData;

    if (!saleId) {
      return NextResponse.json({ error: 'Missing sale ID' }, { status: 400 });
    }

    const sales = readSalesFromFile();
    const inventory = readInventoryFromFile();

    const saleIndex = sales.findIndex((sale: any) => sale.id === saleId);
    
    if (saleIndex === -1) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const sale = sales[saleIndex];
    let updatedItems = [...sale.items];

    // Step 1: Handle removed products and free up barcodes in inventory
    removedProducts.forEach((removed: any) => {
      const itemIndex = updatedItems.findIndex((i: any) => i.id === removed.productId);
      if (itemIndex !== -1) {
        const item = updatedItems[itemIndex];
        
        // If the item has barcodes, free them up in inventory
        if (item.barcodes && item.barcodes.length > 0) {
          const removedBarcodes = item.barcodes.splice(0, removed.quantity);
          
          removedBarcodes.forEach((bc: string) => {
            const invItem = inventory.find((i: any) => i.barcode === bc);
            if (invItem) {
              invItem.status = 'available';
              delete invItem.saleId;
              delete invItem.soldAt;
              invItem.updatedAt = new Date().toISOString();
            }
          });
        }

        item.qty -= removed.quantity;
        item.amount = item.price * item.qty - (item.discount || 0);

        if (item.qty <= 0) {
          updatedItems.splice(itemIndex, 1);
        }
      }
    });

    // Step 2: Handle replacement products and assign barcodes from inventory
    for (const rep of replacementProducts) {
      let item = updatedItems.find((i: any) => i.productId === rep.id);

      if (!item) {
        item = {
          id: Date.now() + Math.random(),
          productId: rep.id,
          productName: rep.name,
          size: rep.size,
          qty: 0,
          price: rep.price,
          discount: 0,
          amount: 0,
          barcodes: []
        };
        updatedItems.push(item);
      }

      // Find available inventory items
      const availableItems = inventory.filter((i: any) => i.productId === rep.id && i.status === 'available');
      if (availableItems.length < rep.quantity) {
        throw new Error(`Not enough stock for product ${rep.name} (ID: ${rep.id}). Available: ${availableItems.length}, Requested: ${rep.quantity}`);
      }

      const selectedItems = availableItems.slice(0, rep.quantity);
      const newBarcodes = selectedItems.map((i: any) => i.barcode);

      if (!item.barcodes) {
        item.barcodes = [];
      }
      item.barcodes.push(...newBarcodes);
      item.qty += rep.quantity;
      item.amount = item.price * item.qty - (item.discount || 0);

      // Update inventory for new barcodes
      selectedItems.forEach((invItem: any) => {
        invItem.status = 'sold';
        invItem.saleId = sale.id;
        invItem.soldAt = new Date().toISOString();
        invItem.updatedAt = new Date().toISOString();
      });
    }

    // Step 3: Recalculate ALL sale totals from scratch
    const newSubtotal = updatedItems.reduce((sum: number, i: any) => sum + i.amount, 0);
    const totalDiscount = updatedItems.reduce((sum: number, i: any) => sum + (i.discount || 0), 0);
    
    // Calculate VAT based on the original VAT rate
    const vatRate = sale.amounts.vatRate || 0;
    const newVat = Math.round(newSubtotal * (vatRate / 100));
    
    // Calculate new total
    const transportCost = sale.amounts.transportCost || 0;
    const newTotal = newSubtotal + newVat + transportCost;
    
    // Calculate what's still due (total - what's already been paid)
    const totalPaid = sale.payments.totalPaid || 0;
    const newDue = newTotal - totalPaid;

    // Calculate the difference from the original sale total
    const originalTotal = sale.amounts.total || 0;
    const difference = newTotal - originalTotal;

    // Step 4: Update sale with new values
    sales[saleIndex] = {
      ...sale,
      items: updatedItems,
      amounts: {
        ...sale.amounts,
        subtotal: newSubtotal,
        totalDiscount: totalDiscount,
        vat: newVat,
        transportCost: transportCost,
        total: newTotal
      },
      payments: {
        ...sale.payments,
        due: newDue
      },
      exchangeHistory: [
        ...(sale.exchangeHistory || []),
        {
          date: new Date().toISOString(),
          removedProducts,
          replacementProducts,
          originalTotal,
          newTotal,
          difference,
          note: difference > 0 ? 'Customer owes additional payment' : difference < 0 ? 'Refund to customer' : 'No payment difference'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    // Write updates to files
    writeSalesToFile(sales);
    writeInventoryToFile(inventory);
     createSaleExchangeTransaction(saleId, {
      removedProducts,
      replacementProducts,
      difference: difference,
      date: new Date().toISOString()
    });
    triggerAccountingUpdate();

    return NextResponse.json({
      success: true,
      message: 'Exchange processed successfully!',
      sale: sales[saleIndex],
      difference: difference,
      totalDue: newDue
    });
  } catch (error: any) {
    console.error('❌ Failed to process exchange:', error);
    return NextResponse.json({ error: error.message || 'Failed to process exchange' }, { status: 500 });
  }
}
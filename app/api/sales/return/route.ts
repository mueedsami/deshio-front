// app/api/sales/return/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { triggerAccountingUpdate } from '@/lib/accounting-helper';
import { createSaleReturnTransaction } from '@/lib/transaction-helper';

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
    const returnData = await request.json();
    const { saleId, returnedProducts, refundAmount } = returnData;

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

    // Step 1: Update inventory for returned products
    returnedProducts.forEach((returned: any) => {
      const item = sale.items.find((i: any) => i.id === returned.productId);
      if (item && item.barcodes && item.barcodes.length > 0) {
        const quantityToReturn = returned.quantity;
        let barcodesToUpdate = item.barcodes.slice(0, quantityToReturn);

        barcodesToUpdate.forEach((barcode: string) => {
          const inventoryItemIndex = inventory.findIndex((invItem: any) => invItem.barcode === barcode);
          if (inventoryItemIndex !== -1) {
            inventory[inventoryItemIndex] = {
              ...inventory[inventoryItemIndex],
              status: 'available',
              updatedAt: new Date().toISOString(),
              soldAt: undefined,
              saleId: undefined
            };
          }
        });
      }
    });

    // Step 2: Remove or reduce quantities for returned products in the sale
    returnedProducts.forEach((returned: any) => {
      const index = updatedItems.findIndex((i: any) => i.id === returned.productId);
      if (index !== -1) {
        if (returned.quantity >= updatedItems[index].qty) {
          // Remove item completely
          updatedItems.splice(index, 1);
        } else {
          // Reduce quantity
          updatedItems[index].qty -= returned.quantity;
          updatedItems[index].amount = (updatedItems[index].price * updatedItems[index].qty) - (updatedItems[index].discount || 0);
        }
      }
    });

    // Step 3: Recalculate ALL sale totals
    const newSubtotal = updatedItems.reduce((sum: number, i: any) => sum + i.amount, 0);
    const totalDiscount = updatedItems.reduce((sum: number, i: any) => sum + (i.discount || 0), 0);
    
    // Calculate VAT based on the original VAT rate
    const vatRate = sale.amounts.vatRate || 0;
    const newVat = Math.round(newSubtotal * (vatRate / 100));
    
    // Calculate new total
    const transportCost = sale.amounts.transportCost || 0;
    const newTotal = newSubtotal + newVat + transportCost;
    
    // Calculate refund amount (difference from original)
    const originalTotal = sale.amounts.total || 0;
    const actualRefund = originalTotal - newTotal;
    
    // Adjust payments - if customer paid more than new total, they get refund
    const totalPaid = sale.payments.totalPaid || 0;
    let newDue = 0;
    let refundToCustomer = 0;
    
    if (totalPaid > newTotal) {
      // Customer overpaid, needs refund
      refundToCustomer = totalPaid - newTotal;
      newDue = 0;
    } else {
      // Customer still owes or paid exactly
      newDue = newTotal - totalPaid;
      refundToCustomer = 0;
    }

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
      returnHistory: [
        ...(sale.returnHistory || []),
        {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].slice(0, 5),
          timestamp: new Date().toISOString(),
          returnedProducts,
          originalTotal,
          newTotal,
          refundAmount: actualRefund,
          refundToCustomer: refundToCustomer,
          note: refundToCustomer > 0 ? `Refund ৳${refundToCustomer} to customer` : `Sale total reduced by ৳${actualRefund}`
        }
      ],
      updatedAt: new Date().toISOString()
    };

    // Step 5: Write updates to both sales and inventory files
    writeSalesToFile(sales);
    writeInventoryToFile(inventory);
      createSaleReturnTransaction(saleId, {
      returnedProducts,
      refundToCustomer: refundToCustomer,
      timestamp: new Date().toISOString()
    });
    triggerAccountingUpdate();

    return NextResponse.json({
      success: true,
      message: 'Return processed successfully!',
      sale: sales[saleIndex],
      refundAmount: actualRefund,
      refundToCustomer: refundToCustomer,
      newTotal: newTotal,
      newDue: newDue
    });
  } catch (error) {
    console.error('❌ Failed to process return:', error);
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 });
  }
}
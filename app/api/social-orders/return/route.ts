import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { triggerAccountingUpdate } from '@/lib/accounting-helper';
import { createOrderReturnTransaction } from '@/lib/transaction-helper';

const ordersFilePath = path.resolve('data', 'orders.json');
const inventoryFilePath = path.resolve('data', 'inventory.json');

const readOrdersFromFile = () => {
  try {
    if (fs.existsSync(ordersFilePath)) {
      const fileData = fs.readFileSync(ordersFilePath, 'utf8');
      return JSON.parse(fileData);
    }
    return [];
  } catch (error) {
    console.error('❌ Error reading orders file:', error);
    return [];
  }
};

const writeOrdersToFile = (orders: any[]) => {
  try {
    fs.mkdirSync(path.dirname(ordersFilePath), { recursive: true });
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Error writing orders file:', error);
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
    const { orderId, returnedProducts, refundAmount } = returnData;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const orders = readOrdersFromFile();
    const inventory = readInventoryFromFile();
    const orderIndex = orders.findIndex((order: any) => String(order.id) === String(orderId));
    
    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[orderIndex];
    let updatedProducts = [...order.products];

    // Step 1: Update inventory for returned products
    returnedProducts.forEach((returned: any) => {
      const product = order.products.find((p: any) => p.id === returned.productId);
      if (product && product.barcodes && product.barcodes.length > 0) {
        const quantityToReturn = returned.quantity;
        let barcodesToUpdate = product.barcodes.slice(0, quantityToReturn); // Select barcodes based on quantity

        barcodesToUpdate.forEach((barcode: string) => {
          const inventoryItemIndex = inventory.findIndex((item: any) => item.barcode === barcode);
          if (inventoryItemIndex !== -1) {
            inventory[inventoryItemIndex] = {
              ...inventory[inventoryItemIndex],
              status: 'available',
              updatedAt: new Date().toISOString(),
              soldAt: undefined, // Remove soldAt
              orderId: undefined // Remove orderId
            };
          }
        });
      }
    });

    // Step 2: Remove or reduce quantities for returned products in the order
    returnedProducts.forEach((returned: any) => {
      const index = updatedProducts.findIndex((p: any) => p.id === returned.productId);
      if (index !== -1) {
        if (returned.quantity >= updatedProducts[index].qty) {
          // Remove product completely
          updatedProducts.splice(index, 1);
        } else {
          // Reduce quantity
          updatedProducts[index].qty -= returned.quantity;
          updatedProducts[index].amount = (updatedProducts[index].price * updatedProducts[index].qty) - (updatedProducts[index].discount || 0);
        }
      }
    });

    // Step 3: Recalculate ALL order totals
    const newSubtotal = updatedProducts.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalDiscount = updatedProducts.reduce((sum: number, p: any) => sum + (p.discount || 0), 0);
    
    // Calculate VAT based on the original VAT rate
    const vatRate = order.amounts.vatRate || 0;
    const newVat = Math.round(newSubtotal * (vatRate / 100));
    
    // Calculate new total
    const transportCost = order.amounts.transportCost || 0;
    const newTotal = newSubtotal + newVat + transportCost;
    
    // Calculate refund amount (difference from original)
    const originalTotal = order.amounts.total || 0;
    const actualRefund = originalTotal - newTotal;
    
    // Adjust payments - if customer paid more than new total, they get refund
    const totalPaid = order.payments.totalPaid || 0;
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

    // Step 4: Update order with new values
    orders[orderIndex] = {
      ...order,
      products: updatedProducts,
      subtotal: newSubtotal,
      amounts: {
        ...order.amounts,
        subtotal: newSubtotal,
        totalDiscount: totalDiscount,
        vat: newVat,
        transportCost: transportCost,
        total: newTotal
      },
      payments: {
        ...order.payments,
        due: newDue
      },
      returnHistory: [
        ...(order.returnHistory || []),
        {
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          time: new Date().toTimeString().split(' ')[0].slice(0, 5), // HH:MM
          timestamp: new Date().toISOString(),
          returnedProducts,
          originalTotal,
          newTotal,
          refundAmount: actualRefund,
          refundToCustomer: refundToCustomer,
          note: refundToCustomer > 0 ? `Refund ৳${refundToCustomer} to customer` : `Order total reduced by ৳${actualRefund}`
        }
      ],
      updatedAt: new Date().toISOString()
    };

    // Step 5: Write updates to both orders and inventory files
    writeOrdersToFile(orders);
    writeInventoryToFile(inventory);
      createOrderReturnTransaction(orderId, {
      returnedProducts,
      refundToCustomer: refundToCustomer,
      timestamp: new Date().toISOString()
    });
    triggerAccountingUpdate();

    return NextResponse.json({
      success: true,
      message: 'Return processed successfully!',
      order: orders[orderIndex],
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
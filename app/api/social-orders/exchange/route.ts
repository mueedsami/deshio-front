import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { triggerAccountingUpdate } from '@/lib/accounting-helper';
import { createOrderExchangeTransaction } from '@/lib/transaction-helper';

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
    const exchangeData = await request.json();
    const { orderId, removedProducts, replacementProducts } = exchangeData;

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

    // Step 1: Handle removed products and free up barcodes in inventory
    removedProducts.forEach((removed: any) => {
      const prodIndex = updatedProducts.findIndex((p: any) => p.id === removed.productId);
      if (prodIndex !== -1) {
        const prod = updatedProducts[prodIndex];
        const removedBarcodes = prod.barcodes.splice(0, removed.quantity); // Take first N barcodes

        prod.qty -= removed.quantity;
        prod.amount = prod.price * prod.qty - (prod.discount || 0);

        if (prod.qty <= 0) {
          updatedProducts.splice(prodIndex, 1);
        }

        // Update inventory for removed barcodes
        removedBarcodes.forEach((bc: string) => {
          const invItem = inventory.find((i: any) => i.barcode === bc);
          if (invItem) {
            invItem.status = 'available';
            delete invItem.orderId;
            delete invItem.soldAt;
            invItem.updatedAt = new Date().toISOString();
          }
        });
      }
    });

    // Step 2: Handle replacement products and assign barcodes from inventory
    for (const rep of replacementProducts) {
      let prod = updatedProducts.find((p: any) => p.productId === rep.id);

      if (!prod) {
        prod = {
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
        updatedProducts.push(prod);
      }

      // Find available inventory items
      const availableItems = inventory.filter((i: any) => i.productId === rep.id && i.status === 'available');
      if (availableItems.length < rep.quantity) {
        throw new Error(`Not enough stock for product ${rep.name} (ID: ${rep.id}). Available: ${availableItems.length}, Requested: ${rep.quantity}`);
      }

      const selectedItems = availableItems.slice(0, rep.quantity);
      const newBarcodes = selectedItems.map((i: any) => i.barcode);

      prod.barcodes.push(...newBarcodes);
      prod.qty += rep.quantity;
      prod.amount = prod.price * prod.qty - (prod.discount || 0);

      // Update inventory for new barcodes
      selectedItems.forEach((item: any) => {
        item.status = 'sold';
        item.orderId = order.id;
        item.soldAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
      });
    }

    // Step 3: Recalculate ALL order totals from scratch
    const newSubtotal = updatedProducts.reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalDiscount = updatedProducts.reduce((sum: number, p: any) => sum + (p.discount || 0), 0);
    
    // Calculate VAT based on the original VAT rate
    const vatRate = order.amounts.vatRate || 0;
    const newVat = Math.round(newSubtotal * (vatRate / 100));
    
    // Calculate new total
    const transportCost = order.amounts.transportCost || 0;
    const newTotal = newSubtotal + newVat + transportCost;
    
    // Calculate what's still due (total - what's already been paid)
    const totalPaid = order.payments.totalPaid || 0;
    const newDue = newTotal - totalPaid;

    // Calculate the difference from the original order total
    const originalTotal = order.amounts.total || 0;
    const difference = newTotal - originalTotal;

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
      exchangeHistory: [
        ...(order.exchangeHistory || []),
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
    writeOrdersToFile(orders);
    writeInventoryToFile(inventory);
      createOrderExchangeTransaction(orderId, {
      removedProducts,
      replacementProducts,
      difference: difference,
      date: new Date().toISOString()
    });
    triggerAccountingUpdate();
    return NextResponse.json({
      success: true,
      message: 'Exchange processed successfully!',
      order: orders[orderIndex],
      difference: difference,
      totalDue: newDue
    });
  } catch (error: any) {
    console.error('❌ Failed to process exchange:', error);
    return NextResponse.json({ error: error.message || 'Failed to process exchange' }, { status: 500 });
  }
}
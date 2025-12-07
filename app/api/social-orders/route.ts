// app/api/social-orders/route.ts - Updated with Store Support
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { triggerAccountingUpdate } from '@/lib/accounting-helper';
import { createOrderTransaction, removeTransaction } from '@/lib/transaction-helper';

const ordersFilePath = path.resolve('data', 'orders.json');
const inventoryFilePath = path.resolve('data', 'inventory.json');
const defectsFilePath = path.resolve('data', 'defects.json');

// Helper: Read all orders
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

// Helper: Read inventory
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

// Helper: Read defects
const readDefectsFromFile = () => {
  try {
    if (fs.existsSync(defectsFilePath)) {
      const fileData = fs.readFileSync(defectsFilePath, 'utf8');
      return JSON.parse(fileData);
    }
    return [];
  } catch (error) {
    console.error('❌ Error reading defects file:', error);
    return [];
  }
};

// Helper: Write updated orders list
const writeOrdersToFile = (orders: any[]) => {
  try {
    fs.mkdirSync(path.dirname(ordersFilePath), { recursive: true });
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Error writing orders file:', error);
    throw error;
  }
};

// Helper: Write updated inventory
const writeInventoryToFile = (inventory: any[]) => {
  try {
    fs.mkdirSync(path.dirname(inventoryFilePath), { recursive: true });
    fs.writeFileSync(inventoryFilePath, JSON.stringify(inventory, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Error writing inventory file:', error);
    throw error;
  }
};

// Helper: Write updated defects
const writeDefectsToFile = (defects: any[]) => {
  try {
    fs.mkdirSync(path.dirname(defectsFilePath), { recursive: true });
    fs.writeFileSync(defectsFilePath, JSON.stringify(defects, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Error writing defects file:', error);
    throw error;
  }
};

// Helper: Update defect status
const updateDefectStatus = (defectId: string, sellingPrice: number) => {
  try {
    const defects = readDefectsFromFile();
    const defectIndex = defects.findIndex((d: any) => d.id === defectId);
    
    if (defectIndex !== -1) {
      defects[defectIndex] = {
        ...defects[defectIndex],
        status: 'sold',
        sellingPrice: sellingPrice,
        soldAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      writeDefectsToFile(defects);
      console.log(`✅ Updated defect ${defectId} to sold with price ${sellingPrice}`);
    }
  } catch (error) {
    console.error('❌ Error updating defect status:', error);
  }
};

// Helper: Allocate inventory items and return barcodes
const allocateInventoryToOrder = (productId: string | number, quantity: number, orderId: number) => {
  const inventory = readInventoryFromFile();
  
  // Find available inventory items for this product
  const availableItems = inventory.filter((item: any) => {
    const itemProductId = String(item.productId);
    const searchProductId = String(productId);
    return itemProductId === searchProductId && item.status === 'available';
  });

  if (availableItems.length < quantity) {
    throw new Error(
      `Not enough inventory for product ${productId}. Required: ${quantity}, Available: ${availableItems.length}`
    );
  }

  // Take required quantity and update their status
  const allocatedItems = availableItems.slice(0, quantity);
  const barcodes: string[] = [];

  allocatedItems.forEach((item: any) => {
    const itemIndex = inventory.findIndex((i: any) => i.id === item.id);
    if (itemIndex !== -1) {
      inventory[itemIndex] = {
        ...inventory[itemIndex],
        status: 'sold',
        orderId: orderId,
        soldAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      barcodes.push(inventory[itemIndex].barcode);
    }
  });

  // Write updated inventory
  writeInventoryToFile(inventory);

  return barcodes;
};

// GET — Fetch all orders
export async function GET() {
  try {
    const orders = readOrdersFromFile();
    return NextResponse.json(orders);
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

// POST — Save a new order with barcode allocation, store info, and transaction entry
export async function POST(request: Request) {
  try {
    const newOrder = await request.json();
    const existingOrders = readOrdersFromFile();

    // Generate order ID
    const orderId = Date.now();

    console.log('📝 Creating order:', orderId);
    console.log('📊 Order data:', JSON.stringify(newOrder, null, 2));

    // Validate store information
    if (!newOrder.store || !newOrder.store.id) {
      console.error('❌ Store information is missing');
      return NextResponse.json({ 
        error: 'Store information is required' 
      }, { status: 400 });
    }

    console.log('🏪 Store info:', newOrder.store);

    // Process each product and allocate barcodes
    const productsWithBarcodes = [];
    
    for (const product of newOrder.products) {
      try {
        const productId = product.productId || product.id;
        
        // Skip inventory allocation for defective products
        if (product.isDefective) {
          console.log(`🟧 Processing defective product: ${product.defectId}`);
          
          // Update defect status with selling price
          if (product.defectId) {
            updateDefectStatus(product.defectId, product.price);
          }
          
          // Add to products list without barcode allocation
          productsWithBarcodes.push({
            ...product,
            productId: productId,
            barcodes: product.barcode ? [product.barcode] : []
          });
          
          console.log(`✅ Defective product ${product.defectId} processed`);
          continue;
        }
        
        // Allocate inventory and get barcodes for regular products
        const barcodes = allocateInventoryToOrder(productId, product.qty, orderId);
        
        productsWithBarcodes.push({
          ...product,
          productId: productId,
          barcodes: barcodes
        });
        
        console.log(`✅ Allocated ${barcodes.length} items for ${product.productName}`);
      } catch (error: any) {
        console.error(`❌ Error allocating products for ${product.productName}:`, error.message);
        return NextResponse.json({ 
          error: `Failed to allocate inventory: ${error.message}` 
        }, { status: 400 });
      }
    }

    // Create order with metadata, barcodes, and store information
    const orderWithMeta = {
      id: orderId,
      ...newOrder,
      products: productsWithBarcodes,
      store: {
        id: newOrder.store.id,
        name: newOrder.store.name,
        location: newOrder.store.location,
        type: newOrder.store.type
      },
      createdAt: new Date().toISOString(),
    };

    existingOrders.push(orderWithMeta);
    writeOrdersToFile(existingOrders);
    console.log(`✅ Order saved to file with store: ${newOrder.store.name}`);

    // ✅ CREATE ORDER TRANSACTION
    try {
      console.log('💰 Creating order transaction entry...');
      createOrderTransaction(orderWithMeta);
      console.log('✅ Order transaction entry created successfully');
    } catch (txError) {
      console.error('❌ Error creating order transaction entry:', txError);
    }

    // Trigger accounting update
    try {
      triggerAccountingUpdate();
    } catch (accError) {
      console.error('⚠️ Error triggering accounting update:', accError);
    }

    return NextResponse.json({
      success: true,
      message: 'Order saved successfully!',
      order: orderWithMeta,
    });
  } catch (error) {
    console.error('❌ Failed to save order:', error);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}

// DELETE — Remove an order by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('🗑️ Deleting order:', id);

    if (!id) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const orders = readOrdersFromFile();
    const orderToDelete = orders.find((order: any) => String(order.id) === String(id));
    
    if (!orderToDelete) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return inventory items to available status and revert defect status
    const inventory = readInventoryFromFile();
    const defects = readDefectsFromFile();
    let updatedInventory = false;
    let updatedDefects = false;

    if (orderToDelete.products) {
      orderToDelete.products.forEach((product: any) => {
        // Handle defective products
        if (product.isDefective && product.defectId) {
          const defectIndex = defects.findIndex((d: any) => d.id === product.defectId);
          if (defectIndex !== -1) {
            defects[defectIndex] = {
              ...defects[defectIndex],
              status: 'pending',
              sellingPrice: null,
              soldAt: null,
              updatedAt: new Date().toISOString()
            };
            updatedDefects = true;
            console.log(`✅ Reverted defect ${product.defectId} to pending`);
          }
        }
      });
    }

    // Handle regular inventory items
    inventory.forEach((item: any, index: number) => {
      if (item.orderId && String(item.orderId) === String(id)) {
        inventory[index] = {
          ...item,
          status: 'available',
          orderId: undefined,
          soldAt: undefined,
          updatedAt: new Date().toISOString()
        };
        updatedInventory = true;
      }
    });

    if (updatedInventory) {
      writeInventoryToFile(inventory);
    }

    if (updatedDefects) {
      writeDefectsToFile(defects);
    }

    // Remove order
    const updatedOrders = orders.filter((order: any) => String(order.id) !== String(id));
    writeOrdersToFile(updatedOrders);
    console.log(`✅ Order removed from file: ${id}`);

    // ✅ REMOVE ORDER TRANSACTION
    try {
      console.log('💰 Removing order transaction entry...');
      removeTransaction('order', id);
      console.log('✅ Order transaction entry removed successfully');
    } catch (txError) {
      console.error('❌ Error removing order transaction entry:', txError);
    }

    // Trigger accounting update
    try {
      triggerAccountingUpdate();
    } catch (accError) {
      console.error('⚠️ Error triggering accounting update:', accError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Order cancelled successfully and inventory restored!' 
    });
  } catch (error) {
    console.error('❌ Failed to delete order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}

// PUT — Update an existing order (preserving store info)
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('🔄 PUT request received for order ID:', id);

    if (!id) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const updatedOrderData = await request.json();
    console.log('📊 Updated order data:', updatedOrderData);
    
    const orders = readOrdersFromFile();
    console.log('📚 Current orders count:', orders.length);
    
    const orderIndex = orders.findIndex((order: any) => String(order.id) === String(id));
    
    if (orderIndex === -1) {
      console.log('❌ Order not found with ID:', id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const existingOrder = orders[orderIndex];

    // Merge products while preserving barcodes
    let mergedProducts = updatedOrderData.products;
    
    if (existingOrder.products && updatedOrderData.products) {
      mergedProducts = updatedOrderData.products.map((newProduct: any) => {
        // Find the corresponding existing product by id or productId
        const existingProduct = existingOrder.products.find(
          (p: any) => 
            String(p.id) === String(newProduct.id) || 
            String(p.productId) === String(newProduct.productId)
        );
        
        // If barcodes exist in the existing product but not in the new one, preserve them
        if (existingProduct?.barcodes && !newProduct.barcodes) {
          return {
            ...newProduct,
            barcodes: existingProduct.barcodes
          };
        }
        
        return newProduct;
      });
    }

    // Preserve store information if not provided in update
    const storeInfo = updatedOrderData.store || existingOrder.store;

    // Update the order with preserved barcodes and store info
    orders[orderIndex] = {
      ...existingOrder,
      ...updatedOrderData,
      products: mergedProducts,
      store: storeInfo, // Ensure store info is preserved
      id: existingOrder.id,
      createdAt: existingOrder.createdAt,
      updatedAt: new Date().toISOString(),
    };

    console.log('✅ Updated order with preserved barcodes and store info');
    if (storeInfo) {
      console.log('🏪 Store preserved:', storeInfo.name);
    }

    writeOrdersToFile(orders);
    console.log('✅ Order saved to file');

    // ✅ UPDATE ORDER TRANSACTION
    try {
      console.log('💰 Updating order transaction entry...');
      removeTransaction('order', id);
      createOrderTransaction(orders[orderIndex]);
      console.log('✅ Order transaction entry updated successfully');
    } catch (txError) {
      console.error('❌ Error updating order transaction entry:', txError);
    }

    // Trigger accounting update
    try {
      triggerAccountingUpdate();
    } catch (accError) {
      console.error('⚠️ Error triggering accounting update:', accError);
    }

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully!',
      order: orders[orderIndex],
    });
  } catch (error) {
    console.error('❌ Failed to update order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
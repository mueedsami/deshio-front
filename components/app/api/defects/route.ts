import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const defectsFilePath = path.join(process.cwd(), 'data', 'defects.json');
const inventoryFilePath = path.join(process.cwd(), 'data', 'inventory.json');
const productsFilePath = path.join(process.cwd(), 'data', 'product.json');
const ordersFilePath = path.join(process.cwd(), 'data', 'orders.json');
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure uploads directory exists
function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function ensureDataFile(filePath: string, defaultData: any = []) {
  const dataDir = path.dirname(filePath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
}

function readFromFile(filePath: string) {
  ensureDataFile(filePath);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeToFile(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Get product name from product.json by productId
function getProductName(productId: number): string {
  try {
    const products = readFromFile(productsFilePath);
    const product = products.find((p: any) => p.id === productId);
    
    if (product && product.name) {
      console.log('✅ Found product name:', product.name, 'for productId:', productId);
      return product.name;
    } else {
      console.log('❌ Product not found for ID:', productId);
      return `Product ${productId}`;
    }
  } catch (error) {
    console.error('Error reading product.json:', error);
    return `Product ${productId}`;
  }
}

// Save uploaded file and return the file path
async function saveUploadedFile(file: File): Promise<string> {
  ensureUploadsDir();
  
  const timestamp = Date.now();
  const originalName = file.name;
  const extension = path.extname(originalName);
  const fileName = `defect-${timestamp}${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  
  // Convert file to buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);
  
  return `/uploads/${fileName}`;
}

// GET - Fetch all defects or single defect by ID
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const store = searchParams.get('store');
    
    let defects = readFromFile(defectsFilePath);
    
    // ✅ FIX: Update product names for all defects from product.json
    defects = defects.map((defect: any) => {
      // If productName is the default fallback or missing, fetch from product.json
      if (!defect.productName || defect.productName.startsWith('Product ')) {
        const productName = getProductName(defect.productId);
        return {
          ...defect,
          productName: productName
        };
      }
      return defect;
    });
    
    // Write back the updated defects with proper product names
    writeToFile(defectsFilePath, defects);
    
    // Filter by single ID
    if (id) {
      const defect = defects.find((d: any) => d.id === id);
      if (!defect) {
        return NextResponse.json({ error: 'Defect not found' }, { status: 404 });
      }
      return NextResponse.json(defect);
    }
    
    // Filter by store
    if (store && store !== 'all') {
      const filteredDefects = defects.filter((d: any) => d.store === store);
      return NextResponse.json(filteredDefects);
    }
    
    return NextResponse.json(defects);
  } catch (error) {
    console.error('Error reading defects:', error);
    return NextResponse.json({ error: 'Failed to load defects' }, { status: 500 });
  }
}

// POST - Add new defect (from barcode scan or customer return)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const barcode = formData.get('barcode') as string;
    const returnReason = formData.get('returnReason') as string;
    const store = formData.get('store') as string;
    const orderId = formData.get('orderId') as string;
    const customerPhone = formData.get('customerPhone') as string;
    const image = formData.get('image') as File | null;
    const isDefectIdentification = formData.get('isDefectIdentification') === 'true';
    
    if (!barcode || !returnReason) {
      return NextResponse.json({ error: 'Barcode and return reason are required' }, { status: 400 });
    }
    
    if (!store) {
      return NextResponse.json({ error: 'Store location is required' }, { status: 400 });
    }
    
    // Find the inventory item by barcode
    const inventory = readFromFile(inventoryFilePath);
    const inventoryItem = inventory.find((item: any) => item.barcode === barcode);
    
    if (!inventoryItem) {
      return NextResponse.json({ error: 'Item not found in inventory' }, { status: 404 });
    }
    
    // For customer returns (not defect identification), we need order and customer info if the item was sold
    if (!isDefectIdentification && inventoryItem.status === 'sold') {
      if (!orderId || !customerPhone) {
        return NextResponse.json({ 
          error: 'Order ID and customer phone are required for customer returns' 
        }, { status: 400 });
      }
    }
    
    // ✅ FIX: Get product name from product.json using productId
    const productName = getProductName(inventoryItem.productId);
    console.log('🎯 Using product name:', productName, 'for defect creation');
    
    // Handle image upload
    let imagePath = null;
    if (image && image.size > 0) {
      try {
        imagePath = await saveUploadedFile(image);
      } catch (error) {
        console.error('Error saving image:', error);
        // Don't fail the entire request if image upload fails
      }
    }
    
    // Update inventory status to defective
    const invIndex = inventory.findIndex((item: any) => item.barcode === barcode);
    inventory[invIndex] = {
      ...inventory[invIndex],
      status: 'defective',
      updatedAt: new Date().toISOString()
    };
    writeToFile(inventoryFilePath, inventory);
    
    // Create defect entry with proper product name
    const defects = readFromFile(defectsFilePath);
    const newDefect = {
      id: `defect-${Date.now()}`,
      barcode: inventoryItem.barcode,
      productId: inventoryItem.productId,
      productName: productName, // ✅ Now using the actual product name from product.json
      status: 'pending',
      store: store,
      addedBy: 'Admin',
      addedAt: new Date().toISOString(),
      originalOrderId: orderId || inventoryItem.orderId || null,
      customerPhone: customerPhone || null,
      costPrice: inventoryItem.costPrice,
      originalSellingPrice: inventoryItem.sellingPrice,
      sellingPrice: null,
      returnReason: returnReason,
      image: imagePath
    };
    
    defects.push(newDefect);
    writeToFile(defectsFilePath, defects);
    
    console.log('✅ Defect created successfully with product name:', productName);
    
    return NextResponse.json({
      success: true,
      message: 'Item marked as defective successfully',
      defect: newDefect
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding defect:', error);
    return NextResponse.json({ error: 'Failed to add defect' }, { status: 500 });
  }
}

// PATCH - Update defect (approve, sell, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Defect ID is required' }, { status: 400 });
    }
    
    const defects = readFromFile(defectsFilePath);
    const defectIndex = defects.findIndex((d: any) => d.id === id);
    
    if (defectIndex === -1) {
      return NextResponse.json({ error: 'Defect not found' }, { status: 404 });
    }
    
    // ✅ FIX: Ensure product name is updated if productId changes
    let updatedDefect = { ...defects[defectIndex], ...body };
    
    // If productId is being updated, also update productName
    if (body.productId && body.productId !== defects[defectIndex].productId) {
      updatedDefect.productName = getProductName(body.productId);
    }
    
    defects[defectIndex] = {
      ...updatedDefect,
      updatedAt: new Date().toISOString()
    };
    
    writeToFile(defectsFilePath, defects);
    
    return NextResponse.json({
      success: true,
      message: 'Defect updated successfully',
      defect: defects[defectIndex]
    });
    
  } catch (error) {
    console.error('Error updating defect:', error);
    return NextResponse.json({ error: 'Failed to update defect' }, { status: 500 });
  }
}

// DELETE - Remove defect
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Defect ID is required' }, { status: 400 });
    }
    
    const defects = readFromFile(defectsFilePath);
    const defect = defects.find((d: any) => d.id === id);
    
    if (!defect) {
      return NextResponse.json({ error: 'Defect not found' }, { status: 404 });
    }
    
    // Delete associated image file if exists
    if (defect.image) {
      try {
        const imagePath = path.join(process.cwd(), 'public', defect.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Error deleting image file:', error);
      }
    }
    
    // Return inventory status to available
    const inventory = readFromFile(inventoryFilePath);
    const invIndex = inventory.findIndex((item: any) => item.barcode === defect.barcode);
    
    if (invIndex !== -1) {
      inventory[invIndex] = {
        ...inventory[invIndex],
        status: 'available',
        updatedAt: new Date().toISOString()
      };
      writeToFile(inventoryFilePath, inventory);
    }
    
    // Remove defect
    const updatedDefects = defects.filter((d: any) => d.id !== id);
    writeToFile(defectsFilePath, updatedDefects);
    
    return NextResponse.json({
      success: true,
      message: 'Defect removed and inventory restored'
    });
    
  } catch (error) {
    console.error('Error deleting defect:', error);
    return NextResponse.json({ error: 'Failed to delete defect' }, { status: 500 });
  }
}
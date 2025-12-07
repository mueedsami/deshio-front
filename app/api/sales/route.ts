// app/api/sales/route.ts - FIXED VERSION
// This version properly creates transaction entries
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { triggerAccountingUpdate } from '@/lib/accounting-helper';
import { createSaleTransaction, removeTransaction } from '@/lib/transaction-helper';

const salesFilePath = path.resolve('data', 'sales.json');
const defectsFilePath = path.resolve('data', 'defects.json');

// Helper: Read sales
const readSalesFromFile = () => {
  if (fs.existsSync(salesFilePath)) {
    const fileData = fs.readFileSync(salesFilePath, 'utf8');
    return JSON.parse(fileData);
  }
  return [];
};

// Helper: Write sales
const writeSalesToFile = (sales: any[]) => {
  const dataDir = path.resolve('data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(salesFilePath, JSON.stringify(sales, null, 2), 'utf8');
};

// Helper: Read defects
const readDefectsFromFile = () => {
  if (fs.existsSync(defectsFilePath)) {
    const fileData = fs.readFileSync(defectsFilePath, 'utf8');
    return JSON.parse(fileData);
  }
  return [];
};

// Helper: Write defects
const writeDefectsToFile = (defects: any[]) => {
  const dataDir = path.resolve('data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(defectsFilePath, JSON.stringify(defects, null, 2), 'utf8');
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
      console.log(` Updated defect ${defectId} to sold with price ${sellingPrice}`);
    }
  } catch (error) {
    console.error('Error updating defect status:', error);
  }
};

// GET - Retrieve all sales
export async function GET() {
  try {
    const sales = readSalesFromFile();
    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error reading sales from file:', error);
    return NextResponse.json({ error: 'Failed to load sales' }, { status: 500 });
  }
}

// POST - Add new sale
export async function POST(request: Request) {
  try {
    const newSale = await request.json();
    const sales = readSalesFromFile();
    
    // Add timestamp and ID
    const saleWithMetadata = {
      id: `sale-${Date.now()}`,
      ...newSale,
      createdAt: new Date().toISOString(),
    };
    
    console.log(' Creating sale:', saleWithMetadata.id);
    console.log(' Sale data:', JSON.stringify(saleWithMetadata, null, 2));
    
    // Update defect status for any defective items
    if (newSale.items && Array.isArray(newSale.items)) {
      newSale.items.forEach((item: any) => {
        if (item.isDefective && item.defectId) {
          console.log(`Processing defective item: ${item.defectId} with price ${item.price}`);
          updateDefectStatus(item.defectId, item.price);
        }
      });
    }
    
    // Save sale
    sales.push(saleWithMetadata);
    writeSalesToFile(sales);
    console.log(` Sale saved to file: ${saleWithMetadata.id}`);
    
    // Create transaction entry
    try {
      console.log('Creating transaction entry...');
      createSaleTransaction(saleWithMetadata);
      console.log('Transaction entry created successfully');
    } catch (txError) {
      console.error(' Error creating transaction entry:', txError);
    }
    
    // Trigger accounting update
    try {
      triggerAccountingUpdate();
    } catch (accError) {
      console.error(' Error triggering accounting update:', accError);
    }
    
    return NextResponse.json(saleWithMetadata, { status: 201 });
  } catch (error) {
    console.error(' Error adding sale:', error);
    return NextResponse.json({ error: 'Failed to add sale' }, { status: 500 });
  }
}

// DELETE - Remove a sale
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    let sales = readSalesFromFile();
    
    console.log('Deleting sale:', id);
    
    // Find the sale to check for defective items
    const saleToDelete = sales.find((s: any) => s.id === id);
    
    if (saleToDelete && saleToDelete.items) {
      // Revert defect status back to pending for any defective items
      saleToDelete.items.forEach((item: any) => {
        if (item.isDefective && item.defectId) {
          const defects = readDefectsFromFile();
          const defectIndex = defects.findIndex((d: any) => d.id === item.defectId);
          
          if (defectIndex !== -1) {
            defects[defectIndex] = {
              ...defects[defectIndex],
              status: 'pending',
              sellingPrice: null,
              soldAt: null,
              updatedAt: new Date().toISOString()
            };
            writeDefectsToFile(defects);
            console.log(`✅ Reverted defect ${item.defectId} to pending`);
          }
        }
      });
    }
    
    sales = sales.filter((s: any) => s.id !== id);
    writeSalesToFile(sales);
    console.log(` Sale removed from file: ${id}`);
    
    // Remove transaction entry
    try {
      console.log(' Removing transaction entry...');
      removeTransaction('sale', id);
      console.log('Transaction entry removed successfully');
    } catch (txError) {
      console.error(' Error removing transaction entry:', txError);
    }
    
    // Trigger accounting update
    try {
      triggerAccountingUpdate();
    } catch (accError) {
      console.error('⚠️ Error triggering accounting update:', accError);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(' Error deleting sale:', error);
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
  }
}
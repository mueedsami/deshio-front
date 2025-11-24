// app/api/transactions/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const transactionsFilePath = path.join(process.cwd(), 'data', 'transactions.json');

interface TransactionData {
  categories: Array<{ id: string; name: string; type: 'income' | 'expense'; createdAt: string }>;
  transactions: any[];
}

function ensureDirectories() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readTransactions(): TransactionData {
  ensureDirectories();
  
  if (!fs.existsSync(transactionsFilePath)) {
    const initialData: TransactionData = {
      categories: [
        { id: 'cat-1', name: 'POS Sales', type: 'income', createdAt: new Date().toISOString() },
        { id: 'cat-2', name: 'Online Orders', type: 'income', createdAt: new Date().toISOString() },
        { id: 'cat-3', name: 'Other Income', type: 'income', createdAt: new Date().toISOString() },
        { id: 'cat-4', name: 'Inventory Purchase', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-5', name: 'Sales Return', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-6', name: 'Salary & Wages', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-7', name: 'Rent', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-8', name: 'Utilities', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-9', name: 'Marketing', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-10', name: 'Office Supplies', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-11', name: 'Transportation', type: 'expense', createdAt: new Date().toISOString() },
      ],
      transactions: []
    };
    fs.writeFileSync(transactionsFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log('✅ Initialized transactions.json with default categories');
    return initialData;
  }
  
  const data = fs.readFileSync(transactionsFilePath, 'utf-8');
  return JSON.parse(data);
}

function writeTransactions(data: TransactionData) {
  fs.writeFileSync(transactionsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET - Fetch all categories
export async function GET(req: NextRequest) {
  try {
    const data = readTransactions();
    return NextResponse.json({ categories: data.categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

// POST - Create new category
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.name || !body.type) {
      return NextResponse.json({ error: 'Category name and type are required' }, { status: 400 });
    }
    
    const data = readTransactions();
    
    // Check if category already exists
    const exists = data.categories.some(cat => 
      cat.name.toLowerCase() === body.name.toLowerCase() && cat.type === body.type
    );
    
    if (exists) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }
    
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: body.name,
      type: body.type,
      createdAt: new Date().toISOString()
    };
    
    data.categories.push(newCategory);
    writeTransactions(data);
    
    console.log('✅ Category created:', newCategory.name);
    
    return NextResponse.json({ success: true, category: newCategory }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
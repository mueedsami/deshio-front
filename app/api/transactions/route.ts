// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
  source?: 'manual' | 'sale' | 'order' | 'batch'; // Track source
  referenceId?: string; // Link to sale/order/batch ID
}

interface TransactionData {
  categories: Array<{ id: string; name: string; type: 'income' | 'expense'; createdAt: string }>;
  transactions: Transaction[];
}

const transactionsFilePath = path.join(process.cwd(), 'data', 'transactions.json');
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts');

// Ensure directories exist
function ensureDirectories() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}

// Read transactions file
function readTransactions(): TransactionData {
  ensureDirectories();
  
  if (!fs.existsSync(transactionsFilePath)) {
    const initialData: TransactionData = {
      categories: [
        { id: 'cat-1', name: 'Salary & Wages', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-2', name: 'Rent', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-3', name: 'Utilities', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-4', name: 'Marketing', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-5', name: 'Office Supplies', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-6', name: 'Transportation', type: 'expense', createdAt: new Date().toISOString() },
        { id: 'cat-7', name: 'POS Sales', type: 'income', createdAt: new Date().toISOString() },
        { id: 'cat-8', name: 'Online Orders', type: 'income', createdAt: new Date().toISOString() },
        { id: 'cat-9', name: 'Other Income', type: 'income', createdAt: new Date().toISOString() },
      ],
      transactions: []
    };
    fs.writeFileSync(transactionsFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  
  const data = fs.readFileSync(transactionsFilePath, 'utf-8');
  return JSON.parse(data);
}

// Write transactions file
function writeTransactions(data: TransactionData) {
  fs.writeFileSync(transactionsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Save uploaded image
function saveImage(base64Data: string): string {
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid image data');
  
  const ext = matches[1];
  const imageData = matches[2];
  const fileName = `receipt-${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  
  fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));
  return `/uploads/receipts/${fileName}`;
}

// GET - Fetch all transactions
export async function GET(req: NextRequest) {
  try {
    const data = readTransactions();
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...data.transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json({
      transactions: sortedTransactions,
      categories: data.categories
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
  }
}

// POST - Create new transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = readTransactions();
    
    // Handle receipt image if provided
    let receiptPath = '';
    if (body.receiptImage) {
      try {
        receiptPath = saveImage(body.receiptImage);
      } catch (error) {
        console.error('Error saving receipt image:', error);
      }
    }
    
    const newTransaction: Transaction = {
      id: `txn-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      type: body.type || 'expense',
      amount: parseFloat(body.amount),
      category: body.category,
      date: body.date || new Date().toISOString(),
      comment: body.comment || '',
      receiptImage: receiptPath,
      createdAt: new Date().toISOString(),
      source: body.source || 'manual',
      referenceId: body.referenceId || ''
    };
    
    data.transactions.push(newTransaction);
    writeTransactions(data);
    
    console.log('✅ Transaction created:', newTransaction.id);
    
    return NextResponse.json({ success: true, transaction: newTransaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

// DELETE - Remove transaction
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }
    
    const data = readTransactions();
    const transaction = data.transactions.find(t => t.id === id);
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Delete receipt image if exists
    if (transaction.receiptImage) {
      try {
        const imagePath = path.join(process.cwd(), 'public', transaction.receiptImage);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Error deleting receipt image:', error);
      }
    }
    
    data.transactions = data.transactions.filter(t => t.id !== id);
    writeTransactions(data);
    
    console.log('✅ Transaction deleted:', id);
    
    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}




// GET - Fetch all categories
export async function GET_CATEGORIES(req: NextRequest) {
  try {
    const data = readTransactions();
    return NextResponse.json({ categories: data.categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

// POST - Create new category
export async function POST_CATEGORY(req: NextRequest) {
  try {
    const body = await req.json();
    const data = readTransactions();
    
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: body.name,
      type: body.type || 'expense',
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


// ============================================
// app/api/transactions/summary/route.ts
// ============================================

export async function GET_SUMMARY(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'all'; // all, today, week, month, year
    
    const data = readTransactions();
    let filteredTransactions = data.transactions;
    
    // Filter by period
    if (period !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filteredTransactions = data.transactions.filter(
        t => new Date(t.createdAt) >= startDate
      );
    }
    
    // Calculate totals
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netIncome = income - expenses;
    
    // Category breakdown
    const categoryBreakdown: Record<string, { income: number; expense: number }> = {};
    
    filteredTransactions.forEach(t => {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        categoryBreakdown[t.category].income += t.amount;
      } else {
        categoryBreakdown[t.category].expense += t.amount;
      }
    });
    
    return NextResponse.json({
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        netIncome: netIncome,
        transactionCount: filteredTransactions.length
      },
      categoryBreakdown,
      period
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
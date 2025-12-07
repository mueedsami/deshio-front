import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Expense, TransactionData } from '@/types/expense';

const dataDir = path.join(process.cwd(), 'data');
const dataFilePath = path.join(dataDir, 'transactions.json');
const uploadDir = path.join(process.cwd(), 'public/uploads');

// Ensure folders exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

async function readData(): Promise<TransactionData> {
  if (!fs.existsSync(dataFilePath)) {
    const initialData: TransactionData = { categories: [], expenses: [] };
    fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const raw = fs.readFileSync(dataFilePath, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(data: TransactionData) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await readData();

    // Handle receipt image
    let receiptPath = '';
    if (body.receipt) {
      const base64Data = body.receipt.replace(/^data:image\/\w+;base64,/, '');
      const ext = body.receipt.match(/data:image\/(\w+);base64/)?.[1] || 'png';
      const fileName = `receipt-${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      receiptPath = `/uploads/${fileName}`;
    }

    const newExpense: Expense = {
      id: Date.now().toString(), // Simple ID
      name: body.name,
      description: body.description,
      type: body.type,
      amount: parseFloat(body.amount),
      category: body.category,
      date: body.date,
      comment: body.comment,
      receiptImage: receiptPath,
      createdAt: new Date().toISOString(),
    };

    data.expenses.push(newExpense);
    await writeData(data);

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (error) {
    console.error('Error saving expense:', error);
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 });
  }
}

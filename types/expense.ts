export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  name: string;
  description: string;
  type: 'fixed' | 'variable';
  amount: number;
  category: string;
  date: string;
  comment: string;
  receiptImage?: string;
  createdAt: string;
}

export interface TransactionData {
  expenses: Expense[];
  categories: Category[];
}
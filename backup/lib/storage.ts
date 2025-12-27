'use client';

import { Expense, Category } from '@/types/expense';

export const storageService = {
  // Expenses
  async getExpenses(): Promise<Expense[]> {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      return data.expenses || [];
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      return [];
    }
  },

async saveExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const response = await fetch('/api/transactions/expenses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expense),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save expense');
  }
  
  return response.json();
},
async getTransactions(): Promise<{ expenses: Expense[], income: Expense[], categories: Category[] }> {
  try {
    const response = await fetch('/api/transactions');
    const data = await response.json();
    return {
      expenses: data.expenses || [],
      income: data.income || [],
      categories: data.categories || []
    };
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return { expenses: [], income: [], categories: [] };
  }
}
,
  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  },

  async saveCategory(name: string): Promise<Category> {
    const response = await fetch('/api/transactions/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save category');
    }
    
    return response.json();
  }
};
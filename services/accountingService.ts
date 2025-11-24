import axiosInstance from '@/lib/axios';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Account {
  id: number;
  account_code: string;
  name: string;
  description?: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  sub_type: string;
  parent_id?: number;
  is_active: boolean;
  level: number;
  path: string;
  current_balance?: number;
  parent?: Account;
  children?: Account[];
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  transaction_number: string;
  transaction_date: string;
  amount: number;
  type: 'debit' | 'credit';
  account_id: number;
  reference_type?: string;
  reference_id?: number;
  description?: string;
  store_id?: number;
  created_by?: number;
  metadata?: any;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  account?: Account;
  store?: any;
  created_at: string;
  updated_at: string;
}

export interface TrialBalanceSummary {
  total_debits: number;
  total_credits: number;
  difference: number;
  balanced: boolean;
}

export interface TrialBalanceAccount {
  id?: number;
  account_code: string;
  account_name: string;
  name?: string;
  type: string;
  debit: number;      // Total debits for this account
  credit: number;     // Total credits for this account
  balance?: number;   // Optional: Debit - Credit (for reference, not shown in trial balance)
}

export interface TrialBalanceData {
  summary: TrialBalanceSummary;
  accounts: TrialBalanceAccount[];
  date_range: {
    start_date: string;
    end_date: string;
  };
  store_id?: number;
}

export interface LedgerEntry {
  id: number;
  transaction_number: string;
  transaction_date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
}

export interface LedgerData {
  account: Account;
  opening_balance: number;
  closing_balance: number;
  transactions: LedgerEntry[];
  date_range: {
    date_from: string;
    date_to: string;
  };
}

export interface AccountBalance {
  account_id: number;
  account_name: string;
  account_code: string;
  balance: number;
  children_balance: number;
  total_balance: number;
  store_id?: number;
  end_date?: string;
}

export interface AccountStatistics {
  total: number;
  active: number;
  inactive: number;
  by_type: {
    assets: number;
    liabilities: number;
    equity: number;
    income: number;
    expenses: number;
  };
  by_sub_type: Record<string, number>;
  by_level: Record<string, number>;
}

export interface TransactionStatistics {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  total_debits: number;
  total_credits: number;
  completed_debits: number;
  completed_credits: number;
  net_balance: number;
  by_type: {
    debit: number;
    credit: number;
  };
  by_status: Record<string, number>;
}

export interface JournalEntryLine {
  account: Account;
  debit: number;
  credit: number;
  transaction: Transaction;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference_type: string;
  reference_id: number;
  description: string;
  lines: JournalEntryLine[];
  total_debit: number;
  total_credit: number;
  balanced: boolean;
  created_at: string;
}

export interface CreateAccountData {
  account_code: string;
  name: string;
  description?: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  sub_type: string;
  parent_id?: number;
  is_active?: boolean;
}

export interface UpdateAccountData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateTransactionData {
  transaction_date: string;
  amount: number;
  type: 'debit' | 'credit';
  account_id: number;
  description?: string;
  store_id?: number;
  reference_type?: string;
  reference_id?: number;
  metadata?: any;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface UpdateTransactionData {
  amount?: number;
  description?: string;
  metadata?: any;
}

// ============================================
// CHART OF ACCOUNTS SERVICES
// ============================================

class ChartOfAccountsService {
  /**
   * Get all accounts with optional filtering
   */
  async getAccounts(params?: {
    type?: string;
    sub_type?: string;
    active?: boolean;
    level?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
  }) {
    const response = await axiosInstance.get('/accounts', { params });
    return response.data;
  }

  /**
   * Get account tree structure
   */
  async getAccountTree(type?: string) {
    const params = type ? { type } : {};
    const response = await axiosInstance.get('/accounts/tree', { params });
    return response.data;
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: number) {
    const response = await axiosInstance.get(`/accounts/${id}`);
    return response.data;
  }

  /**
   * Create new account
   */
  async createAccount(data: CreateAccountData) {
    const response = await axiosInstance.post('/accounts', data);
    return response.data;
  }

  /**
   * Update account
   */
  async updateAccount(id: number, data: UpdateAccountData) {
    const response = await axiosInstance.put(`/accounts/${id}`, data);
    return response.data;
  }

  /**
   * Delete account
   */
  async deleteAccount(id: number) {
    const response = await axiosInstance.delete(`/accounts/${id}`);
    return response.data;
  }

  /**
   * Get account balance
   */
  async getAccountBalance(id: number, params?: {
    store_id?: number;
    end_date?: string;
  }): Promise<{ success: boolean; data: AccountBalance }> {
    const response = await axiosInstance.get(`/accounts/${id}/balance`, { params });
    return response.data;
  }

  /**
   * Activate account
   */
  async activateAccount(id: number) {
    const response = await axiosInstance.post(`/accounts/${id}/activate`);
    return response.data;
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(id: number) {
    const response = await axiosInstance.post(`/accounts/${id}/deactivate`);
    return response.data;
  }

  /**
   * Get account statistics
   */
  async getStatistics(type?: string): Promise<{ success: boolean; data: AccountStatistics }> {
    const params = type ? { type } : {};
    const response = await axiosInstance.get('/accounts/statistics', { params });
    return response.data;
  }

  /**
   * Get chart of accounts with balances
   */
  async getChartOfAccounts(params?: {
    store_id?: number;
    end_date?: string;
  }) {
    const response = await axiosInstance.get('/accounts/chart-of-accounts', { params });
    return response.data;
  }

  /**
   * Initialize default chart of accounts
   */
  async initializeDefaults() {
    const response = await axiosInstance.post('/accounts/initialize-defaults');
    return response.data;
  }
}

// ============================================
// TRANSACTION SERVICES
// ============================================

class TransactionService {
  /**
   * Get all transactions with filtering
   */
  async getTransactions(params?: {
    account_id?: number;
    type?: 'debit' | 'credit';
    status?: 'pending' | 'completed' | 'failed' | 'cancelled';
    store_id?: number;
    date_from?: string;
    date_to?: string;
    reference_type?: string;
    reference_id?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }) {
    const response = await axiosInstance.get('/transactions', { params });
    return response.data;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number) {
    const response = await axiosInstance.get(`/transactions/${id}`);
    return response.data;
  }

  /**
   * Create manual transaction
   */
  async createTransaction(data: CreateTransactionData) {
    const response = await axiosInstance.post('/transactions', data);
    return response.data;
  }

  /**
   * Update transaction (only pending)
   */
  async updateTransaction(id: number, data: UpdateTransactionData) {
    const response = await axiosInstance.put(`/transactions/${id}`, data);
    return response.data;
  }

  /**
   * Delete transaction (only pending/failed)
   */
  async deleteTransaction(id: number) {
    const response = await axiosInstance.delete(`/transactions/${id}`);
    return response.data;
  }

  /**
   * Complete transaction
   */
  async completeTransaction(id: number) {
    const response = await axiosInstance.post(`/transactions/${id}/complete`);
    return response.data;
  }

  /**
   * Mark transaction as failed
   */
  async failTransaction(id: number, reason?: string) {
    const response = await axiosInstance.post(`/transactions/${id}/fail`, { reason });
    return response.data;
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(id: number, reason?: string) {
    const response = await axiosInstance.post(`/transactions/${id}/cancel`, { reason });
    return response.data;
  }

  /**
   * Bulk complete transactions
   */
  async bulkComplete(transaction_ids: number[]) {
    const response = await axiosInstance.post('/transactions/bulk-complete', { transaction_ids });
    return response.data;
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(params?: {
    date_from?: string;
    date_to?: string;
    store_id?: number;
  }): Promise<{ success: boolean; data: TransactionStatistics }> {
    const response = await axiosInstance.get('/transactions/statistics', { params });
    return response.data;
  }

  /**
   * Get transactions for specific account
   */
  async getAccountTransactions(accountId: number, params?: {
    date_from?: string;
    date_to?: string;
    store_id?: number;
    per_page?: number;
    page?: number;
  }) {
    const response = await axiosInstance.get(`/accounts/${accountId}/transactions`, { params });
    return response.data;
  }
}

// ============================================
// FINANCIAL REPORTS SERVICES
// ============================================

class FinancialReportsService {
  /**
   * Get trial balance
   */
  async getTrialBalance(params?: {
    store_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; data: TrialBalanceData }> {
    const response = await axiosInstance.get('/transactions/trial-balance', { params });
    return response.data;
  }

  /**
   * Get account ledger
   */
  async getAccountLedger(accountId: number, params?: {
    date_from?: string;
    date_to?: string;
    store_id?: number;
  }): Promise<{ success: boolean; data: LedgerData }> {
    const response = await axiosInstance.get(`/transactions/ledger/${accountId}`, { params });
    return response.data;
  }

  /**
   * Get journal entries (grouped transactions showing double-entry format)
   */
  async getJournalEntries(params?: {
    date_from?: string;
    date_to?: string;
    store_id?: number;
    reference_type?: string;
    per_page?: number;
    page?: number;
  }) {
    // Fetch all transactions
    const response = await axiosInstance.get('/transactions', { params });
    
    if (!response.data.success) {
      return response.data;
    }

    const transactions = response.data.data.data || response.data.data;
    
    // Group transactions by reference (same reference = one journal entry)
    const entriesMap = new Map<string, JournalEntry>();
    
    transactions.forEach((txn: Transaction) => {
      const key = `${txn.reference_type || 'Manual'}-${txn.reference_id || txn.id}-${txn.transaction_date}`;
      
      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          id: key,
          date: txn.transaction_date,
          reference_type: txn.reference_type || 'Manual',
          reference_id: txn.reference_id || 0,
          description: txn.description || '',
          lines: [],
          total_debit: 0,
          total_credit: 0,
          balanced: true,
          created_at: txn.created_at
        });
      }
      
      const entry = entriesMap.get(key)!;
      
      entry.lines.push({
        account: txn.account!,
        debit: txn.type === 'debit' ? txn.amount : 0,
        credit: txn.type === 'credit' ? txn.amount : 0,
        transaction: txn
      });
      
      if (txn.type === 'debit') {
        entry.total_debit += txn.amount;
      } else {
        entry.total_credit += txn.amount;
      }
    });
    
    // Check if each entry is balanced
    entriesMap.forEach(entry => {
      entry.balanced = Math.abs(entry.total_debit - entry.total_credit) < 0.01;
    });
    
    // Convert to array and sort by date descending
    const journalEntries = Array.from(entriesMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return {
      success: true,
      data: journalEntries
    };
  }

  /**
   * Export trial balance to CSV
   */
  exportTrialBalanceCSV(data: TrialBalanceAccount[], filename: string = 'trial-balance') {
    const headers = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance'];
    const rows = data.map(account => [
      account.account_code,
      account.account_name,
      account.type,
      account.debit.toFixed(2),
      account.credit.toFixed(2),
      (account.balance ?? 0).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this.downloadCSV(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Export ledger to CSV
   */
  exportLedgerCSV(data: LedgerEntry[], accountName: string, filename: string = 'ledger') {
    const headers = ['Date', 'Transaction Number', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const rows = data.map(entry => [
      entry.transaction_date,
      entry.transaction_number,
      `"${entry.description}"`,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2),
      entry.status
    ]);

    const csvContent = [
      `Account: ${accountName}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this.downloadCSV(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Export transactions to CSV
   */
  exportTransactionsCSV(data: Transaction[], filename: string = 'transactions') {
    const headers = [
      'Transaction Number',
      'Date',
      'Account Code',
      'Account Name',
      'Type',
      'Amount',
      'Description',
      'Status'
    ];

    const rows = data.map(txn => [
      txn.transaction_number,
      txn.transaction_date,
      txn.account?.account_code || '',
      txn.account?.name || '',
      txn.type,
      txn.amount.toFixed(2),
      `"${txn.description || ''}"`,
      txn.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    this.downloadCSV(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Helper method to download CSV
   */
  private downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

// ============================================
// EXPORT SERVICE INSTANCES
// ============================================

export const chartOfAccountsService = new ChartOfAccountsService();
export const transactionService = new TransactionService();
export const financialReportsService = new FinancialReportsService();

// Default export for convenience
const accountingService = {
  accounts: chartOfAccountsService,
  transactions: transactionService,
  reports: financialReportsService,
};

export default accountingService;
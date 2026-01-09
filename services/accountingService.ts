import axiosInstance from '@/lib/axios';

// ============================================
// NORMALIZERS (Make frontend resilient to backend shape/type variations)
// ============================================

const toNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') return fallback;
    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toLower = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
};

const normalizeTransaction = (txn: any): Transaction => {
  // Backend examples vary: type can be "debit"/"credit" or "Debit"/"Credit".
  const type = (toLower(txn?.type) === 'debit' ? 'debit' : 'credit') as 'debit' | 'credit';
  return {
    ...txn,
    amount: toNumber(txn?.amount, 0),
    type,
  };
};

const normalizeAccountType = (type: any): Account['type'] => {
  const t = toLower(type);
  // Some docs/examples use "revenue" or plural forms
  if (t === 'revenue') return 'income';
  if (t === 'assets') return 'asset';
  if (t === 'liabilities') return 'liability';
  if (t === 'expenses') return 'expense';
  if (t === 'equities') return 'equity';
  if (t === 'income') return 'income';
  if (t === 'asset') return 'asset';
  if (t === 'liability') return 'liability';
  if (t === 'equity') return 'equity';
  if (t === 'expense') return 'expense';
  // Default to expense to avoid TS issues; UI mainly uses label strings.
  return 'expense';
};

const normalizeAccount = (acc: any): Account => {
  return {
    ...acc,
    type: normalizeAccountType(acc?.type),
    current_balance: acc?.current_balance !== undefined ? toNumber(acc.current_balance, 0) : acc?.current_balance,
  } as Account;
};

const normalizeTrialBalance = (payload: any, params?: { start_date?: string; end_date?: string; store_id?: number }) => {
  // Shape A (transactions/trial-balance): { success, data: { summary, accounts, date_range } }
  // Shape B (accounting/trial-balance): { success, data: { accounts: [...], totals: {...}, as_of_date } }
  const data = payload?.data ?? payload;
  if (data?.summary && Array.isArray(data?.accounts)) {
    return {
      ...data,
      summary: {
        total_debits: toNumber(data.summary.total_debits, 0),
        total_credits: toNumber(data.summary.total_credits, 0),
        difference: toNumber(data.summary.difference, 0),
        balanced: !!(data.summary.balanced ?? data.summary.is_balanced),
      },
      accounts: data.accounts.map((a: any) => ({
        ...a,
        debit: toNumber(a.debit ?? a.debit_balance, 0),
        credit: toNumber(a.credit ?? a.credit_balance, 0),
        type: a.type ?? a.account_type ?? a.accountType ?? '',
        account_code: a.account_code ?? a.code ?? '',
        account_name: a.account_name ?? a.name ?? a.account ?? '',
        balance: a.balance ?? a.raw_balance ?? undefined,
      })),
      date_range: data.date_range ?? {
        start_date: params?.start_date || '',
        end_date: params?.end_date || params?.start_date || '',
      },
    } as TrialBalanceData;
  }

  // Financial reports doc format
  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
  const totals = data?.totals ?? {};
  const end = params?.end_date || data?.as_of_date || params?.start_date || '';
  return {
    summary: {
      total_debits: toNumber(totals.total_debits, 0),
      total_credits: toNumber(totals.total_credits, 0),
      difference: toNumber(totals.difference, 0),
      balanced: !!(totals.is_balanced ?? totals.balanced),
    },
    accounts: accounts.map((a: any) => ({
      account_code: a.account_code ?? a.code ?? '',
      account_name: a.account_name ?? a.name ?? '',
      type: a.type ?? a.account_type ?? '',
      debit: toNumber(a.debit ?? a.debit_balance, 0),
      credit: toNumber(a.credit ?? a.credit_balance, 0),
      balance: a.balance ?? a.raw_balance ?? undefined,
    })),
    date_range: {
      start_date: params?.start_date || end,
      end_date: end,
    },
    store_id: params?.store_id,
  } as TrialBalanceData;
};

const normalizeLedger = (payload: any, accountId: number, params?: { date_from?: string; date_to?: string; store_id?: number }): LedgerData => {
  // Shape A (transactions/ledger/{id}): { success, data: { account, opening_balance, closing_balance, transactions, date_range } }
  // Shape B (accounting/t-account/{id}): { success, data: { account, opening_balance, debit_side, credit_side, totals, period } }
  const data = payload?.data ?? payload;
  if (data?.account && Array.isArray(data?.transactions)) {
    return {
      ...data,
      opening_balance: toNumber(data.opening_balance, 0),
      closing_balance: toNumber(data.closing_balance, 0),
      transactions: data.transactions.map((t: any) => ({
        ...t,
        debit: toNumber(t.debit, 0),
        credit: toNumber(t.credit, 0),
        balance: toNumber(t.balance, 0),
      })),
    } as LedgerData;
  }

  // Convert T-Account format into ledger entries list
  const account = data?.account || { id: accountId, name: `Account #${accountId}` };
  const opening = toNumber(data?.opening_balance, 0);
  const debitSide = Array.isArray(data?.debit_side) ? data.debit_side : [];
  const creditSide = Array.isArray(data?.credit_side) ? data.credit_side : [];
  const merged: LedgerEntry[] = [...debitSide.map((e: any) => ({
    id: 0,
    transaction_number: e.reference ?? '',
    transaction_date: e.date ?? '',
    description: e.description ?? '',
    debit: toNumber(e.amount, 0),
    credit: 0,
    balance: toNumber(e.balance, 0),
    status: 'completed',
  })), ...creditSide.map((e: any) => ({
    id: 0,
    transaction_number: e.reference ?? '',
    transaction_date: e.date ?? '',
    description: e.description ?? '',
    debit: 0,
    credit: toNumber(e.amount, 0),
    balance: toNumber(e.balance, 0),
    status: 'completed',
  }))].sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  const closing = toNumber(data?.totals?.closing_balance ?? data?.closing_balance, opening);
  const period = data?.period || {};

  return {
    account,
    opening_balance: opening,
    closing_balance: closing,
    transactions: merged,
    date_range: {
      date_from: period.from ?? params?.date_from ?? '',
      date_to: period.to ?? params?.date_to ?? '',
    },
  } as LedgerData;
};

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
    const result = response.data;
    if (result?.success) {
      const data = result.data;
      if (Array.isArray(data)) {
        result.data = data.map((a: any) => normalizeAccount(a));
      } else if (Array.isArray(data?.data)) {
        data.data = data.data.map((a: any) => normalizeAccount(a));
      }
    }
    return result;
  }

  /**
   * Get account tree structure
   */
  async getAccountTree(type?: string) {
    const params = type ? { type } : {};
    const response = await axiosInstance.get('/accounts/tree', { params });
    const result = response.data;
    if (result?.success && Array.isArray(result.data)) {
      const normalizeTree = (nodes: any[]): any[] => nodes.map(n => ({
        ...normalizeAccount(n),
        children: Array.isArray(n.children) ? normalizeTree(n.children) : n.children,
      }));
      result.data = normalizeTree(result.data);
    }
    return result;
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: number) {
    const response = await axiosInstance.get(`/accounts/${id}`);
    const result = response.data;
    if (result?.success && result?.data) {
      result.data = normalizeAccount(result.data);
    }
    return result;
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
    const result = response.data;

    // Normalize transaction amounts/types so UI math and grouping never breaks
    if (result?.success) {
      const data = result.data;
      // Paginated: { data: { data: [...] } }
      if (data?.data && Array.isArray(data.data)) {
        data.data = data.data.map((t: any) => normalizeTransaction(t));
      } else if (Array.isArray(data?.data?.data)) {
        data.data.data = data.data.data.map((t: any) => normalizeTransaction(t));
      } else if (Array.isArray(data)) {
        result.data = data.map((t: any) => normalizeTransaction(t));
      }
    }

    return result;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number) {
    const response = await axiosInstance.get(`/transactions/${id}`);
    const result = response.data;
    if (result?.success && result?.data) {
      result.data = normalizeTransaction(result.data);
    }
    return result;
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
    // There are two documented variants:
    // - /transactions/trial-balance (range-based)
    // - /accounting/trial-balance (as-of-date / textbook style)
    try {
      const response = await axiosInstance.get('/transactions/trial-balance', { params });
      const result = response.data;
      if (result?.success) {
        result.data = normalizeTrialBalance(result.data, params);
      }
      return result;
    } catch (err: any) {
      // Fallback to textbook report endpoint
      const fallbackParams: any = {
        as_of_date: params?.end_date || params?.start_date,
        store_id: params?.store_id,
      };
      const response = await axiosInstance.get('/accounting/trial-balance', { params: fallbackParams });
      const result = response.data;
      if (result?.success) {
        result.data = normalizeTrialBalance(result.data, {
          start_date: params?.start_date,
          end_date: params?.end_date || fallbackParams.as_of_date,
          store_id: params?.store_id,
        });
      }
      return result;
    }
  }

  /**
   * Get account ledger
   */
  async getAccountLedger(accountId: number, params?: {
    date_from?: string;
    date_to?: string;
    store_id?: number;
  }): Promise<{ success: boolean; data: LedgerData }> {
    // Two documented variants:
    // - /transactions/ledger/{id}
    // - /accounting/t-account/{id}
    try {
      const response = await axiosInstance.get(`/transactions/ledger/${accountId}`, { params });
      const result = response.data;
      if (result?.success) {
        result.data = normalizeLedger(result.data, accountId, params);
      }
      return result;
    } catch (err: any) {
      const response = await axiosInstance.get(`/accounting/t-account/${accountId}`, { params });
      const result = response.data;
      if (result?.success) {
        result.data = normalizeLedger(result.data, accountId, params);
      }
      return result;
    }
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

    const rawTransactions = response.data.data.data || response.data.data;
    const transactions = (Array.isArray(rawTransactions) ? rawTransactions : []).map((t: any) => normalizeTransaction(t));
    
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
        debit: txn.type === 'debit' ? toNumber(txn.amount, 0) : 0,
        credit: txn.type === 'credit' ? toNumber(txn.amount, 0) : 0,
        transaction: txn
      });
      
      if (txn.type === 'debit') {
        entry.total_debit += toNumber(txn.amount, 0);
      } else {
        entry.total_credit += toNumber(txn.amount, 0);
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
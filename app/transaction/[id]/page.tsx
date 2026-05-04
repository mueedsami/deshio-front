'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Printer, 
  ChevronRight,
  User,
  Store,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import transactionService, { Transaction } from '@/services/transactionService';

export default function TransactionDetailPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { id } = useParams();
  const router = useRouter();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [relatedTransactions, setRelatedTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTransaction();
    }
  }, [id]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const res = await transactionService.getTransactionById(Number(id));
      if (res.success) {
        setTransaction(res.data);
        setRelatedTransactions(res.related_transactions || []);
      } else {
        setError('Transaction not found');
      }
    } catch (err) {
      console.error('Failed to load transaction:', err);
      setError('Failed to fetch transaction details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    // Handle midnight UTC dates (likely date-only from backend)
    if (dateString.endsWith('T00:00:00.000000Z') || dateString.endsWith(' 00:00:00')) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          />
          
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto">
              {/* Top Navigation */}
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to List</span>
                </button>
                
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-all shadow-sm">
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>

              {error || !transaction ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-8 rounded-2xl text-center">
                  <p className="text-red-600 dark:text-red-400 font-medium">{error || 'Transaction not found'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Transaction Summary */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Main Info Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 uppercase tracking-widest font-bold mb-1">
                              {(transaction as any).display_id || (transaction as any).referenceId || `TXN-${transaction.id}`}
                              <ChevronRight className="w-3 h-3" />
                              {transaction.referenceLabel || 'Manual Entry'}
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                              {transaction.name}
                            </h1>
                          </div>
                          <div className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize ${
                            transaction.type === 'expense' 
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' 
                              : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          }`}>
                            {transaction.type}
                          </div>
                        </div>
                        <div className="text-4xl font-black text-gray-900 dark:text-white flex items-baseline gap-2">
                          <span className="text-2xl font-light text-gray-400">৳</span>
                          {transaction.amount.toLocaleString()}
                        </div>
                      </div>

                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Date & Time</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(transaction.transactionDate || transaction.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                              <Tag className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Category</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.category}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Source Identifier</p>
                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {transaction.referenceId && <span className="font-mono text-xs mr-2 opacity-60">#{transaction.referenceId}</span>}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                              <Store className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Store Context</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {transaction.store_name || (transaction.store_id === null ? 'Errum (Global HQ)' : `Store #${transaction.store_id}`)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Created By</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.createdBy || 'System'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                              <Clock className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                              <div className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Completed
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Related Transactions */}
                    {relatedTransactions.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-gray-400" />
                          Related Transactions (Double-Entry Part)
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-4 pr-4 font-bold">Transaction ID</th>
                                <th className="pb-4 pr-4 font-bold">Account</th>
                                <th className="pb-4 pr-4 font-bold">Type</th>
                                <th className="pb-4 font-bold text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-750">
                              {relatedTransactions.map((related: any) => (
                                <tr 
                                  key={related.id}
                                  onClick={() => router.push(`/transaction/${related.id}`)}
                                  className={`group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors ${related.id === Number(id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                >
                                  <td className="py-4 pr-4 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                    {related.display_id || related.transaction_number || `TXN-${related.id}`}
                                    {related.id === Number(id) && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded-md text-[8px] uppercase tracking-tighter">Current</span>}
                                  </td>
                                  <td className="py-4 pr-4 text-sm">
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      {related.account?.name || 'Manual Entry'}
                                    </div>
                                    <div className="text-[10px] text-gray-500">Code: {related.account?.account_code || 'N/A'}</div>
                                  </td>
                                  <td className="py-4 pr-4">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                      related.type === 'credit'
                                        ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50'
                                        : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50'
                                    }`}>
                                      {related.type}
                                    </span>
                                  </td>
                                  <td className={`py-4 text-sm font-black text-right ${related.type === 'debit' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                    {related.type === 'debit' ? '+' : '-'}৳{parseFloat(related.amount).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Metadata & Description */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" />
                        Details & Description
                      </h3>
                      
                      <div className="space-y-6">
                        {transaction.description && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                              "{transaction.description}"
                            </p>
                          </div>
                        )}

                        {transaction.comment && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Internal Notes</p>
                            <p className="text-sm text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                              {transaction.comment}
                            </p>
                          </div>
                        )}

                        {transaction.referenceId && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <ExternalLink className="w-3 h-3" />
                                Referenced Document ID: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-900 dark:text-white">{transaction.referenceId}</span>
                              </div>
                              <button 
                                onClick={() => loadTransaction()}
                                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Sync Data
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Receipt Image */}
                  <div className="space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                          Receipt Copy
                        </h3>
                        {transaction.receiptImage && (
                          <a 
                            href={transaction.receiptImage} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <div className="p-6">
                        {transaction.receiptImage ? (
                          <div className="relative group cursor-zoom-in">
                            <img 
                              src={transaction.receiptImage} 
                              alt="Receipt" 
                              className="w-full h-auto rounded-xl shadow-inner border border-gray-100 dark:border-gray-700 group-hover:opacity-95 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-xl">
                              <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border border-white/20">
                                View Full Image
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-300" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No receipt attached</p>
                              <p className="text-[10px] text-gray-400 mt-1">Images only available for manual entries</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline / Logs */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Activity Timeline</h3>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="min-w-[8px] h-2 bg-green-500 rounded-full mt-1.5"></div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Transaction Completed</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(transaction.transactionDate || transaction.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 relative">
                          <div className="absolute left-[3.5px] top-4 bottom-[-16px] w-[1px] bg-gray-200 dark:bg-gray-700"></div>
                          <div className="min-w-[8px] h-2 bg-blue-500 rounded-full mt-1.5 z-10"></div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Entry Initialized</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

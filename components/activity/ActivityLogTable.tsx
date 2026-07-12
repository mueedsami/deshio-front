import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';

import type { BusinessHistoryEntry } from '@/services/activityService';

interface ActivityLogTableProps {
  entries: BusinessHistoryEntry[];
  isLoading?: boolean;
  onCopy?: (text: string) => void;
}

function prettyJson(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
      {children}
    </span>
  );
}

function humanizeCategory(category: string) {
  const map: Record<string, string> = {
    orders: 'Orders',
    'product-dispatches': 'Store transfers',
    'purchase-orders': 'Purchase orders',
    'store-assignments': 'Store assignments',
    products: 'Products',
  };
  return map[category] || category.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeAction(action?: string, actionLabel?: string) {
  if (actionLabel) return actionLabel;
  const map: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    invoice_printed: 'Invoice printed',
    receipt_printed: 'Receipt printed',
    pathao_sent: 'Sent to Pathao',
  };
  return map[String(action || '')] || String(action || 'Activity').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeField(field: string) {
  const map: Record<string, string> = {
    order_number: 'Order number',
    customer_id: 'Customer',
    store_id: 'Store',
    order_type: 'Order type',
    is_preorder: 'Preorder',
    status: 'Order status',
    fulfillment_status: 'Packing status',
    payment_status: 'Payment status',
    subtotal: 'Subtotal',
    tax_amount: 'Tax',
    discount_amount: 'Order discount',
    shipping_amount: 'Delivery charge',
    total_amount: 'Total amount',
    paid_amount: 'Paid amount',
    outstanding_amount: 'Due amount',
    shipping_address: 'Delivery address',
    order_date: 'Order date',
    confirmed_at: 'Confirmed at',
    fulfilled_at: 'Packed at',
    delivered_at: 'Delivered at',
    intended_courier: 'Selected courier',
    metadata: 'Extra details',
    invoice_printed: 'Invoice printed',
    invoice_print_count: 'Invoice print count',
    last_invoice_printed_at: 'Last invoice print time',
    current_status: 'Barcode status',
    product_barcode_id: 'Barcode',
    batch_id: 'Batch',
    product_id: 'Product',
    unit_price: 'Unit price',
    quantity: 'Quantity',
  };
  return map[field] || field.replace(/[_-]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeValue(value: any) {
  if (value === null || typeof value === 'undefined' || value === '') return 'empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') {
    const preferred = ['name', 'phone', 'address', 'city', 'area', 'order_number', 'status'];
    const parts = preferred
      .filter((key) => value[key] !== undefined && value[key] !== null && value[key] !== '')
      .map((key) => `${humanizeField(key)}: ${humanizeValue(value[key])}`);
    return parts.length ? parts.slice(0, 3).join(', ') : `${Object.keys(value).length} detail${Object.keys(value).length === 1 ? '' : 's'}`;
  }
  const str = String(value);
  const map: Record<string, string> = {
    social_commerce: 'Social commerce',
    ecommerce: 'E-commerce',
    counter: 'In-person sale',
    pending_assignment: 'Pending store assignment',
    assigned_to_store: 'Assigned to store',
    pending_fulfillment: 'Waiting for packing',
    ready_for_shipment: 'Ready for shipment',
    service_only: 'Service-only order',
    partially_paid: 'Partially paid',
    pathao: 'Pathao',
    browser_preview: 'Browser print preview',
    qz_tray: 'Direct printer',
  };
  return map[str] || str;
}

export default function ActivityLogTable({ entries, isLoading, onCopy }: ActivityLogTableProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ta = new Date(a.when?.timestamp || 0).getTime();
      const tb = new Date(b.when?.timestamp || 0).getTime();
      return tb - ta;
    });
  }, [entries]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        Loading history...
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        No activity found for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="w-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Who</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((entry) => {
              const isOpen = !!expanded[entry.id];
              const whoName = entry.who?.name || 'Unknown';
              const whoEmail = entry.who?.email;
              const whenText = entry.when?.formatted || entry.when?.timestamp || '';
              const human = entry.when?.human;
              const action = humanizeAction(entry.what?.action, entry.what?.action_label);
              const description = entry.what?.description || '';
              const subjectType = entry.subject?.type || humanizeCategory(entry.category);
              const humanChanges = Array.isArray(entry.what?.human_changes) ? entry.what.human_changes : [];
              const subjectId = entry.subject?.id;

              return (
                <React.Fragment key={`${entry.category}-${entry.id}`}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpanded((p) => ({ ...p, [entry.id]: !p[entry.id] }))}
                        className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        title={isOpen ? 'Collapse' : 'Expand'}
                      >
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{whenText}</div>
                      {human && <div className="text-xs text-gray-500 dark:text-gray-400">{human}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{whoName}</div>
                      {whoEmail && <div className="text-xs text-gray-500 dark:text-gray-400">{whoEmail}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip>{humanizeCategory(entry.category)}</Chip>
                        {action && <Chip>{action}</Chip>}
                      </div>
                      {description && <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">{description}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{subjectType}</div>
                      {typeof subjectId !== 'undefined' && subjectId !== null && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">#{subjectId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        {humanChanges.length > 0
                          ? `${humanChanges.length} business detail(s)`
                          : Array.isArray(entry.what?.fields_changed) && entry.what.fields_changed.length > 0
                            ? `${entry.what.fields_changed.length} field(s)`
                            : Object.keys(entry.what?.changes || {}).length
                              ? `${Object.keys(entry.what?.changes || {}).length} change(s)`
                              : '—'}
                      </div>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-gray-50 dark:bg-gray-800/40">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.who?.type && <Chip>{entry.who.type}</Chip>}
                            {entry.subject?.type && <Chip>{entry.subject.type}</Chip>}
                            {entry.what?.description && (
                              <button
                                type="button"
                                onClick={() => onCopy?.(entry.what?.description || '')}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                              >
                                <Copy size={14} />
                                Copy desc
                              </button>
                            )}
                          </div>

                          {(humanChanges.length > 0 || (entry.what?.changes && Object.keys(entry.what.changes).length > 0)) && (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Business-readable details
                              </div>
                              <div className="space-y-2">
                                {humanChanges.length > 0
                                  ? humanChanges.map((change: any, idx: number) => (
                                      <div key={`${change.raw_field || change.field || 'change'}-${idx}`} className="text-sm text-gray-800 dark:text-gray-200">
                                        {change.sentence || (
                                          <>
                                            <span className="font-semibold">{change.field || 'Detail'}</span>:&nbsp;
                                            <span>{humanizeValue(change.from)}</span>
                                            <span className="mx-2 text-gray-400">→</span>
                                            <span>{humanizeValue(change.to)}</span>
                                          </>
                                        )}
                                      </div>
                                    ))
                                  : Object.entries(entry.what.changes || {}).map(([field, change]) => (
                                      <div key={field} className="text-sm text-gray-800 dark:text-gray-200">
                                        <span className="font-semibold">{humanizeField(field)}</span>:&nbsp;
                                        <span>{humanizeValue((change as any)?.from)}</span>
                                        <span className="mx-2 text-gray-400">→</span>
                                        <span>{humanizeValue((change as any)?.to)}</span>
                                      </div>
                                    ))}
                              </div>
                            </div>
                          )}

                          {entry.subject?.data && (
                            <details className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Technical snapshot
                              </summary>
                              <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-950 dark:text-gray-100">
                                {prettyJson(entry.subject.data)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

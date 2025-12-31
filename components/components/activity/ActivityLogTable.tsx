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
              const action = entry.what?.action || '';
              const description = entry.what?.description || '';
              const subjectType = entry.subject?.type || entry.category;
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
                        <Chip>{entry.category}</Chip>
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
                        {Array.isArray(entry.what?.fields_changed) && entry.what.fields_changed.length > 0
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

                          {entry.what?.changes && Object.keys(entry.what.changes).length > 0 && (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Changes (from → to)
                              </div>
                              <div className="space-y-2">
                                {Object.entries(entry.what.changes).map(([field, change]) => (
                                  <div key={field} className="text-sm text-gray-800 dark:text-gray-200">
                                    <span className="font-semibold">{field}</span>:&nbsp;
                                    <span className="font-mono text-xs">{prettyJson((change as any)?.from)}</span>
                                    <span className="mx-2 text-gray-400">→</span>
                                    <span className="font-mono text-xs">{prettyJson((change as any)?.to)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {entry.subject?.data && (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Subject snapshot
                              </div>
                              <pre className="max-h-64 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-950 dark:text-gray-100">
                                {prettyJson(entry.subject.data)}
                              </pre>
                            </div>
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

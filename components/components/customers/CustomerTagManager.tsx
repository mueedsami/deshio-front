'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, Loader2, Tag } from 'lucide-react';
import customerService from '@/services/customerService';

type Props = {
  customerId: number;
  /** Initial tags from the customer payload. */
  initialTags?: string[];
  /** Optional callback so parent can sync its customer state. */
  onTagsChange?: (nextTags: string[]) => void;
  /** Compact mode for tight panels. */
  compact?: boolean;
};

function normalizeTag(input: string): string {
  const cleaned = (input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned;
}

export default function CustomerTagManager({ customerId, initialTags = [], onTagsChange, compact }: Props) {
  // UI choice: hide the "add existing tag" dropdown for now (per requirement),
  // but keep all underlying functionality for future re-enable.
  const SHOW_EXISTING_TAG_PICKER = false;
  const [tags, setTags] = useState<string[]>(Array.isArray(initialTags) ? initialTags : []);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedExisting, setSelectedExisting] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Keep in sync if parent updates the customer object
  useEffect(() => {
    setTags(Array.isArray(initialTags) ? initialTags : []);
  }, [JSON.stringify(initialTags || [])]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingTags(true);
        const list = await customerService.getAllTags();
        if (!mounted) return;
        setAllTags(Array.isArray(list) ? list : []);
      } catch (e: any) {
        // Non-blocking: the manager still works without this list.
        console.warn('Failed to load all customer tags:', e?.message || e);
      } finally {
        if (mounted) setLoadingTags(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const availableToAdd = useMemo(() => {
    const set = new Set(tags);
    return (allTags || []).filter((t) => !set.has(t));
  }, [allTags, tags]);

  const updateTags = (next: string[]) => {
    const safe = Array.isArray(next) ? next : [];
    setTags(safe);
    onTagsChange?.(safe);
  };

  const handleAdd = async () => {
    setErr(null);

    const raw = selectedExisting || customInput;
    const tag = normalizeTag(raw);

    if (!tag) {
      setErr('Type a tag name first.');
      return;
    }

    if (tags.includes(tag)) {
      setErr('This tag is already added.');
      return;
    }

    try {
      setBusy(true);
      const next = await customerService.addTags(customerId, [tag]);
      updateTags(next);
      // If a brand-new tag was added, reflect it in the dropdown list.
      setAllTags((prev) => (prev.includes(tag) ? prev : [tag, ...prev]));
      setSelectedExisting('');
      setCustomInput('');
    } catch (e: any) {
      setErr(e?.message || 'Failed to add tag');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (tag: string) => {
    setErr(null);
    try {
      setBusy(true);
      const next = await customerService.removeTags(customerId, [tag]);
      updateTags(next);
    } catch (e: any) {
      setErr(e?.message || 'Failed to remove tag');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={
        compact
          ? 'mt-2'
          : 'mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3'
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Customer Tags</p>
        </div>
        {loadingTags && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading
          </span>
        )}
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <span className="text-[10px] text-gray-500 dark:text-gray-400">No tags yet</span>
        ) : (
          tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[10px] font-medium text-gray-700 dark:text-gray-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add tag controls */}
      <div
        className={
          compact
            ? 'mt-2 flex flex-col gap-2'
            : SHOW_EXISTING_TAG_PICKER
              ? 'mt-3 grid grid-cols-1 md:grid-cols-3 gap-2'
              : 'mt-3 grid grid-cols-1 md:grid-cols-5 gap-2'
        }
      >
        {SHOW_EXISTING_TAG_PICKER && (
          <select
            value={selectedExisting}
            onChange={(e) => {
              setSelectedExisting(e.target.value);
              if (e.target.value) setCustomInput('');
            }}
            disabled={busy}
            className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Add existing tag…</option>
            {availableToAdd.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <input
          value={customInput}
          onChange={(e) => {
            setCustomInput(e.target.value);
            if (e.target.value) setSelectedExisting('');
          }}
          placeholder="Or type new tag (e.g., high-spender)"
          disabled={busy}
          className={
            `w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 ` +
            (SHOW_EXISTING_TAG_PICKER ? '' : 'md:col-span-4')
          }
        />

        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </div>

      {err && <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{err}</p>}

      <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
        Tip: use lowercase, hyphenated tags (like <span className="font-mono">high-spender</span>).
      </p>
    </div>
  );
}

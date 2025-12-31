import fs from 'fs';
import path from 'path';

export type AnyObj = Record<string, any>;

export function safeNum(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/\n|\r|,|"/g.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: any[][]): string {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n');
}

export function readJsonIfExists(filename: string): any {
  const filePath = path.resolve('data', filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseDateRange(dateFrom?: string | null, dateTo?: string | null): { from?: Date; to?: Date } {
  const out: { from?: Date; to?: Date } = {};
  if (dateFrom) {
    const d = new Date(`${dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) out.from = d;
  }
  if (dateTo) {
    const d = new Date(`${dateTo}T23:59:59.999Z`);
    if (!Number.isNaN(d.getTime())) out.to = d;
  }
  return out;
}

export function inRange(d: Date | null, range: { from?: Date; to?: Date }): boolean {
  if (!d) return true;
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

export function nowStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

export async function tryFetchJson(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

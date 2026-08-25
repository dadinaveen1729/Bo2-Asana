// Parsing + mapping helpers for the "Import from spreadsheet" flow.
// Kept dependency-light and framework-free so it can be unit-tested or reused
// outside of the page component.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parse as parseDate, parseISO, isValid, format as formatDate } from 'date-fns';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

export type TaskFieldKey = 'name' | 'section' | 'assignee' | 'dueDate' | 'priority' | 'notes';

export interface ColumnMapping {
  name: string; // header string, or 'none' (only valid transiently — name is required)
  section: string; // header string, or 'none'
  assignee: string;
  dueDate: string;
  priority: string;
  notes: string;
}

export const NONE = 'none';

/** Detects CSV vs Excel by extension first, falling back to MIME type. */
function detectFileKind(file: File): 'csv' | 'excel' | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
  if (file.type === 'text/csv') return 'csv';
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  ) {
    return 'excel';
  }
  return null;
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const kind = detectFileKind(file);
  if (kind === 'csv') return parseCsvFile(file);
  if (kind === 'excel') return parseExcelFile(file);
  throw new Error('Unsupported file type. Please upload a .csv or .xlsx file.');
}

async function parseCsvFile(file: File): Promise<ParsedSpreadsheet> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = (result.meta.fields || []).map((f) => f.trim()).filter(Boolean);
  if (headers.length === 0) {
    throw new Error('No header row found. The first row of the CSV must contain column names.');
  }

  const rows = (result.data || [])
    .map((row) => {
      const clean: Record<string, string> = {};
      for (const h of headers) clean[h] = (row[h] ?? '').toString().trim();
      return clean;
    })
    .filter((row) => headers.some((h) => row[h] !== ''));

  return { headers, rows };
}

async function parseExcelFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('That workbook has no sheets.');
  const sheet = workbook.Sheets[sheetName];

  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown as (
    | string
    | number
    | null
  )[][];
  if (grid.length === 0) {
    throw new Error('The first sheet is empty.');
  }

  const rawHeaders = (grid[0] || []).map((h) => (h ?? '').toString().trim());
  let lastNonEmpty = rawHeaders.length - 1;
  while (lastNonEmpty >= 0 && !rawHeaders[lastNonEmpty]) lastNonEmpty--;
  if (lastNonEmpty < 0) {
    throw new Error('No header row found. The first row of the sheet must contain column names.');
  }
  const headers = rawHeaders.slice(0, lastNonEmpty + 1).map((h, i) => h || `Column ${i + 1}`);

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < grid.length; r++) {
    const rowArr = grid[r] || [];
    const row: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, i) => {
      const v = (rowArr[i] ?? '').toString().trim();
      row[h] = v;
      if (v) hasValue = true;
    });
    if (hasValue) rows.push(row);
  }

  return { headers, rows };
}

// --- Column mapping auto-guessing -----------------------------------------

const HINTS: Record<TaskFieldKey, string[]> = {
  name: ['task name', 'task', 'name', 'title', 'summary'],
  section: ['section', 'status', 'stage', 'column', 'state'],
  assignee: ['assignee', 'assigned to', 'assigned', 'owner'],
  dueDate: ['due date', 'due', 'deadline', 'end date', 'target date'],
  priority: ['priority', 'severity'],
  notes: ['notes', 'description', 'details', 'comment', 'comments'],
};

function guessColumn(headers: string[], hints: string[]): string {
  const lower = headers.map((h) => h.toLowerCase());
  for (const hint of hints) {
    const idx = lower.indexOf(hint);
    if (idx !== -1) return headers[idx];
  }
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx !== -1) return headers[idx];
  }
  return NONE;
}

export function guessMapping(headers: string[]): ColumnMapping {
  const name = guessColumn(headers, HINTS.name);
  return {
    name: name !== NONE ? name : headers[0] || NONE,
    section: guessColumn(headers, HINTS.section),
    assignee: guessColumn(headers, HINTS.assignee),
    dueDate: guessColumn(headers, HINTS.dueDate),
    priority: guessColumn(headers, HINTS.priority),
    notes: guessColumn(headers, HINTS.notes),
  };
}

// --- Value parsing -----------------------------------------------------

const DATE_PATTERNS = ['yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yyyy', 'MM-dd-yyyy', 'MMM d, yyyy', 'MMMM d, yyyy'];

/** Returns a YYYY-MM-DD string, or null if the cell is blank/unparseable. */
export function parseFlexibleDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  const iso = parseISO(v);
  if (isValid(iso)) return formatDate(iso, 'yyyy-MM-dd');

  for (const pattern of DATE_PATTERNS) {
    const d = parseDate(v, pattern, new Date());
    if (isValid(d)) return formatDate(d, 'yyyy-MM-dd');
  }

  // Last resort for formats we didn't anticipate (e.g. "Jan 5 2024").
  const native = new Date(v);
  if (!Number.isNaN(native.getTime())) return formatDate(native, 'yyyy-MM-dd');

  return null;
}

const PRIORITY_MAP: Record<string, 'low' | 'medium' | 'high'> = {
  high: 'high', h: 'high', urgent: 'high', critical: 'high', p1: 'high',
  medium: 'medium', med: 'medium', m: 'medium', normal: 'medium', p2: 'medium',
  low: 'low', l: 'low', minor: 'low', p3: 'low',
};

/** Maps common priority spellings to the app's task_priority enum. Unrecognized values return null. */
export function parsePriority(value: string): 'low' | 'medium' | 'high' | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  return PRIORITY_MAP[v] || null;
}

/** Distinct values from a column, in first-seen order, blanks dropped. */
export function distinctInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export interface MemberLite {
  id: string;
  full_name: string | null;
  email: string;
}

/** Builds a case-insensitive full-name/email -> user id lookup for assignee matching. */
export function buildMemberLookup(members: MemberLite[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of members) {
    if (m.full_name) map.set(m.full_name.trim().toLowerCase(), m.id);
    if (m.email) map.set(m.email.trim().toLowerCase(), m.id);
  }
  return map;
}

export function matchAssignee(value: string, lookup: Map<string, string>): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  return lookup.get(v) || null;
}

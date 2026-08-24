import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | null | undefined, email?: string | null) {
  const source = (name && name.trim()) || (email ? email.split('@')[0] : '') || '?';
  const parts = source.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TAG_PALETTE = [
  '#F14545', '#F2994A', '#F2C94C', '#6FCF97', '#2FBF9F',
  '#56CCF2', '#6C5CE7', '#BB6BD9', '#EB5E9C', '#8395A7',
];

export function colorForIndex(i: number) {
  return TAG_PALETTE[i % TAG_PALETTE.length];
}

export function hashColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colorForIndex(Math.abs(hash));
}

export function isOverdue(dueDate: string | null | undefined, completed: boolean) {
  if (!dueDate || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate + 'T00:00:00') < today;
}

export function isDueSoon(dueDate: string | null | undefined, completed: boolean) {
  if (!dueDate || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffDays = (due.getTime() - today.getTime()) / 86400000;
  return diffDays >= 0 && diffDays <= 2;
}

export const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: '#2E90FA', bg: '#EFF8FF' },
  medium: { label: 'Medium', color: '#F79009', bg: '#FFFAEB' },
  high: { label: 'High', color: '#F04438', bg: '#FEF3F2' },
};

export const PROJECT_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  on_track: { label: 'On track', color: '#17B26A', bg: '#ECFDF3' },
  at_risk: { label: 'At risk', color: '#F79009', bg: '#FFFAEB' },
  off_track: { label: 'Off track', color: '#F04438', bg: '#FEF3F2' },
  on_hold: { label: 'On hold', color: '#667085', bg: '#F9FAFB' },
  complete: { label: 'Complete', color: '#6C5CE7', bg: '#F5F3FF' },
};

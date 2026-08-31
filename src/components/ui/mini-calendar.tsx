'use client';

import { useState } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Repeat, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Doesn't repeat",
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  monthly: 'Repeats monthly',
};

export function MiniCalendar({
  selected,
  onSelect,
  onClear,
  time,
  onTimeChange,
  recurrence,
  onRecurrenceChange,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  onClear?: () => void;
  time?: string | null;
  onTimeChange?: (t: string | null) => void;
  recurrence?: Recurrence;
  onRecurrenceChange?: (r: Recurrence) => void;
}) {
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [cursor, setCursor] = useState(selected || new Date());

  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="w-64">
      <div className="mb-2 flex items-center justify-between px-1">
        <button onClick={() => setCursor((c) => subMonths(c, 1))} className="rounded-md p-1 text-ink-faint hover:bg-surface-hover">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-ink">{format(cursor, 'MMMM yyyy')}</span>
        <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-md p-1 text-ink-faint hover:bg-surface-hover">
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-1 pb-1 text-center text-[10px] font-medium text-ink-faint">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const isSelected = selected && isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] transition-colors',
                !inMonth && 'text-ink-faint/50',
                inMonth && !isSelected && 'text-ink hover:bg-surface-hover',
                isToday(day) && !isSelected && 'font-bold text-brand-600',
                isSelected && 'bg-brand-500 font-semibold text-white'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
      {onTimeChange && (
        <div className="mt-2 flex items-center gap-2 border-t border-border px-1 pt-2">
          <span className="text-xs font-medium text-ink-faint">Time</span>
          <input
            type="time"
            value={time ? time.slice(0, 5) : ''}
            onChange={(e) => onTimeChange(e.target.value || null)}
            className="rounded-md border border-border px-1.5 py-1 text-xs text-ink outline-none focus:border-brand-400"
          />
          {time && (
            <button onClick={() => onTimeChange(null)} title="Clear time" className="text-ink-faint hover:text-ink-muted">
              <X size={12} />
            </button>
          )}
        </div>
      )}
      {onRecurrenceChange && (
        <div className="relative border-t border-border px-1 pt-2">
          <button
            onClick={() => setRecurrenceOpen((v) => !v)}
            className={cn(
              'flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium hover:bg-surface-hover',
              recurrence && recurrence !== 'none' ? 'text-brand-600' : 'text-ink-faint'
            )}
          >
            <Repeat size={12} /> {RECURRENCE_LABELS[recurrence || 'none']}
          </button>
          {recurrenceOpen && (
            <div className="absolute left-1 right-1 top-full z-10 mt-1 rounded-lg border border-border bg-white p-1 shadow-popover">
              {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { onRecurrenceChange(key); setRecurrenceOpen(false); }}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-ink hover:bg-surface-hover"
                >
                  {RECURRENCE_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-border px-1 pt-2">
        <button onClick={() => onSelect(new Date())} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Today
        </button>
        {onClear && (
          <button onClick={onClear} className="text-xs font-medium text-ink-faint hover:text-ink-muted">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

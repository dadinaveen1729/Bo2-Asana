'use client';

import { useState } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MiniCalendar({
  selected,
  onSelect,
  onClear,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  onClear?: () => void;
}) {
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

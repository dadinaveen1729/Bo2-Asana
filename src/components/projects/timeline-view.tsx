'use client';

import { useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, isToday, isWeekend, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Diamond } from 'lucide-react';
import { useSections } from '@/hooks/use-sections';
import { useProjectTasks } from '@/hooks/use-tasks';
import { useTaskPanel } from '@/lib/task-panel-context';
import { PRIORITY_META, cn } from '@/lib/utils';

const DAY_WIDTH = 34;
const ROW_HEIGHT = 36;
const WINDOW_DAYS = 60;

export function TimelineView({ projectId }: { projectId: string }) {
  const { sections } = useSections(projectId);
  const { tasks } = useProjectTasks(projectId);
  const { openTask } = useTaskPanel();
  const [offset, setOffset] = useState(-10);

  const rangeStart = useMemo(() => startOfDay(addDays(new Date(), offset)), [offset]);
  const days = useMemo(() => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(rangeStart, i)), [rangeStart]);

  const grouped = sections.map((s) => ({
    section: s,
    tasks: tasks.filter((t) => t.section_id === s.id).sort((a, b) => a.tp_position - b.tp_position),
  }));

  function barFor(t: (typeof tasks)[number]) {
    if (!t.due_date) return null;
    const end = startOfDay(new Date(t.due_date + 'T00:00:00'));
    const start = t.start_date ? startOfDay(new Date(t.start_date + 'T00:00:00')) : end;
    const startOffset = differenceInCalendarDays(start, rangeStart);
    const endOffset = differenceInCalendarDays(end, rangeStart);
    if (endOffset < 0 || startOffset > WINDOW_DAYS) return null;
    const clampedStart = Math.max(0, startOffset);
    const clampedEnd = Math.min(WINDOW_DAYS - 1, endOffset);
    return { left: clampedStart * DAY_WIDTH, width: Math.max(DAY_WIDTH - 4, (clampedEnd - clampedStart + 1) * DAY_WIDTH - 4) };
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-6 py-2.5">
        <button onClick={() => setOffset((o) => o - 30)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"><ChevronLeft size={16} /></button>
        <button onClick={() => setOffset(-10)} className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">Today</button>
        <button onClick={() => setOffset((o) => o + 30)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"><ChevronRight size={16} /></button>
        <span className="text-xs text-ink-faint">{format(rangeStart, 'MMM d')} – {format(addDays(rangeStart, WINDOW_DAYS - 1), 'MMM d, yyyy')}</span>
      </div>

      <div className="scrollbar-thin flex flex-1 overflow-auto">
        <div className="sticky left-0 z-10 w-56 shrink-0 border-r border-border bg-white">
          <div className="border-b border-border" style={{ height: 40 }} />
          {grouped.map(({ section, tasks: sTasks }) => (
            <div key={section.id}>
              <div className="flex items-center border-b border-border bg-surface-hover px-3 text-[12px] font-semibold text-ink" style={{ height: ROW_HEIGHT }}>
                {section.name}
              </div>
              {sTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTask(t.id)}
                  className="flex w-full items-center truncate border-b border-border px-3 text-left text-[13px] text-ink hover:bg-surface-hover"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="relative" style={{ width: WINDOW_DAYS * DAY_WIDTH }}>
          <div className="sticky top-0 z-[1] flex border-b border-border bg-white" style={{ height: 40 }}>
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={cn(
                  'flex shrink-0 flex-col items-center justify-center border-r border-border text-[10px]',
                  isWeekend(d) && 'bg-surface-hover',
                  isToday(d) && 'bg-brand-50'
                )}
                style={{ width: DAY_WIDTH }}
              >
                <span className="text-ink-faint">{format(d, 'EEEEE')}</span>
                <span className={cn('font-medium', isToday(d) ? 'text-brand-600' : 'text-ink-muted')}>{format(d, 'd')}</span>
              </div>
            ))}
          </div>

          {grouped.map(({ section, tasks: sTasks }) => (
            <div key={section.id}>
              <div className="relative flex border-b border-border" style={{ height: ROW_HEIGHT }}>
                {days.map((d) => (
                  <div key={d.toISOString()} className={cn('shrink-0 border-r border-border', isWeekend(d) && 'bg-surface-hover/60')} style={{ width: DAY_WIDTH }} />
                ))}
              </div>
              {sTasks.map((t) => {
                const bar = barFor(t);
                const meta = t.priority ? PRIORITY_META[t.priority] : null;
                return (
                  <div key={t.id} className="relative flex border-b border-border" style={{ height: ROW_HEIGHT }}>
                    {days.map((d) => (
                      <div key={d.toISOString()} className={cn('shrink-0 border-r border-border', isWeekend(d) && 'bg-surface-hover/60')} style={{ width: DAY_WIDTH }} />
                    ))}
                    {bar && (
                      <button
                        onClick={() => openTask(t.id)}
                        className={cn('absolute top-1/2 flex -translate-y-1/2 items-center truncate rounded-full px-2 text-[11px] font-medium text-white shadow-sm transition hover:brightness-95', t.completed && 'opacity-50')}
                        style={{ left: bar.left, width: bar.width, height: 22, backgroundColor: meta?.color || '#6C5CE7' }}
                        title={t.name}
                      >
                        {t.is_milestone && <Diamond size={10} className="mr-1 shrink-0" />}
                        <span className="truncate">{t.name}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

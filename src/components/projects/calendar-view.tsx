'use client';

import { useMemo, useState } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useProjectTasks } from '@/hooks/use-tasks';
import { useTaskPanel } from '@/lib/task-panel-context';
import { PRIORITY_META, cn } from '@/lib/utils';

export function CalendarView({ projectId }: { projectId: string }) {
  const { workspace, user } = useWorkspace();
  const { tasks, createTask } = useProjectTasks(projectId);
  const { openTask } = useTaskPanel();
  const [cursor, setCursor] = useState(new Date());
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [name, setName] = useState('');

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      (map[t.due_date] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  async function handleAdd(dayKey: string) {
    if (!name.trim() || !workspace || !user) return;
    await createTask({ name: name.trim(), workspaceId: workspace.id, createdBy: user.id, dueDate: dayKey });
    setName('');
    setAddingDay(null);
  }

  return (
    <div className="px-6 py-4">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => setCursor((c) => subMonths(c, 1))} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold text-ink">{format(cursor, 'MMMM yyyy')}</span>
        <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"><ChevronRight size={16} /></button>
        <button onClick={() => setCursor(new Date())} className="ml-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">Today</button>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="border-b border-r border-border bg-surface-hover px-2 py-1.5 text-center text-[11px] font-semibold text-ink-faint last:border-r-0">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay[key] || [];
          const inMonth = isSameMonth(day, cursor);
          return (
            <div key={key} className={cn('group min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0', !inMonth && 'bg-surface-hover/40')}>
              <div className="mb-1 flex items-center justify-between">
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px]', isToday(day) ? 'bg-brand-500 font-semibold text-white' : inMonth ? 'text-ink-muted' : 'text-ink-faint/60')}>
                  {format(day, 'd')}
                </span>
                <button onClick={() => setAddingDay(key)} className="rounded p-0.5 text-ink-faint opacity-0 hover:bg-white group-hover:opacity-100">
                  <Plus size={12} />
                </button>
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => {
                  const meta = t.priority ? PRIORITY_META[t.priority] : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTask(t.id)}
                      className={cn('flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px]', t.completed ? 'text-ink-faint line-through' : 'text-ink hover:bg-surface-hover')}
                      style={meta ? { backgroundColor: meta.bg } : undefined}
                    >
                      {meta && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />}
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
                {dayTasks.length > 3 && <p className="px-1.5 text-[10px] text-ink-faint">+{dayTasks.length - 3} more</p>}
                {addingDay === key && (
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd(key)}
                    onBlur={() => { setAddingDay(null); setName(''); }}
                    placeholder="Task name"
                    className="w-full rounded border border-border px-1 py-0.5 text-[11px] outline-none focus:border-brand-400"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

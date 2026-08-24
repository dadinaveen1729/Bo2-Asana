'use client';

import { useTaskPanel } from '@/lib/task-panel-context';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerButton, PriorityPicker } from '@/components/tasks/pickers';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Hash } from 'lucide-react';
import type { MyTask } from '@/hooks/use-my-tasks';

export function SimpleTaskRow({ task, showProject = true }: { task: MyTask; showProject?: boolean }) {
  const { openTask } = useTaskPanel();
  const supabase = createClient();

  return (
    <div className="group flex items-center gap-2.5 border-b border-border px-3 py-2 hover:bg-surface-hover">
      <Checkbox checked={task.completed} onCheckedChange={(v) => supabase.from('tasks').update({ completed: !!v }).eq('id', task.id)} />
      <button onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <span className={cn('truncate text-[13.5px]', task.completed ? 'text-ink-faint line-through' : 'text-ink')}>{task.name}</span>
      </button>
      {showProject && task.project && (
        <span className="hidden shrink-0 items-center gap-1 rounded-md bg-surface-hover px-1.5 py-0.5 text-[11px] text-ink-faint sm:flex">
          <Hash size={10} style={{ color: task.project.color || '#FC636B' }} />
          {task.project.name}
        </span>
      )}
      {task.tags.slice(0, 2).map((t) => (
        <span key={t.id} className="hidden shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:inline-block" style={{ backgroundColor: t.color + '22', color: t.color }}>
          {t.name}
        </span>
      ))}
      <PriorityPicker priority={task.priority} onChange={(p) => supabase.from('tasks').update({ priority: p as any }).eq('id', task.id)} />
      <DatePickerButton date={task.due_date} completed={task.completed} onChange={(d) => supabase.from('tasks').update({ due_date: d }).eq('id', task.id)} />
    </div>
  );
}

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTaskPanel } from '@/lib/task-panel-context';
import { Checkbox } from '@/components/ui/checkbox';
import { AssigneePicker, DatePickerButton, PriorityPicker } from '@/components/tasks/pickers';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { ProjectTask } from '@/hooks/use-tasks';

export function TaskRow({ task, onToggleComplete }: { task: ProjectTask; onToggleComplete: (v: boolean) => void }) {
  const { openTask } = useTaskPanel();
  const supabase = createClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 border-b border-border px-3 py-2 hover:bg-surface-hover"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-ink-faint opacity-0 group-hover:opacity-100">
        <GripVertical size={14} />
      </button>
      <Checkbox checked={task.completed} onCheckedChange={(v) => onToggleComplete(!!v)} />
      <button onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <span className={cn('truncate text-[13.5px]', task.completed ? 'text-ink-faint line-through' : 'text-ink')}>
          {task.name}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {task.tags.slice(0, 2).map((t) => (
          <span key={t.id} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: t.color + '22', color: t.color }}>
            {t.name}
          </span>
        ))}
        <PriorityPicker priority={task.priority} onChange={(p) => supabase.from('tasks').update({ priority: p as any }).eq('id', task.id)} />
        <DatePickerButton date={task.due_date} completed={task.completed} onChange={(d) => supabase.from('tasks').update({ due_date: d }).eq('id', task.id)} />
      </div>
      <AssigneePicker assignee={task.assignee} onChange={(id) => supabase.from('tasks').update({ assignee_id: id }).eq('id', task.id)} size={24} />
    </div>
  );
}

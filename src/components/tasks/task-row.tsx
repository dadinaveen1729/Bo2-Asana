'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTaskPanel } from '@/lib/task-panel-context';
import { Checkbox } from '@/components/ui/checkbox';
import { AssigneePicker, DatePickerButton, PriorityPicker } from '@/components/tasks/pickers';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProjectTask } from '@/hooks/use-tasks';

export function TaskRow({
  task,
  onToggleComplete,
  dragDisabled = false,
}: {
  task: ProjectTask;
  onToggleComplete: (v: boolean) => void;
  dragDisabled?: boolean;
}) {
  const { openTask } = useTaskPanel();
  const supabase = createClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: dragDisabled });

  async function updateTask(patch: Record<string, unknown>) {
    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id);
    if (error) toast.error(error.message);
  }

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 border-b border-border px-3 py-2 hover:bg-surface-hover"
    >
      <button
        {...(dragDisabled ? {} : { ...attributes, ...listeners })}
        className={cn('text-ink-faint', dragDisabled ? 'invisible' : 'cursor-grab opacity-0 group-hover:opacity-100')}
      >
        <GripVertical size={14} />
      </button>
      <Checkbox checked={task.completed} onCheckedChange={(v) => onToggleComplete(!!v)} />
      <button onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <span className={cn('truncate text-[13.5px]', task.completed ? 'text-ink-faint line-through' : 'text-ink')}>
          {task.name}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {(task.tags ?? []).slice(0, 2).map((t) => (
          <span key={t.id} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: t.color + '22', color: t.color }}>
            {t.name}
          </span>
        ))}
        <PriorityPicker priority={task.priority} onChange={(p) => updateTask({ priority: p })} />
        <DatePickerButton date={task.due_date} completed={task.completed} onChange={(d) => updateTask({ due_date: d })} />
      </div>
      <AssigneePicker assignee={task.assignee} onChange={(id) => updateTask({ assignee_id: id })} size={24} />
    </div>
  );
}

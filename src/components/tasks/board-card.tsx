'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskPanel } from '@/lib/task-panel-context';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { PRIORITY_META, cn, isOverdue } from '@/lib/utils';
import { format } from 'date-fns';
import type { ProjectTask } from '@/hooks/use-tasks';

export function BoardCard({ task, onToggleComplete }: { task: ProjectTask; onToggleComplete: (v: boolean) => void }) {
  const { openTask } = useTaskPanel();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const overdue = isOverdue(task.due_date, task.completed);
  const meta = task.priority ? PRIORITY_META[task.priority] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className="group cursor-pointer rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-border-strong hover:shadow-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-[13px] leading-snug', task.completed ? 'text-ink-faint line-through' : 'text-ink')}>{task.name}</span>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={task.completed} onCheckedChange={(v) => onToggleComplete(!!v)} />
        </div>
      </div>

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <span key={t.id} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: t.color + '22', color: t.color }}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {task.due_date && (
            <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-medium', overdue ? 'bg-red-50 text-red-600' : 'bg-surface-hover text-ink-muted')}>
              {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}
            </span>
          )}
          {meta && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} title={meta.label} />}
        </div>
        {task.assignee && (
          <Avatar name={task.assignee.full_name} email={task.assignee.email} color={task.assignee.avatar_color} src={task.assignee.avatar_url} size={22} />
        )}
      </div>
    </div>
  );
}

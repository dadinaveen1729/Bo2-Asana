'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTaskPanel } from '@/lib/task-panel-context';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ProjectTask } from '@/hooks/use-tasks';

// Renders only the "Name" cell (drag handle, checkbox, name, tags). The
// fixed-width columns that follow it (Assignee, Priority, Due date, any
// custom fields) are rendered by the parent as sibling grid cells sharing
// the same grid-template-columns, so header and row line up exactly —
// this used to try to lay itself out with flex-1 + shrink-0 clusters,
// which had no relationship to the header's declared column widths and
// left a large gap before the trailing badges.
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: dragDisabled });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex min-w-0 items-center gap-2 py-2 pl-3 pr-2">
      <button
        {...(dragDisabled ? {} : { ...attributes, ...listeners })}
        className={cn('shrink-0 text-ink-faint', dragDisabled ? 'invisible' : 'cursor-grab')}
      >
        <GripVertical size={14} />
      </button>
      <Checkbox checked={task.completed} onCheckedChange={(v) => onToggleComplete(!!v)} />
      <button onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <span className={cn('block truncate text-[13.5px]', task.completed ? 'text-ink-faint line-through' : 'text-ink')}>
          {task.name}
        </span>
      </button>
      {task.tags.length > 0 && (
        <div className="flex shrink-0 items-center gap-1">
          {task.tags.slice(0, 2).map((t) => (
            <span key={t.id} className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: t.color + '22', color: t.color }}>
              {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

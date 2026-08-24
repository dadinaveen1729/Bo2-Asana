'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useMyTasks } from '@/hooks/use-my-tasks';
import { SimpleTaskRow } from '@/components/tasks/simple-task-row';
import { createClient } from '@/lib/supabase/client';
import { isOverdue } from '@/lib/utils';
import { format, isToday, isWithinInterval, addDays, startOfDay } from 'date-fns';

export default function MyTasksPage() {
  const { user, workspace, profile } = useWorkspace();
  const { tasks } = useMyTasks(user?.id, workspace?.id);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [adding, setAdding] = useState(false);

  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const weekEnd = addDays(today, 7);
    const active = tasks.filter((t) => !t.completed);
    const completed = tasks.filter((t) => t.completed);

    const overdue = active.filter((t) => isOverdue(t.due_date, false));
    const dueToday = active.filter((t) => t.due_date && isToday(new Date(t.due_date + 'T00:00:00')));
    const upcoming = active.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date + 'T00:00:00');
      return !isOverdue(t.due_date, false) && !isToday(d) && isWithinInterval(d, { start: today, end: weekEnd });
    });
    const later = active.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date + 'T00:00:00');
      return d > weekEnd;
    });
    const noDate = active.filter((t) => !t.due_date);

    return { overdue, dueToday, upcoming, later, noDate, completed };
  }, [tasks]);

  async function handleAdd() {
    if (!newTaskName.trim() || !workspace || !user) return;
    const supabase = createClient();
    await supabase.from('tasks').insert({ workspace_id: workspace.id, name: newTaskName.trim(), assignee_id: user.id, created_by: user.id });
    setNewTaskName('');
    setAdding(false);
  }

  const sections = [
    { key: 'overdue', label: 'Overdue', tasks: groups.overdue, color: 'text-red-600' },
    { key: 'today', label: 'Today', tasks: groups.dueToday, color: 'text-ink' },
    { key: 'upcoming', label: 'Upcoming (7 days)', tasks: groups.upcoming, color: 'text-ink' },
    { key: 'later', label: 'Later', tasks: groups.later, color: 'text-ink' },
    { key: 'nodate', label: 'No due date', tasks: groups.noDate, color: 'text-ink' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="text-2xl font-semibold text-ink">My tasks</h1>
      <p className="mt-0.5 text-sm text-ink-muted">Everything assigned to {profile?.full_name?.split(' ')[0] || 'you'} across the workspace.</p>

      <div className="mt-6 space-y-6">
        {sections.map((sec) =>
          sec.tasks.length > 0 ? (
            <div key={sec.key}>
              <h2 className={`mb-1.5 text-[13px] font-semibold ${sec.color}`}>{sec.label} <span className="text-ink-faint">({sec.tasks.length})</span></h2>
              <div className="overflow-hidden rounded-xl border border-border">
                {sec.tasks.map((t) => <SimpleTaskRow key={t.id} task={t} />)}
              </div>
            </div>
          ) : null
        )}

        <div>
          {adding ? (
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <Plus size={14} className="text-ink-faint" />
              <input
                autoFocus
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                onBlur={() => !newTaskName.trim() && setAdding(false)}
                placeholder="Task name"
                className="flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-ink-faint"
              />
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-xl border border-dashed border-border-strong px-3 py-2 text-sm text-ink-faint hover:bg-surface-hover">
              <Plus size={14} /> Add a personal task
            </button>
          )}
        </div>

        {groups.completed.length > 0 && (
          <div>
            <button onClick={() => setShowCompleted((s) => !s)} className="mb-1.5 text-[13px] font-semibold text-ink-faint hover:text-ink-muted">
              {showCompleted ? 'Hide' : 'Show'} completed ({groups.completed.length})
            </button>
            {showCompleted && (
              <div className="overflow-hidden rounded-xl border border-border">
                {groups.completed.map((t) => <SimpleTaskRow key={t.id} task={t} />)}
              </div>
            )}
          </div>
        )}

        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-ink-muted">Nothing assigned to you yet. Enjoy the calm.</p>
          </div>
        )}
      </div>
    </div>
  );
}

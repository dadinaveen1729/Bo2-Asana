'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Hash, ArrowRight } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useMyTasks } from '@/hooks/use-my-tasks';
import { useProjects } from '@/hooks/use-teams-projects';
import { SimpleTaskRow } from '@/components/tasks/simple-task-row';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { PROJECT_STATUS_META, isOverdue } from '@/lib/utils';
import { isToday } from 'date-fns';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { profile, workspace, user } = useWorkspace();
  const { tasks } = useMyTasks(user?.id, workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const [createOpen, setCreateOpen] = useState(false);

  const priorityTasks = useMemo(() => {
    const active = tasks.filter((t) => !t.completed);
    const overdue = active.filter((t) => isOverdue(t.due_date, false));
    const today = active.filter((t) => t.due_date && isToday(new Date(t.due_date + 'T00:00:00')));
    const rest = active.filter((t) => !overdue.includes(t) && !today.includes(t));
    return [...overdue, ...today, ...rest].slice(0, 6);
  }, [tasks]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-[26px] font-semibold text-ink">{greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
      <p className="mt-1 text-sm text-ink-muted">Here's what's happening across {workspace?.name}.</p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">My tasks</h2>
            <Link href="/my-tasks" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {priorityTasks.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border">
              {priorityTasks.map((t) => <SimpleTaskRow key={t.id} task={t} showProject={false} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
              You're all caught up.
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Projects</h2>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Plus size={12} /> New project
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects.slice(0, 8).map((p) => {
              const statusMeta = PROJECT_STATUS_META[p.status];
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="rounded-xl border border-border bg-white p-4 transition hover:border-border-strong hover:shadow-panel">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: (p.color || '#FC636B') + '22' }}>
                      <Hash size={15} style={{ color: p.color || '#FC636B' }} />
                    </span>
                    <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                </Link>
              );
            })}
            <button
              onClick={() => setCreateOpen(true)}
              className="flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-ink-faint hover:bg-surface-hover"
            >
              <Plus size={16} />
              <span className="text-xs font-medium">New project</span>
            </button>
          </div>
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => {}} />
    </div>
  );
}

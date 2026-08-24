'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus, Hash, ArrowRight, ChevronDown, Settings2, Rocket, Zap, FolderKanban, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/workspace-context';
import { useMyTasks } from '@/hooks/use-my-tasks';
import { useProjects } from '@/hooks/use-teams-projects';
import { SimpleTaskRow } from '@/components/tasks/simple-task-row';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { QuickAddTaskDialog } from '@/components/tasks/quick-add-task-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROJECT_STATUS_META, isOverdue } from '@/lib/utils';
import { isThisWeek, format } from 'date-fns';
import type { MyTask } from '@/hooks/use-my-tasks';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const LEARN_CARDS = [
  {
    icon: Rocket,
    color: '#6C5CE7',
    duration: '3 min',
    title: 'Getting started',
    description: 'Learn the basics and see how BoostFlow helps you get work done.',
  },
  {
    icon: Zap,
    color: '#F2994A',
    duration: '5 min read',
    title: 'Maximize productivity',
    description: 'Learn how to organize, prioritize, and track your daily work.',
  },
  {
    icon: FolderKanban,
    color: '#2FBF9F',
    duration: '5 min read',
    title: 'Build your first project',
    description: 'Create tasks, assign owners, and set due dates.',
  },
  {
    icon: Users,
    color: '#EB5E9C',
    duration: '2 min',
    title: 'Invite your team',
    description: 'Bring your teammates in so everyone stays in sync.',
  },
] as const;

function taskDueTime(t: MyTask) {
  return t.due_date ? new Date(t.due_date + 'T00:00:00').getTime() : Infinity;
}

export default function HomePage() {
  const { profile, workspace, user, members } = useWorkspace();
  const { tasks } = useMyTasks(user?.id, workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [taskTab, setTaskTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [weekOnly, setWeekOnly] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const upcomingTasks = useMemo(() => {
    let list = tasks.filter((t) => !t.completed && t.due_date && !isOverdue(t.due_date, t.completed));
    if (weekOnly) {
      list = list.filter((t) => t.due_date && isThisWeek(new Date(t.due_date + 'T00:00:00'), { weekStartsOn: 1 }));
    }
    return [...list].sort((a, b) => taskDueTime(a) - taskDueTime(b));
  }, [tasks, weekOnly]);

  const overdueTasks = useMemo(() => {
    return [...tasks.filter((t) => isOverdue(t.due_date, t.completed))].sort((a, b) => taskDueTime(a) - taskDueTime(b));
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return [...tasks.filter((t) => t.completed)].sort(
      (a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
    );
  }, [tasks]);

  const completedThisWeek = useMemo(
    () => tasks.filter((t) => t.completed && t.completed_at && isThisWeek(new Date(t.completed_at), { weekStartsOn: 1 })).length,
    [tasks]
  );

  const collaborators = useMemo(() => members.filter((m) => m.id !== user?.id), [members, user?.id]);
  const collaboratorsCount = collaborators.length;
  const frequentCollaborators = collaborators.slice(0, 5);

  const activeTasks = taskTab === 'upcoming' ? upcomingTasks : taskTab === 'overdue' ? overdueTasks : completedTasks;
  const emptyText =
    taskTab === 'upcoming'
      ? "You're all caught up."
      : taskTab === 'overdue'
        ? 'No overdue tasks. Nice work!'
        : 'No completed tasks yet.';

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="mt-1 text-[26px] font-semibold text-ink">{greeting()}, {firstName}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover">
                My week <ChevronDown size={14} className="text-ink-faint" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem checked={weekOnly} onCheckedChange={setWeekOnly}>
                Show this week&apos;s tasks only
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-sm text-ink-muted">✓ {completedThisWeek} task{completedThisWeek === 1 ? '' : 's'} completed</span>
          <span className="text-sm text-ink-muted">{collaboratorsCount} collaborator{collaboratorsCount === 1 ? '' : 's'}</span>

          <button
            onClick={() => toast('Customize is coming soon')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            <Settings2 size={14} /> Customize
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">My tasks</h2>
            <Link href="/my-tasks" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <Tabs value={taskTab} onValueChange={(v) => setTaskTab(v as typeof taskTab)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={taskTab} className="mt-3">
              {activeTasks.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  {activeTasks.slice(0, 8).map((t) => (
                    <SimpleTaskRow key={t.id} task={t} showProject={false} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">
                  {emptyText}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <button
            onClick={() => setQuickAddOpen(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2 text-xs font-medium text-ink-faint hover:bg-surface-hover hover:text-ink-muted"
          >
            <Plus size={13} /> Create task
          </button>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Projects</h2>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Plus size={12} /> New project
            </button>
          </div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-faint">
            Recents <ChevronDown size={12} />
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

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-ink">People</h2>
            <p className="mb-3 mt-0.5 text-xs text-ink-faint">Frequent collaborators</p>
            {frequentCollaborators.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {frequentCollaborators.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3">
                    <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={24} />
                    <span className="text-xs font-medium text-ink">{m.full_name || m.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-faint">No other members in this workspace yet.</p>
            )}
            {collaborators.length > frequentCollaborators.length && (
              <Link href="/people" className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">
                Show more
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-ink">Learn BoostFlow</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {LEARN_CARDS.map((c) => (
            <div key={c.title} className="w-60 shrink-0 rounded-xl border border-border bg-white p-4 transition hover:border-border-strong hover:shadow-panel">
              <div className="flex h-24 items-center justify-center rounded-xl" style={{ backgroundColor: c.color + '1A' }}>
                <c.icon size={28} style={{ color: c.color }} />
              </div>
              <span className="mt-3 inline-block rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-ink-faint">{c.duration}</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">{c.title}</h3>
              <p className="mt-1 text-xs text-ink-muted">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => {}} />
      <QuickAddTaskDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

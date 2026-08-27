'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import {
  Plus, Hash, ArrowRight, ChevronDown, ChevronUp, Settings2, Rocket, Zap, FolderKanban, Users, Star,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useMyTasks } from '@/hooks/use-my-tasks';
import { useProjects } from '@/hooks/use-teams-projects';
import type { Project } from '@/hooks/use-teams-projects';
import { useFavoritesDnd } from '@/app/(app)/layout';
import { SimpleTaskRow } from '@/components/tasks/simple-task-row';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { QuickAddTaskDialog } from '@/components/tasks/quick-add-task-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetCloseButton } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { PROJECT_STATUS_META, isOverdue, cn } from '@/lib/utils';
import { isThisWeek, format } from 'date-fns';
import type { MyTask } from '@/hooks/use-my-tasks';

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// A rotating, lightly Boost-Oxygen-themed one-liner under the greeting —
// picked off the date so it's stable for the whole day and identical across
// re-renders (no Math.random(), no hydration mismatch).
const DAILY_LINES = [
  "Let's turn today's to-dos into ta-das.",
  'Fresh air, fresh start.',
  'Inhale focus, exhale busywork.',
  'Small steps. Big oxygen tanks.',
  "Today's forecast: a high chance of getting things done.",
  'Breathe in. Ship it out.',
  'Your tasks are waiting. Coffee first is still allowed.',
];

function dailyLine(now: Date) {
  const dayIndex = Math.floor(now.getTime() / 86400000);
  return DAILY_LINES[dayIndex % DAILY_LINES.length];
}

function taskDueTime(t: MyTask) {
  return t.due_date ? new Date(t.due_date + 'T00:00:00').getTime() : Infinity;
}

// ---------------------------------------------------------------------------
// Home layout customization — which sections show, and in what order.
// Persisted per-user in localStorage since it's a personal display
// preference, not shared workspace data.
// ---------------------------------------------------------------------------

type HomeSectionKey = 'my_tasks' | 'projects' | 'people' | 'learn';

interface HomeLayoutSection {
  key: HomeSectionKey;
  visible: boolean;
}

const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  my_tasks: 'My tasks',
  projects: 'Projects',
  people: 'People',
  learn: 'Learn Boost Hub',
};

const DEFAULT_HOME_LAYOUT: HomeLayoutSection[] = [
  { key: 'my_tasks', visible: true },
  { key: 'projects', visible: true },
  { key: 'people', visible: true },
  { key: 'learn', visible: true },
];

function homeLayoutKey(userId: string) {
  return `boostflow-home-layout-${userId}`;
}

function loadHomeLayout(userId: string): HomeLayoutSection[] {
  try {
    const raw = window.localStorage.getItem(homeLayoutKey(userId));
    if (!raw) return DEFAULT_HOME_LAYOUT;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_HOME_LAYOUT;
    const valid = parsed.filter(
      (s): s is HomeLayoutSection => s && typeof s.key === 'string' && s.key in HOME_SECTION_LABELS && typeof s.visible === 'boolean'
    );
    const seen = new Set(valid.map((s) => s.key));
    // Merge in any section keys the saved layout predates (forward-compat).
    for (const def of DEFAULT_HOME_LAYOUT) {
      if (!seen.has(def.key)) valid.push(def);
    }
    return valid.length ? valid : DEFAULT_HOME_LAYOUT;
  } catch {
    return DEFAULT_HOME_LAYOUT;
  }
}

// ---------------------------------------------------------------------------
// Learn Boost Hub — real, accurate walkthroughs of this app's actual UI.
// ---------------------------------------------------------------------------

const LEARN_CARDS = [
  {
    key: 'getting_started',
    icon: Rocket,
    color: '#6C5CE7',
    duration: '3 min',
    title: 'Getting started',
    description: 'Learn the basics and see how Boost Hub helps you get work done.',
  },
  {
    key: 'productivity',
    icon: Zap,
    color: '#F2994A',
    duration: '5 min read',
    title: 'Maximize productivity',
    description: 'Learn how to organize, prioritize, and track your daily work.',
  },
  {
    key: 'first_project',
    icon: FolderKanban,
    color: '#2FBF9F',
    duration: '5 min read',
    title: 'Build your first project',
    description: 'Create tasks, assign owners, and set due dates.',
  },
  {
    key: 'invite_team',
    icon: Users,
    color: '#EB5E9C',
    duration: '2 min',
    title: 'Invite your team',
    description: 'Bring your teammates in so everyone stays in sync.',
  },
] as const;

function LearnDialogBody({ dialogKey }: { dialogKey: string }) {
  switch (dialogKey) {
    case 'getting_started':
      return (
        <ol className="list-decimal space-y-2.5 pl-4 text-sm text-ink-muted">
          <li>
            <span className="font-medium text-ink">Create a project.</span> Click{' '}
            <span className="font-medium text-ink">Create</span> at the top of the sidebar, then{' '}
            <span className="font-medium text-ink">New project</span>. Give it a name and color.
          </li>
          <li>
            <span className="font-medium text-ink">Add tasks.</span> Open the project and add tasks to a
            section — type a name and press Enter. Click a task&apos;s checkbox to mark it done.
          </li>
          <li>
            <span className="font-medium text-ink">Invite your team.</span> Open your profile menu at the
            bottom of the sidebar and choose <span className="font-medium text-ink">Invite teammates</span>.
          </li>
          <li>
            <span className="font-medium text-ink">Check back on Home.</span> Everything assigned to you shows
            up under <span className="font-medium text-ink">My tasks</span> here, and in the{' '}
            <span className="font-medium text-ink">My tasks</span> page in the sidebar.
          </li>
        </ol>
      );
    case 'productivity':
      return (
        <ul className="list-disc space-y-2.5 pl-4 text-sm text-ink-muted">
          <li>
            Use the <span className="font-medium text-ink">My tasks</span> page to see everything assigned to
            you across every project, split into Upcoming, Overdue, and Completed.
          </li>
          <li>
            Turn on <span className="font-medium text-ink">My week</span> on the Home page to narrow your
            upcoming list down to what&apos;s due in the next seven days.
          </li>
          <li>
            Set a <span className="font-medium text-ink">priority</span> and{' '}
            <span className="font-medium text-ink">due date</span> on each task so it sorts and surfaces
            correctly — overdue tasks are flagged automatically.
          </li>
          <li>
            Keep an eye on your <span className="font-medium text-ink">Inbox</span> for notifications when
            you&apos;re assigned a task, mentioned in a comment, or a due date is approaching.
          </li>
        </ul>
      );
    case 'first_project':
      return (
        <ol className="list-decimal space-y-2.5 pl-4 text-sm text-ink-muted">
          <li>
            Click <span className="font-medium text-ink">New project</span> from the sidebar&apos;s{' '}
            <span className="font-medium text-ink">Create</span> menu, or the shortcut on the Home page&apos;s
            Projects grid.
          </li>
          <li>
            Add <span className="font-medium text-ink">sections</span> to organize the work (e.g. To do, In
            progress, Done), then add tasks inside each one.
          </li>
          <li>
            Switch between <span className="font-medium text-ink">list</span> and{' '}
            <span className="font-medium text-ink">board</span> view from the project — on the board, drag
            tasks between sections as work moves forward.
          </li>
          <li>
            Open a task to set its <span className="font-medium text-ink">assignee</span>,{' '}
            <span className="font-medium text-ink">due date</span>, and{' '}
            <span className="font-medium text-ink">priority</span> so the right person knows what to do next.
          </li>
        </ol>
      );
    case 'invite_team':
      return (
        <ol className="list-decimal space-y-2.5 pl-4 text-sm text-ink-muted">
          <li>
            Open your profile menu at the bottom of the sidebar and choose{' '}
            <span className="font-medium text-ink">Invite teammates</span>.
          </li>
          <li>
            For bulk invites or to manage roles, go to{' '}
            <span className="font-medium text-ink">My organization</span> →{' '}
            <span className="font-medium text-ink">Admin &amp; members</span>.
          </li>
          <li>
            Once someone joins, add them to a project from that project&apos;s members, or organize people
            into a <span className="font-medium text-ink">team</span> from the sidebar&apos;s Create menu.
          </li>
          <li>
            Visit the <span className="font-medium text-ink">People</span> page any time to see everyone in
            the workspace and what they&apos;re working on.
          </li>
        </ol>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// A draggable, star-toggleable project card for the Projects grid.
// ---------------------------------------------------------------------------

function HomeProjectCard({
  project,
  favorited,
  onToggleFavorite,
}: {
  project: Project;
  favorited: boolean;
  onToggleFavorite: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { name: project.name, color: project.color },
  });
  const statusMeta = PROJECT_STATUS_META[project.status];

  return (
    <Link
      ref={setNodeRef}
      href={`/projects/${project.id}`}
      {...attributes}
      {...listeners}
      className={cn(
        'group/card relative rounded-xl border border-border bg-white p-4 transition hover:border-border-strong hover:shadow-panel',
        isDragging && 'opacity-40'
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title={favorited ? 'Unpin from sidebar' : 'Pin to sidebar'}
        className={cn(
          'absolute right-3 top-3 rounded-md p-1 opacity-0 transition group-hover/card:opacity-100',
          favorited ? 'text-amber-400 opacity-100 hover:text-amber-500' : 'text-ink-faint hover:text-ink-muted'
        )}
      >
        <Star size={14} fill={favorited ? 'currentColor' : 'none'} />
      </button>
      <div className="flex items-center gap-2 pr-5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: (project.color || '#FC636B') + '22' }}
        >
          <Hash size={15} style={{ color: project.color || '#FC636B' }} />
        </span>
        <span className="block truncate text-sm font-semibold text-ink">{project.name}</span>
      </div>
      <span
        className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
      >
        {statusMeta.label}
      </span>
    </Link>
  );
}

export default function HomePage() {
  const { profile, workspace, user, members } = useWorkspace();
  const { tasks } = useMyTasks(user?.id, workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const { favoriteProjectIds, addFavorite, removeFavorite } = useFavoritesDnd();
  const [createOpen, setCreateOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [taskTab, setTaskTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [weekOnly, setWeekOnly] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [learnDialog, setLearnDialog] = useState<(typeof LEARN_CARDS)[number] | null>(null);

  const [layout, setLayout] = useState<HomeLayoutSection[]>(DEFAULT_HOME_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  // Boost Oxygen has people across time zones, and the server renders this
  // page once on its own clock — computing "now" during render would show
  // the server's local time/greeting to everyone until hydration papers
  // over it. Deferring to a client-only effect guarantees the greeting and
  // date always reflect the viewer's own browser, not the server's.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setLayout(loadHomeLayout(user.id));
    setLayoutLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !layoutLoaded) return;
    window.localStorage.setItem(homeLayoutKey(user.id), JSON.stringify(layout));
  }, [layout, user?.id, layoutLoaded]);

  function toggleSection(key: HomeSectionKey) {
    setLayout((prev) => prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)));
  }

  function moveSection(key: HomeSectionKey, dir: -1 | 1) {
    setLayout((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

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
      ? "You're all caught up. Go touch some grass."
      : taskTab === 'overdue'
        ? 'No overdue tasks. Look at you go!'
        : 'No completed tasks yet. The first one is the hardest.';

  const visibleKeys = useMemo(() => layout.filter((s) => s.visible).map((s) => s.key), [layout]);

  // Group the classic My-tasks/Projects side-by-side row when they're still
  // adjacent in that order; anything reordered around them renders as its
  // own full-width block instead.
  const blocks = useMemo(() => {
    const result: Array<{ type: 'row' } | { type: 'single'; key: HomeSectionKey }> = [];
    for (let i = 0; i < visibleKeys.length; i++) {
      const key = visibleKeys[i];
      if (key === 'my_tasks' && visibleKeys[i + 1] === 'projects') {
        result.push({ type: 'row' });
        i++;
      } else {
        result.push({ type: 'single', key });
      }
    }
    return result;
  }, [visibleKeys]);

  function renderMyTasks() {
    return (
      <div>
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
    );
  }

  function renderProjects() {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Projects</h2>
          <div className="flex items-center gap-3">
            <Link href="/projects" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight size={12} />
            </Link>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              <Plus size={12} /> New project
            </button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-faint">
          Recents <ChevronDown size={12} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.slice(0, 8).map((p) => (
            <HomeProjectCard
              key={p.id}
              project={p}
              favorited={favoriteProjectIds.has(p.id)}
              onToggleFavorite={() => (favoriteProjectIds.has(p.id) ? removeFavorite(p.id) : addFavorite(p.id))}
            />
          ))}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-ink-faint hover:bg-surface-hover"
          >
            <Plus size={16} />
            <span className="text-xs font-medium">New project</span>
          </button>
        </div>
      </div>
    );
  }

  function renderPeople() {
    return (
      <div>
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
          <p className="text-xs text-ink-faint">No other members yet. It's a little lonely in here.</p>
        )}
        {collaborators.length > frequentCollaborators.length && (
          <Link href="/people" className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">
            Show more
          </Link>
        )}
      </div>
    );
  }

  function renderLearn() {
    return (
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink">Learn Boost Hub</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {LEARN_CARDS.map((c) => (
            <button
              key={c.key}
              onClick={() => setLearnDialog(c)}
              className="w-60 shrink-0 rounded-xl border border-border bg-white p-4 text-left transition hover:border-border-strong hover:shadow-panel"
            >
              <div className="flex h-24 items-center justify-center rounded-xl" style={{ backgroundColor: c.color + '1A' }}>
                <c.icon size={28} style={{ color: c.color }} />
              </div>
              <span className="mt-3 inline-block rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-ink-faint">{c.duration}</span>
              <h3 className="mt-2 text-sm font-semibold text-ink">{c.title}</h3>
              <p className="mt-1 text-xs text-ink-muted">{c.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{now ? format(now, 'EEEE, MMMM d') : ' '}</p>
          <h1 className="mt-1 text-[26px] font-semibold text-ink">{now ? greeting(now) : 'Welcome'}, {firstName}</h1>
          {now && <p className="mt-1 text-sm text-ink-faint">{dailyLine(now)}</p>}
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
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            <Settings2 size={14} /> Customize
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {blocks.map((b) => {
          if (b.type === 'row') {
            return (
              <div key="row" className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                <div className="lg:col-span-2">{renderMyTasks()}</div>
                <div className="lg:col-span-3">{renderProjects()}</div>
              </div>
            );
          }
          return (
            <div key={b.key}>
              {b.key === 'my_tasks' && renderMyTasks()}
              {b.key === 'projects' && renderProjects()}
              {b.key === 'people' && renderPeople()}
              {b.key === 'learn' && renderLearn()}
            </div>
          );
        })}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => {}} />
      <QuickAddTaskDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent width={380}>
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <SheetTitle className="text-base font-semibold text-ink">Customize Home</SheetTitle>
              <SheetDescription className="mt-0.5 text-[13px] text-ink-muted">
                Show, hide, and reorder the sections on your Home page.
              </SheetDescription>
            </div>
            <SheetCloseButton />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              {layout.map((s, i) => (
                <div key={s.key} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col text-ink-faint">
                      <button
                        onClick={() => moveSection(s.key, -1)}
                        disabled={i === 0}
                        className="rounded hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-25"
                        title="Move up"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={() => moveSection(s.key, 1)}
                        disabled={i === layout.length - 1}
                        className="rounded hover:bg-surface-hover hover:text-ink disabled:pointer-events-none disabled:opacity-25"
                        title="Move down"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-ink">{HOME_SECTION_LABELS[s.key]}</span>
                  </div>
                  <Switch checked={s.visible} onCheckedChange={() => toggleSection(s.key)} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              Changes apply immediately and are saved to this browser for your account.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!learnDialog} onOpenChange={(v) => !v && setLearnDialog(null)}>
        <DialogContent className="max-w-md">
          {learnDialog && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: learnDialog.color + '1A' }}
                  >
                    <learnDialog.icon size={16} style={{ color: learnDialog.color }} />
                  </span>
                  <DialogTitle>{learnDialog.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="px-6 pb-6 pt-3">
                <LearnDialogBody dialogKey={learnDialog.key} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

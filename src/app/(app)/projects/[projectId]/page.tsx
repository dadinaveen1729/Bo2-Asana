'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  List, Kanban, Calendar as CalendarIcon, GanttChart, ChevronDown, Lock, Globe2,
  Settings2, Plus, UserPlus, Loader2, Zap, Info, BarChart3, MessageSquare, Paperclip,
} from 'lucide-react';
import { useProject } from '@/hooks/use-teams-projects';
import { useCustomFields } from '@/hooks/use-custom-fields';
import { useWorkspace } from '@/lib/workspace-context';
import { ListView } from '@/components/projects/list-view';
import { BoardView } from '@/components/projects/board-view';
import { CalendarView } from '@/components/projects/calendar-view';
import { TimelineView } from '@/components/projects/timeline-view';
import { ProjectOverview } from '@/components/projects/project-overview';
import { ProjectFiles } from '@/components/projects/project-files';
import { ProjectDashboard } from '@/components/projects/project-dashboard';
import { CreateCustomFieldDialog } from '@/components/projects/create-custom-field-dialog';
import { ProjectMembersPopover } from '@/components/projects/project-members-popover';
import { AutomationRulesDialog } from '@/components/projects/automation-rules-dialog';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PROJECT_STATUS_META, cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Info },
  { key: 'list', label: 'List', icon: List },
  { key: 'board', label: 'Board', icon: Kanban },
  { key: 'timeline', label: 'Timeline', icon: GanttChart },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'files', label: 'Files', icon: Paperclip },
] as const;

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  return (
    <Suspense fallback={null}>
      <ProjectPageInner params={params} />
    </Suspense>
  );
}

function ProjectPageInner({ params }: { params: { projectId: string } }) {
  const { project, loading } = useProject(params.projectId);
  const { fields, createField } = useCustomFields(params.projectId);
  const { workspace } = useWorkspace();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const view = (searchParams.get('view') as (typeof TABS)[number]['key']) || (project?.default_view as any) || 'list';

  function setView(v: string) {
    router.push(`/projects/${params.projectId}?view=${v}`);
  }

  if (loading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={20} />
      </div>
    );
  }

  const statusMeta = PROJECT_STATUS_META[project.status];
  const supabase = createClient();

  async function updateProject(patch: Record<string, unknown>) {
    const { error } = await supabase.from('projects').update(patch).eq('id', project!.id);
    if (error) toast.error(error.message);
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('projects').delete().eq('id', project!.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Project deleted');
    router.push('/projects');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color || '#FC636B' }} />
          {nameDraft !== null ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={async () => {
                if (nameDraft.trim() && nameDraft !== project.name) await supabase.from('projects').update({ name: nameDraft.trim() }).eq('id', project.id);
                setNameDraft(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="rounded border border-brand-300 bg-white px-1 text-xl font-semibold text-ink outline-none"
            />
          ) : (
            <button onClick={() => setNameDraft(project.name)} className="text-xl font-semibold text-ink hover:text-ink">
              {project.name}
            </button>
          )}
          {project.privacy === 'private' ? <Lock size={14} className="text-ink-faint" /> : <Globe2 size={14} className="text-ink-faint" />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
              >
                {statusMeta.label} <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(PROJECT_STATUS_META).map(([key, m]) => (
                <DropdownMenuItem key={key} onSelect={() => updateProject({ status: key })}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} /> {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            <ProjectMembersPopover projectId={project.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover">
                  <Settings2 size={13} /> Customize
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <p className="px-2.5 py-1 text-[11px] font-semibold uppercase text-ink-faint">Custom fields</p>
                {fields.map((f) => (
                  <div key={f.id} className="px-2.5 py-1 text-sm text-ink">{f.name}</div>
                ))}
                <DropdownMenuItem onSelect={() => setFieldDialogOpen(true)}>
                  <Plus size={14} /> Add field
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setRulesDialogOpen(true)}>
                  <Zap size={14} /> Automation rules
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => updateProject({ privacy: project.privacy === 'public' ? 'private' : 'public' })}
                >
                  {project.privacy === 'public' ? <Lock size={14} /> : <Globe2 size={14} />}
                  Make {project.privacy === 'public' ? 'private' : 'team-wide'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 data-[highlighted]:bg-red-50"
                  onSelect={() => { updateProject({ archived: true }); router.push('/projects'); }}
                >
                  Archive project
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 data-[highlighted]:bg-red-50"
                  onSelect={() => setDeleteOpen(true)}
                >
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
                view === t.key ? 'border-brand-500 text-ink' : 'border-transparent text-ink-muted hover:text-ink'
              )}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {view === 'overview' && <ProjectOverview project={project} onUpdate={updateProject} />}
        {view === 'list' && <ListView projectId={project.id} onAddColumn={() => setFieldDialogOpen(true)} />}
        {view === 'board' && <BoardView projectId={project.id} />}
        {view === 'timeline' && <TimelineView projectId={project.id} />}
        {view === 'dashboard' && <ProjectDashboard projectId={project.id} />}
        {view === 'calendar' && <CalendarView projectId={project.id} />}
        {view === 'messages' && <MessagesComingSoon />}
        {view === 'files' && <ProjectFiles projectId={project.id} />}
      </div>

      <CreateCustomFieldDialog
        open={fieldDialogOpen}
        onOpenChange={setFieldDialogOpen}
        onCreate={(name, type, options) => (workspace ? createField(workspace.id, name, type, options) : Promise.resolve(null))}
      />
      <AutomationRulesDialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen} projectId={project.id} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete "{project.name}"?</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-2 text-sm text-ink-muted">
            This permanently deletes the project and every task, section, and attachment in it. This can't be undone —
            if you just want to hide it instead, use Archive.
          </div>
          <DialogFooter>
            <button onClick={() => setDeleteOpen(false)} className="rounded-lg px-3.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Delete permanently
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// TODO: Project-level messaging needs new backend infrastructure (a project_messages
// table, realtime channel, participant/read-state tracking) that doesn't exist yet —
// out of scope for a UI-only pass. Task comments (see task-detail-panel.tsx /
// use-task-detail.ts) already cover per-task discussion in the meantime.
function MessagesComingSoon() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <MessageSquare size={28} className="mb-3 text-ink-faint" />
      <p className="text-sm font-medium text-ink">Messages coming soon</p>
      <p className="mt-1 max-w-xs text-[13px] text-ink-faint">
        Project-level conversations aren&apos;t available yet. Use task comments in the meantime.
      </p>
    </div>
  );
}

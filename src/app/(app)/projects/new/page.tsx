'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown, Import, MessageSquareText, Pencil, Plus, Sparkles, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/workspace-context';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { PROJECT_TEMPLATES, TEMPLATE_CATEGORIES, MORE_CATEGORIES, type ProjectTemplate } from '@/lib/project-templates';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function NewProjectPage() {
  return (
    <Suspense fallback={null}>
      <TemplateGallery />
    </Suspense>
  );
}

function TemplateGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('team');
  const { workspace, user } = useWorkspace();
  const [category, setCategory] = useState<string>('for-you');
  const [query, setQuery] = useState('');
  const [blankOpen, setBlankOpen] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = PROJECT_TEMPLATES;
    if (!['for-you', 'my-organization'].includes(category)) {
      list = list.filter((t) => t.category === category);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.greatFor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [category, query]);

  async function createFromTemplate(template: ProjectTemplate) {
    if (!workspace || !user) return;
    setCreatingId(template.id);
    const supabase = createClient();
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspace.id,
        team_id: teamId || null,
        name: template.name,
        color: template.color,
        privacy: 'public',
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !project) {
      toast.error(error?.message || 'Could not create project.');
      setCreatingId(null);
      return;
    }

    await supabase.from('project_members').insert({ project_id: project.id, user_id: user.id, role: 'owner' });
    await supabase
      .from('sections')
      .insert(template.sections.map((name, i) => ({ project_id: project.id, name, position: (i + 1) * 1000 })));

    setCreatingId(null);
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-ink">Template gallery</h1>
        <div className="flex items-center gap-2">
          <a
            href="mailto:naveen@boostoxygen.com?subject=BoostFlow%20feedback"
            className="hidden text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline"
          >
            Send feedback
          </a>
          <button
            onClick={() => document.getElementById('describe-work-input')?.focus()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            <Sparkles size={14} /> Create with AI
          </button>
          <button
            onClick={() => router.push('/projects/import')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            <Import size={14} /> Import
          </button>
          <button
            onClick={() => setBlankOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus size={14} /> Blank project
          </button>
          <button onClick={() => router.back()} className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-hover hover:text-ink">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
              category === c.key ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-border text-ink-muted hover:bg-surface-hover'
            )}
          >
            {c.label}
          </button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
                MORE_CATEGORIES.some((c) => c.key === category) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-border text-ink-muted hover:bg-surface-hover'
              )}
            >
              More <ChevronDown size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {MORE_CATEGORIES.map((c) => (
              <DropdownMenuItem key={c.key} onSelect={() => setCategory(c.key)}>{c.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-hover/40 px-6 py-10 text-center">
          <Pencil size={26} className="text-ink-faint" />
          <div>
            <p className="text-[15px] font-semibold text-ink">Start something new</p>
            <p className="mt-0.5 text-sm text-ink-muted">Create a new project or template to get work moving</p>
          </div>
          <button
            onClick={() => setBlankOpen(true)}
            className="mt-1 flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-hover"
          >
            <Plus size={14} /> Create blank project
          </button>
        </div>

        <div className="rounded-xl border border-border p-5">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink"><MessageSquareText size={16} className="text-brand-500" /> Get templates that fit how you work</p>
          <p className="mt-0.5 text-sm text-ink-muted">Describe what you do in a few words</p>
          <input
            id="describe-work-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. I run operations for a beverage company"
            className="mt-3 w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-[15px] font-semibold text-ink">Popular with all teams</h2>
        <p className="mt-0.5 text-sm text-ink-muted">Help your teams track, plan, and deliver impactful work</p>
        {filtered.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border py-10 text-center text-sm text-ink-muted">
            No templates in this category yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <button
                key={t.id}
                disabled={creatingId !== null}
                onClick={() => createFromTemplate(t)}
                className="flex flex-col items-start rounded-xl border border-border bg-white p-4 text-left transition hover:border-border-strong hover:shadow-panel disabled:opacity-60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: t.color + '22' }}>
                  <t.icon size={17} style={{ color: t.color }} />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">{t.name}</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-muted">{t.description}</p>
                <span className="mt-3 rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                  Great for {t.greatFor}
                </span>
                {creatingId === t.id && <span className="mt-2 text-[11px] text-brand-600">Creating…</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={blankOpen} onOpenChange={setBlankOpen} defaultTeamId={teamId} onCreated={(id) => router.push(`/projects/${id}`)} />
    </div>
  );
}

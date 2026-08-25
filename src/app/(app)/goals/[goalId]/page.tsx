'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, MoreHorizontal, Plus, Target, Trash2, X } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useGoals } from '@/hooks/use-goals';
import { useProjects } from '@/hooks/use-teams-projects';
import { createClient } from '@/lib/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { PROJECT_STATUS_META } from '@/lib/utils';

const STATUS_OPTIONS = ['not_started', 'on_track', 'at_risk', 'off_track', 'achieved', 'missed'];

export default function GoalDetailPage({ params }: { params: { goalId: string } }) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { goals, updateGoal, addProject, removeProject } = useGoals(workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const [q, setQ] = useState('');
  const [desc, setDesc] = useState<string | null>(null);

  const goal = goals.find((g) => g.id === params.goalId);
  if (!goal) return null;

  const linkedIds = new Set(goal.projects.map((p) => p.id));
  const available = projects.filter((p) => !linkedIds.has(p.id) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <button onClick={() => router.push('/goals')} className="mb-4 flex items-center gap-1 text-xs font-medium text-ink-faint hover:text-ink-muted">
        <ChevronLeft size={13} /> Goals
      </button>

      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
          <Target size={18} className="text-brand-500" />
        </span>
        <h1 className="text-2xl font-semibold text-ink">{goal.name}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-auto rounded-md p-2 text-ink-faint hover:bg-surface-hover"><MoreHorizontal size={16} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 data-[highlighted]:bg-red-50"
              onSelect={async () => {
                const supabase = createClient();
                await supabase.from('goals').delete().eq('id', goal.id);
                router.push('/goals');
              }}
            >
              <Trash2 size={13} /> Delete goal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Select value={goal.status} onValueChange={(v) => updateGoal(goal.id, { status: v as any })}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-faint">Progress</span>
          <input
            type="range"
            min={0}
            max={100}
            value={goal.progress}
            onChange={(e) => updateGoal(goal.id, { progress: Number(e.target.value) })}
            className="w-32 accent-brand-500"
          />
          <span className="w-9 text-sm font-medium text-ink">{Math.round(goal.progress)}%</span>
        </div>

        {goal.owner && (
          <div className="flex items-center gap-1.5">
            <Avatar name={goal.owner.full_name} email={goal.owner.email} color={goal.owner.avatar_color} src={goal.owner.avatar_url} size={22} />
            <span className="text-sm text-ink-muted">{goal.owner.full_name}</span>
          </div>
        )}
      </div>

      <div className="mt-5">
        <textarea
          defaultValue={goal.description || ''}
          onBlur={(e) => updateGoal(goal.id, { description: e.target.value || null })}
          placeholder="Add a description..."
          rows={3}
          className="w-full resize-none rounded-lg border border-border px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Connected projects</h2>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover">
              <Plus size={13} /> Add project
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects..."
              className="mb-1.5 w-full rounded-md border border-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-400"
            />
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {available.map((p) => (
                <button key={p.id} onClick={() => addProject(goal.id, p.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || '#FC636B' }} />
                  <span className="block truncate">{p.name}</span>
                </button>
              ))}
              {available.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-faint">No projects found</p>}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        {goal.projects.map((p) => {
          const meta = PROJECT_STATUS_META[p.status];
          return (
            <div key={p.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-hover">
              <Link href={`/projects/${p.id}`} className="flex flex-1 items-center gap-2 truncate text-sm font-medium text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color || '#FC636B' }} />
                {p.name}
              </Link>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
              <button onClick={() => removeProject(goal.id, p.id)} className="text-ink-faint hover:text-ink"><X size={14} /></button>
            </div>
          );
        })}
        {goal.projects.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-faint">No projects connected yet.</p>}
      </div>
    </div>
  );
}

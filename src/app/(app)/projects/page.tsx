'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Hash, Plus, Search, Star } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useTeams, useProjects } from '@/hooks/use-teams-projects';
import { createClient } from '@/lib/supabase/client';
import { useFavoritesDnd } from '@/app/(app)/layout';
import { AvatarStack } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PROJECT_STATUS_META, cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Row {
  projectId: string;
  members: { name?: string | null; email?: string | null; color?: string | null; src?: string | null }[];
  portfolioNames: string[];
}

export default function BrowseProjectsPage() {
  const router = useRouter();
  const { workspace, members } = useWorkspace();
  const { teams } = useTeams(workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const { favoriteProjectIds, addFavorite, removeFavorite } = useFavoritesDnd();
  const [query, setQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);
  const [rows, setRows] = useState<Record<string, Row>>({});

  useEffect(() => {
    if (projects.length === 0) return;
    const supabase = createClient();
    const ids = projects.map((p) => p.id);

    (async () => {
      const [memberRowsRes, portfolioRowsRes] = await Promise.all([
        supabase.from('project_members').select('project_id, user_id').in('project_id', ids),
        supabase.from('portfolio_projects').select('project_id, portfolios(name)').in('project_id', ids),
      ]);

      const byId = new Map(members.map((m) => [m.id, m]));
      const next: Record<string, Row> = {};
      for (const id of ids) next[id] = { projectId: id, members: [], portfolioNames: [] };

      for (const row of memberRowsRes.data || []) {
        const p = byId.get(row.user_id);
        if (p) next[row.project_id]?.members.push({ name: p.full_name, email: p.email, color: p.avatar_color, src: p.avatar_url });
      }
      for (const row of portfolioRowsRes.data || []) {
        const name = (row as any).portfolios?.name;
        if (name) next[row.project_id]?.portfolioNames.push(name);
      }
      setRows(next);
    })();
  }, [projects, members]);

  const filtered = useMemo(() => {
    let list = projects;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    if (teamFilter !== 'all') list = list.filter((p) => p.team_id === teamFilter);
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    return [...list].sort((a, b) => {
      const diff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return sortAsc ? -diff : diff;
    });
  }, [projects, query, teamFilter, statusFilter, sortAsc]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Browse projects</h1>
        <button
          onClick={() => router.push('/projects/new')}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus size={15} /> Create project
        </button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a project"
          className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Teams" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(PROJECT_STATUS_META).map(([key, m]) => (
              <SelectItem key={key} value={key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[24px_1fr_140px_160px_120px] items-center gap-3 border-b border-border bg-surface-hover/50 px-4 py-2 text-[12px] font-semibold text-ink-faint">
          <span aria-hidden />
          <span>Name</span>
          <span>Members</span>
          <span>Portfolios</span>
          <button onClick={() => setSortAsc((s) => !s)} className="flex items-center gap-1 hover:text-ink-muted">
            <ArrowUpDown size={11} /> Last modified
          </button>
        </div>
        {filtered.map((p) => {
          const row = rows[p.id];
          const meta = PROJECT_STATUS_META[p.status];
          const favorited = favoriteProjectIds.has(p.id);
          return (
            <div key={p.id} className="grid grid-cols-[24px_1fr_140px_160px_120px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-hover">
              <button
                type="button"
                onClick={() => (favorited ? removeFavorite(p.id) : addFavorite(p.id))}
                title={favorited ? 'Unpin from sidebar' : 'Pin to sidebar'}
                className={cn('rounded-md p-0.5 transition', favorited ? 'text-amber-400 hover:text-amber-500' : 'text-ink-faint hover:text-ink-muted')}
              >
                <Star size={14} fill={favorited ? 'currentColor' : 'none'} />
              </button>
              <Link href={`/projects/${p.id}`} className="flex min-w-0 items-center gap-2">
                <Hash size={14} className="shrink-0" style={{ color: p.color || '#FC636B' }} />
                <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                <span className="ml-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
              </Link>
              <AvatarStack people={row?.members || []} size={22} max={4} />
              <div className="flex flex-wrap gap-1">
                {(row?.portfolioNames || []).slice(0, 2).map((n) => (
                  <span key={n} className="block truncate rounded-full bg-surface-hover px-2 py-0.5 text-[11px] text-ink-faint">{n}</span>
                ))}
              </div>
              <span className="text-xs text-ink-faint">{format(new Date(p.updated_at), 'MMM d, yyyy')}</span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-ink-muted">No projects match your filters. Let's clear the air and loosen a few.</p>
        )}
      </div>
    </div>
  );
}

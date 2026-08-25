'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useTeams, useProjects } from '@/hooks/use-teams-projects';
import { createClient } from '@/lib/supabase/client';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { PROJECT_STATUS_META } from '@/lib/utils';
import type { Tables } from '@/types/database';

export default function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const router = useRouter();
  const { workspace, members } = useWorkspace();
  const { teams } = useTeams(workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const supabase = createClient();

  const team = teams.find((t) => t.id === params.teamId);
  const teamProjects = projects.filter((p) => p.team_id === params.teamId);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('team_members').select('user_id').eq('team_id', params.teamId);
      setMemberIds((data || []).map((m) => m.user_id));
    }
    load();
    const channel = supabase
      .channel(`team-members:${params.teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${params.teamId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [params.teamId]);

  if (!team) return null;

  const teamMembers = members.filter((m) => memberIds.includes(m.id));

  async function toggleMember(userId: string) {
    if (memberIds.includes(userId)) {
      await supabase.from('team_members').delete().eq('team_id', params.teamId).eq('user_id', userId);
    } else {
      await supabase.from('team_members').insert({ team_id: params.teamId, user_id: userId });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: team.color || '#6C5CE7' }}>
          {team.name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{team.name}</h1>
          {team.description && <p className="text-sm text-ink-muted">{team.description}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-auto rounded-md p-2 text-ink-faint hover:bg-surface-hover"><MoreHorizontal size={16} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 data-[highlighted]:bg-red-50"
              onSelect={async () => { await supabase.from('teams').delete().eq('id', team.id); router.push('/home'); }}
            >
              <Trash2 size={13} /> Delete team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center">
              {teamMembers.length > 0 ? <AvatarStack people={teamMembers} size={26} /> : null}
              <span className="ml-2 flex h-7 items-center gap-1 rounded-full border border-dashed border-border-strong px-2 text-xs font-medium text-ink-faint hover:bg-surface-hover">
                <Users size={12} /> {teamMembers.length} members
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <p className="mb-1 px-1.5 text-xs font-semibold text-ink-faint">Team members</p>
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {members.map((m) => (
                <button key={m.id} onClick={() => toggleMember(m.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
                  <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={22} />
                  <span className="block truncate text-ink">{m.full_name || m.email}</span>
                  {memberIds.includes(m.id) && <Check size={13} className="ml-auto text-brand-500" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Projects ({teamProjects.length})</h2>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover">
          <Plus size={13} /> New project
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {teamProjects.map((p) => {
          const meta = PROJECT_STATUS_META[p.status];
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="rounded-xl border border-border bg-white p-4 transition hover:border-border-strong hover:shadow-panel">
              <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
              <div className="mt-2">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
              </div>
            </Link>
          );
        })}
        {teamProjects.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-ink-muted">
            No projects yet. This team is fresh out of the box.
          </div>
        )}
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} defaultTeamId={team.id} onCreated={(id) => router.push(`/projects/${id}`)} />
    </div>
  );
}

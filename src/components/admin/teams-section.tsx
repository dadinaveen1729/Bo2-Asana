'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTeams, type Team } from '@/hooks/use-teams-projects';
import { ColorSwatchPicker, SWATCH_COLORS } from '@/components/admin/color-swatch-picker';

export function TeamsSection({ workspaceId, currentUserId }: { workspaceId: string; currentUserId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { teams, loading, reload } = useTeams(workspaceId);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadCounts = useCallback(async () => {
    if (teams.length === 0) {
      setCounts({});
      return;
    }
    const { data } = await supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teams.map((t) => t.id));
    const next: Record<string, number> = {};
    (data || []).forEach((row) => {
      next[row.team_id] = (next[row.team_id] || 0) + 1;
    });
    setCounts(next);
  }, [supabase, teams]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-team-members:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, loadCounts)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspaceId, loadCounts]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSavingNew(true);
    const color = SWATCH_COLORS[Math.floor(Math.random() * SWATCH_COLORS.length)];
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ workspace_id: workspaceId, name: newName.trim(), color, created_by: currentUserId })
      .select()
      .single();
    if (error || !team) {
      toast.error('Could not create team: ' + (error?.message || 'unknown error'));
      setSavingNew(false);
      return;
    }
    const { error: memberError } = await supabase.from('team_members').insert({ team_id: team.id, user_id: currentUserId, role: 'lead' });
    if (memberError) {
      toast.error('Team created, but could not add you as lead: ' + memberError.message);
    }
    setSavingNew(false);
    setCreating(false);
    setNewName('');
    reload();
  }

  async function handleRename(id: string, name: string) {
    const { error } = await supabase.from('teams').update({ name }).eq('id', id);
    if (error) toast.error('Could not rename team: ' + error.message);
  }

  async function handleRecolor(id: string, color: string) {
    const { error } = await supabase.from('teams').update({ color }).eq('id', id);
    if (error) toast.error('Could not recolor team: ' + error.message);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete team: ' + error.message);
      return;
    }
    setConfirmDeleteId(null);
    toast.success('Team deleted. Its projects were kept and unassigned from any team.');
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Teams ({teams.length})</h2>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
        >
          <Plus size={13} /> New team
        </button>
      </div>
      <p className="mt-0.5 text-sm text-ink-muted">Teams group related projects and give members a shared home in the sidebar.</p>

      {creating && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Team name"
            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || savingNew}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {savingNew && <Loader2 size={12} className="animate-spin" />}
            Create
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setNewName('');
            }}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-brand-500" size={18} />
        </div>
      ) : teams.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border py-8 text-center text-sm text-ink-faint">
          <Users2 className="mx-auto mb-2" size={18} />
          No teams yet — assemble your crew.
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              memberCount={counts[team.id] || 0}
              onRename={(name) => handleRename(team.id, name)}
              onRecolor={(color) => handleRecolor(team.id, color)}
              confirming={confirmDeleteId === team.id}
              onDeleteClick={() => setConfirmDeleteId((cur) => (cur === team.id ? null : team.id))}
              onDeleteConfirm={() => handleDelete(team.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  memberCount,
  onRename,
  onRecolor,
  confirming,
  onDeleteClick,
  onDeleteConfirm,
}: {
  team: Team;
  memberCount: number;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  confirming: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
}) {
  const [name, setName] = useState(team.name);
  useEffect(() => setName(team.name), [team.name]);
  const dirty = !!name.trim() && name !== team.name;

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <ColorSwatchPicker value={team.color || SWATCH_COLORS[0]} onChange={onRecolor} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => dirty && onRename(name.trim())}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-ink hover:border-border focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
      />
      <span className="shrink-0 text-xs text-ink-faint">
        {memberCount} member{memberCount === 1 ? '' : 's'}
      </span>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={onDeleteConfirm} className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700">
            Confirm
          </button>
          <button onClick={onDeleteClick} className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-hover">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={onDeleteClick} className="shrink-0 rounded-md p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { Loader2, Mail, RotateCw, Search, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InviteDialog } from '@/components/admin/invite-dialog';
import type { Tables } from '@/types/database';

export interface MemberRow {
  user_id: string;
  role: Tables<'workspace_members'>['role'];
  profile: Tables<'profiles'>;
}

type Invite = Tables<'invites'>;

export function MembersSection({
  workspace,
  currentUserId,
  rows,
  invites,
  onRowsChange,
  onInvitesChange,
}: {
  workspace: Tables<'workspaces'>;
  currentUserId: string;
  rows: MemberRow[];
  invites: Invite[];
  onRowsChange: (updater: (prev: MemberRow[]) => MemberRow[]) => void;
  onInvitesChange: (updater: (prev: Invite[]) => Invite[]) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const profileById = useMemo(() => {
    const map: Record<string, Tables<'profiles'>> = {};
    rows.forEach((r) => (map[r.user_id] = r.profile));
    return map;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.profile.full_name?.toLowerCase().includes(q) || r.profile.email.toLowerCase().includes(q)
    );
  }, [rows, query]);

  async function changeRole(userId: string, newRole: string) {
    setPendingId(userId);
    const { error } = await supabase
      .from('workspace_members')
      .update({ role: newRole as Tables<'workspace_members'>['role'] })
      .eq('workspace_id', workspace.id)
      .eq('user_id', userId);
    setPendingId(null);
    if (error) {
      toast.error('Could not change role: ' + error.message);
      return;
    }
    onRowsChange((prev) => prev.map((r) => (r.user_id === userId ? { ...r, role: newRole as MemberRow['role'] } : r)));
  }

  async function removeMember(userId: string) {
    setPendingId(userId);
    const { error } = await supabase.from('workspace_members').delete().eq('workspace_id', workspace.id).eq('user_id', userId);
    setPendingId(null);
    if (error) {
      toast.error('Could not remove member: ' + error.message);
      return;
    }
    onRowsChange((prev) => prev.filter((r) => r.user_id !== userId));
    toast.success('Member removed');
  }

  async function resendInvite(invite: Invite) {
    setResendingId(invite.id);
    const { data, error } = await supabase
      .from('invites')
      .update({ created_at: new Date().toISOString() })
      .eq('id', invite.id)
      .select()
      .single();
    setResendingId(null);
    if (error || !data) {
      toast.error('Could not refresh invite: ' + (error?.message || 'unknown error'));
      return;
    }
    onInvitesChange((prev) =>
      prev.map((i) => (i.id === invite.id ? data : i)).sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
    toast.success(`Bumped the invite for ${invite.email}. There's no email system yet, so share the sign-up link with them directly.`);
  }

  async function cancelInvite(id: string) {
    setCancelingId(id);
    const { error } = await supabase.from('invites').delete().eq('id', id);
    setCancelingId(null);
    if (error) {
      toast.error('Could not cancel invite: ' + error.message);
      return;
    }
    onInvitesChange((prev) => prev.filter((i) => i.id !== id));
    toast.success('Invite canceled');
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Members ({rows.length})</h2>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover"
        >
          <UserPlus size={13} /> Invite
        </button>
      </div>

      {rows.length > 8 && (
        <div className="relative mt-3 max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone…"
            className="w-full rounded-lg border border-border py-1.5 pl-8 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        {filteredRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-faint">Couldn&apos;t find anyone named &quot;{query}&quot;.</div>
        ) : (
          filteredRows.map((r) => (
            <div key={r.user_id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <Avatar name={r.profile.full_name} email={r.profile.email} color={r.profile.avatar_color} src={r.profile.avatar_url} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.profile.full_name || r.profile.email}</p>
                <p className="truncate text-xs text-ink-faint">{r.profile.email}</p>
              </div>
              {pendingId === r.user_id && <Loader2 size={13} className="animate-spin text-ink-faint" />}
              <Select value={r.role} onValueChange={(v) => changeRole(r.user_id, v)} disabled={r.user_id === currentUserId && r.role === 'owner'}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              {r.user_id !== currentUserId && (
                <button onClick={() => removeMember(r.user_id)} className="rounded-md p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">Pending invites ({invites.length})</h2>
        <p className="mb-3 text-sm text-ink-muted">
          Anyone with a @boostoxygen.com email can also sign up directly and join automatically&mdash;these are people tracked here for visibility.
        </p>
        {invites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-ink-faint">
            <Mail className="mx-auto mb-1.5" size={16} />
            No pending invites — inbox zero, achievement unlocked.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{inv.email}</p>
                  <p className="truncate text-xs text-ink-faint">
                    Invited by {profileById[inv.invited_by ?? '']?.full_name || profileById[inv.invited_by ?? '']?.email || 'unknown'} &middot;{' '}
                    {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0 text-xs capitalize text-ink-faint">{inv.role}</span>
                <button
                  onClick={() => resendInvite(inv)}
                  disabled={resendingId === inv.id}
                  title="Refresh this invite's timestamp and get the sign-up link ready to re-share"
                  className="flex shrink-0 items-center gap-1 rounded-md p-1.5 text-ink-faint hover:bg-surface-hover hover:text-ink disabled:opacity-50"
                >
                  {resendingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                </button>
                <button
                  onClick={() => cancelInvite(inv.id)}
                  disabled={cancelingId === inv.id}
                  title="Cancel invite"
                  className="flex shrink-0 items-center gap-1 rounded-md p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {cancelingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

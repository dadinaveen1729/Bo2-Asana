'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Shield, Trash2, UserPlus } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InviteDialog } from '@/components/admin/invite-dialog';
import type { Tables } from '@/types/database';

interface MemberRow {
  user_id: string;
  role: Tables<'workspace_members'>['role'];
  profile: Tables<'profiles'>;
}

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const { workspace, role, user } = useWorkspace();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<Tables<'invites'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const isAdmin = role === 'owner' || role === 'admin';

  useEffect(() => {
    async function load() {
      if (!workspace) return;
      const [membersRes, invitesRes] = await Promise.all([
        supabase.from('workspace_members').select('user_id, role, profile:profiles(*)').eq('workspace_id', workspace.id),
        supabase.from('invites').select('*').eq('workspace_id', workspace.id).eq('accepted', false).order('created_at', { ascending: false }),
      ]);
      setRows((membersRes.data as any) || []);
      setInvites(invitesRes.data || []);
      setWorkspaceName(workspace.name);
      setLoading(false);
    }
    load();
  }, [workspace, supabase]);

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <Shield className="mx-auto mb-2 text-ink-faint" size={22} />
          <p className="text-sm text-ink-muted">Only workspace admins can view this page.</p>
        </div>
      </div>
    );
  }

  async function changeRole(userId: string, newRole: string) {
    await supabase.from('workspace_members').update({ role: newRole as any }).eq('workspace_id', workspace!.id).eq('user_id', userId);
    setRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, role: newRole as any } : r)));
  }

  async function removeMember(userId: string) {
    await supabase.from('workspace_members').delete().eq('workspace_id', workspace!.id).eq('user_id', userId);
    setRows((prev) => prev.filter((r) => r.user_id !== userId));
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="text-2xl font-semibold text-ink">Admin & members</h1>
      <p className="mt-0.5 text-sm text-ink-muted">Manage who has access to {workspace?.name} and their permissions.</p>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-ink">Workspace name</label>
        <div className="flex gap-2">
          <input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="max-w-xs flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <button
            onClick={() => workspace && supabase.from('workspaces').update({ name: workspaceName }).eq('id', workspace.id)}
            disabled={!workspaceName.trim() || workspaceName === workspace?.name}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Members ({rows.length})</h2>
        <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover">
          <UserPlus size={13} /> Invite
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-500" size={18} /></div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {rows.map((r) => (
            <div key={r.user_id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <Avatar name={r.profile.full_name} email={r.profile.email} color={r.profile.avatar_color} src={r.profile.avatar_url} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.profile.full_name || r.profile.email}</p>
                <p className="truncate text-xs text-ink-faint">{r.profile.email}</p>
              </div>
              <Select value={r.role} onValueChange={(v) => changeRole(r.user_id, v)} disabled={r.user_id === user?.id && r.role === 'owner'}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              {r.user_id !== user?.id && (
                <button onClick={() => removeMember(r.user_id)} className="rounded-md p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {invites.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">Pending invites ({invites.length})</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
                <span className="text-sm text-ink">{inv.email}</span>
                <span className="text-xs capitalize text-ink-faint">{inv.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

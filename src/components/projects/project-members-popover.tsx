'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Check, Loader2, Share2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { toast } from 'sonner';

export function ProjectMembersPopover({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { workspace, user, members } = useWorkspace();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [membersRes, invitesRes] = await Promise.all([
      supabase.from('project_members').select('user_id').eq('project_id', projectId),
      supabase.from('invites').select('email').eq('project_id', projectId).eq('accepted', false),
    ]);
    setMemberIds((membersRes.data || []).map((m) => m.user_id));
    setPendingEmails((invitesRes.data || []).map((i) => i.email));
  }, [supabase, projectId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`project-members:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invites', filter: `project_id=eq.${projectId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, load]);

  const projectMembers = members.filter((m) => memberIds.includes(m.id));

  async function toggle(userId: string) {
    if (memberIds.includes(userId)) {
      const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: userId, role: 'editor' });
      if (error) toast.error(error.message);
    }
  }

  async function inviteByEmail() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !workspace || !user) return;
    if (!trimmed.endsWith('@boostoxygen.com')) {
      toast.error('Only @boostoxygen.com addresses can be invited.');
      return;
    }
    const alreadyMember = members.find((m) => m.email.toLowerCase() === trimmed);
    setInviting(true);
    if (alreadyMember) {
      const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: alreadyMember.id, role: 'editor' });
      if (error) toast.error(error.message);
      else toast.success(`${alreadyMember.full_name || alreadyMember.email} added to this project`);
    } else {
      const { error } = await supabase.from('invites').insert({
        workspace_id: workspace.id,
        project_id: projectId,
        email: trimmed,
        role: 'member',
        invited_by: user.id,
      });
      if (error) toast.error(error.message);
      else toast.success(`Invited ${trimmed} — they'll join this project as soon as they sign up`);
    }
    setInviting(false);
    setEmail('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-hover">
          {projectMembers.length > 0 ? <AvatarStack people={projectMembers} size={22} max={3} /> : <UserPlus size={14} />}
          <Share2 size={13} /> Share
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="mb-2 flex gap-1.5 px-0.5">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && inviteByEmail()}
            placeholder="teammate@boostoxygen.com"
            className="flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <button
            onClick={inviteByEmail}
            disabled={!email.trim() || inviting}
            className="flex shrink-0 items-center justify-center rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Invite'}
          </button>
        </div>

        <p className="mb-1 px-1.5 text-xs font-semibold text-ink-faint">Project members</p>
        <div className="max-h-56 space-y-0.5 overflow-y-auto">
          {members.map((m) => (
            <button key={m.id} onClick={() => toggle(m.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover">
              <Avatar name={m.full_name} email={m.email} color={m.avatar_color} src={m.avatar_url} size={22} />
              <span className="truncate text-ink">{m.full_name || m.email}</span>
              {memberIds.includes(m.id) && <Check size={13} className="ml-auto text-brand-500" />}
            </button>
          ))}
        </div>

        {pendingEmails.length > 0 && (
          <>
            <p className="mb-1 mt-2 px-1.5 text-xs font-semibold text-ink-faint">Invited, not joined yet</p>
            <div className="space-y-0.5">
              {pendingEmails.map((e) => (
                <div key={e} className="truncate rounded-lg px-2 py-1.5 text-sm text-ink-faint">{e}</div>
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

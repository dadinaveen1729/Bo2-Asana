'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Check, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarStack } from '@/components/ui/avatar';

export function ProjectMembersPopover({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { members } = useWorkspace();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('project_members').select('user_id').eq('project_id', projectId);
    setMemberIds((data || []).map((m) => m.user_id));
  }, [supabase, projectId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`project-members:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, load]);

  const projectMembers = members.filter((m) => memberIds.includes(m.id));

  async function toggle(userId: string) {
    if (memberIds.includes(userId)) {
      await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
    } else {
      await supabase.from('project_members').insert({ project_id: projectId, user_id: userId, role: 'editor' });
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-full p-0.5 hover:bg-surface-hover">
          {projectMembers.length > 0 ? (
            <AvatarStack people={projectMembers} size={24} />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border-strong text-ink-faint">
              <UserPlus size={13} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
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
      </PopoverContent>
    </Popover>
  );
}

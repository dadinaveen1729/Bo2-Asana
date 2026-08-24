'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/lib/workspace-context';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { DatePickerButton } from '@/components/tasks/pickers';
import { PROJECT_STATUS_META } from '@/lib/utils';
import { toast } from 'sonner';
import type { Project } from '@/hooks/use-teams-projects';
import type { Tables } from '@/types/database';

type ActivityRow = Tables<'activity_log'> & { actor: Tables<'profiles'> | null; task: Pick<Tables<'tasks'>, 'id' | 'name'> | null };

export function ProjectOverview({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const { members } = useWorkspace();
  const [description, setDescription] = useState(project.description || '');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [owner, setOwner] = useState<Tables<'profiles'> | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    setDescription(project.description || '');
  }, [project.id, project.description]);

  const loadMembers = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from('project_members').select('user_id').eq('project_id', project.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMemberIds((data || []).map((m) => m.user_id));
  }, [project.id]);

  useEffect(() => {
    loadMembers();
    const supabase = createClient();
    const channel = supabase
      .channel(`project-overview-members:${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${project.id}` }, loadMembers)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.id, loadMembers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!project.created_by) {
        setOwner(null);
        return;
      }
      const supabase = createClient();
      const { data, error } = await supabase.from('profiles').select('*').eq('id', project.created_by).maybeSingle();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!cancelled) setOwner(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [project.created_by]);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    const supabase = createClient();
    const { data: tp, error: tpErr } = await supabase.from('task_projects').select('task_id').eq('project_id', project.id);
    if (tpErr) {
      toast.error(tpErr.message);
      setLoadingActivity(false);
      return;
    }
    const taskIds = (tp || []).map((r) => r.task_id);
    if (taskIds.length === 0) {
      setActivity([]);
      setLoadingActivity(false);
      return;
    }
    const { data, error } = await supabase
      .from('activity_log')
      .select('*, actor:profiles(*), task:tasks(id, name)')
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .limit(15);
    if (error) {
      toast.error(error.message);
      setLoadingActivity(false);
      return;
    }
    setActivity((data as any) || []);
    setLoadingActivity(false);
  }, [project.id]);

  useEffect(() => {
    loadActivity();
    const supabase = createClient();
    const channel = supabase
      .channel(`project-overview-activity:${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, loadActivity)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.id, loadActivity]);

  async function saveDescription() {
    if (description === (project.description || '')) return;
    await onUpdate({ description: description || null });
  }

  const statusMeta = PROJECT_STATUS_META[project.status];
  const projectMembers = members.filter((m) => memberIds.includes(m.id));

  function activityText(a: ActivityRow) {
    const who = a.actor?.full_name || a.actor?.email || 'Someone';
    const on = a.task?.name ? ` on "${a.task.name}"` : '';
    switch (a.action) {
      case 'created':
        return `${who} created a task${on}`;
      case 'completed':
        return `${who} completed a task${on}`;
      case 'reassigned':
        return `${who} changed the assignee${on}`;
      case 'due_date_changed':
        return `${who} changed the due date${on}`;
      case 'commented':
        return `${who} commented${on}`;
      default:
        return `${who} ${a.action}${on}`;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <p className="mb-1.5 text-[13px] font-semibold text-ink-faint">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={4}
            placeholder="What is this project about?"
            className="w-full resize-none rounded-lg border border-transparent px-2 py-1.5 text-sm leading-relaxed text-ink outline-none hover:border-border focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />

          <div className="mt-6">
            <p className="mb-2 text-[13px] font-semibold text-ink-faint">Recent activity</p>
            {loadingActivity ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="animate-spin text-brand-500" size={16} />
              </div>
            ) : activity.length === 0 ? (
              <p className="py-3 text-[13.5px] text-ink-faint">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5">
                    <Avatar name={a.actor?.full_name} email={a.actor?.email} color={a.actor?.avatar_color} src={a.actor?.avatar_url} size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-ink">{activityText(a)}</p>
                      <p className="text-[11px] text-ink-faint">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-faint">Status</p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-faint">Start date</p>
            <DatePickerButton date={project.start_date} completed label="Start date" onChange={(d) => onUpdate({ start_date: d })} />
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-faint">Due date</p>
            <DatePickerButton date={project.due_date} completed={false} label="Due date" onChange={(d) => onUpdate({ due_date: d })} />
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-faint">Owner</p>
            {owner ? (
              <div className="flex items-center gap-2">
                <Avatar name={owner.full_name} email={owner.email} color={owner.avatar_color} src={owner.avatar_url} size={22} />
                <span className="text-[13.5px] text-ink">{owner.full_name || owner.email}</span>
              </div>
            ) : (
              <span className="text-[13.5px] text-ink-faint">Unknown</span>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-faint">Members</p>
            {projectMembers.length > 0 ? (
              <AvatarStack people={projectMembers} size={24} />
            ) : (
              <span className="text-[13.5px] text-ink-faint">No members yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

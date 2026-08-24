'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type PersonProfile = Tables<'profiles'>;
export type PersonProject = Tables<'projects'>;
export interface PersonTask extends Tables<'tasks'> {
  tags: Tables<'tags'>[];
  project: Tables<'projects'> | null;
}

export function usePersonProfile(userId: string | undefined, workspaceId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<PersonProfile | null>(null);
  const [tasks, setTasks] = useState<PersonTask[]>([]);
  const [projects, setProjects] = useState<PersonProject[]>([]);
  const [collaborators, setCollaborators] = useState<PersonProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !workspaceId) return;
    setLoading(true);

    const [profileRes, tasksRes, memberRowsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('tasks')
        .select('*, task_tags(tag:tags(*))')
        .eq('assignee_id', userId)
        .eq('workspace_id', workspaceId)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20),
      supabase.from('project_members').select('project_id').eq('user_id', userId),
    ]);

    setProfile(profileRes.data);
    setTasks(
      (tasksRes.data || []).map((row: any) => ({
        ...row,
        tags: (row.task_tags || []).map((t: any) => t.tag).filter(Boolean),
        project: null,
      }))
    );

    const projectIds = (memberRowsRes.data || []).map((r) => r.project_id);
    if (projectIds.length > 0) {
      const [projectsRes, otherMembersRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .eq('archived', false)
          .order('updated_at', { ascending: false })
          .limit(8),
        supabase.from('project_members').select('user_id, project_id').in('project_id', projectIds).neq('user_id', userId),
      ]);
      setProjects(projectsRes.data || []);

      const counts = new Map<string, number>();
      for (const row of otherMembersRes.data || []) {
        counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
      }
      const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
      if (topIds.length > 0) {
        const collabRes = await supabase.from('profiles').select('*').in('id', topIds);
        const byId = new Map((collabRes.data || []).map((p) => [p.id, p]));
        setCollaborators(topIds.map((id) => byId.get(id)).filter(Boolean) as PersonProfile[]);
      } else {
        setCollaborators([]);
      }
    } else {
      setProjects([]);
      setCollaborators([]);
    }

    setLoading(false);
  }, [supabase, userId, workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, tasks, projects, collaborators, loading, reload: load };
}

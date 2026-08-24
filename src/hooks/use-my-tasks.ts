'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export interface MyTask extends Tables<'tasks'> {
  tags: Tables<'tags'>[];
  project: Tables<'projects'> | null;
}

export function useMyTasks(userId: string | undefined, workspaceId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !workspaceId) return;
    const { data } = await supabase
      .from('tasks')
      .select(
        `*, task_tags(tag:tags(*)), task_projects(project:projects(*))`
      )
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (data) {
      setTasks(
        (data as any[]).map((row) => ({
          ...row,
          tags: (row.task_tags || []).map((t: any) => t.tag).filter(Boolean),
          project: row.task_projects?.[0]?.project || null,
        }))
      );
    }
    setLoading(false);
  }, [supabase, userId, workspaceId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const channel = supabase
      .channel(`my-tasks:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `assignee_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  return { tasks, loading, reload: load };
}

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export interface GoalWithRelations extends Tables<'goals'> {
  owner: Tables<'profiles'> | null;
  projects: Tables<'projects'>[];
}

export function useGoals(workspaceId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [goals, setGoals] = useState<GoalWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('goals')
      .select('*, owner:profiles(*), goal_projects(project:projects(*))')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (data) {
      setGoals((data as any[]).map((g) => ({ ...g, projects: (g.goal_projects || []).map((x: any) => x.project).filter(Boolean) })));
    }
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    load();
    if (!workspaceId) return;
    const channel = supabase
      .channel(`goals:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `workspace_id=eq.${workspaceId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_projects' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspaceId, load]);

  const createGoal = useCallback(
    async (name: string, ownerId: string, dueDate: string | null) => {
      if (!workspaceId) return null;
      const { data } = await supabase.from('goals').insert({ workspace_id: workspaceId, name, owner_id: ownerId, due_date: dueDate }).select().single();
      return data;
    },
    [supabase, workspaceId]
  );

  const updateGoal = useCallback(
    async (id: string, patch: Partial<Tables<'goals'>>) => {
      await supabase.from('goals').update(patch).eq('id', id);
    },
    [supabase]
  );

  const addProject = useCallback(async (goalId: string, projectId: string) => {
    await supabase.from('goal_projects').insert({ goal_id: goalId, project_id: projectId });
  }, [supabase]);

  const removeProject = useCallback(async (goalId: string, projectId: string) => {
    await supabase.from('goal_projects').delete().eq('goal_id', goalId).eq('project_id', projectId);
  }, [supabase]);

  return { goals, loading, createGoal, updateGoal, addProject, removeProject, reload: load };
}

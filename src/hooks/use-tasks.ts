'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;
export type Tag = Tables<'tags'>;
export type TaskRow = Tables<'tasks'>;

export interface ProjectTask extends TaskRow {
  section_id: string | null;
  tp_position: number;
  assignee: Profile | null;
  tags: Tag[];
  subtask_count?: number;
}

export function useProjectTasks(projectId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    const { data, error } = await supabase
      .from('task_projects')
      .select(
        `section_id, position,
         task:tasks!inner (
           *,
           assignee:profiles!tasks_assignee_id_fkey(*),
           task_tags ( tag:tags(*) )
         )`
      )
      .eq('project_id', projectId)
      .filter('task.parent_task_id', 'is', null)
      .order('position', { ascending: true });

    if (!error && data) {
      const mapped: ProjectTask[] = (data as any[])
        .filter((row) => row.task)
        .map((row) => ({
          ...row.task,
          section_id: row.section_id,
          tp_position: row.position,
          tags: (row.task.task_tags || []).map((tt: any) => tt.tag).filter(Boolean),
        }));
      setTasks(mapped);
    }
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    load();
    if (!projectId) return;
    const channel = supabase
      .channel(`project-tasks:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_projects', filter: `project_id=eq.${projectId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, load]);

  const createTask = useCallback(
    async (opts: { name: string; sectionId?: string | null; workspaceId: string; createdBy: string; assigneeId?: string | null; dueDate?: string | null }) => {
      const sectionTasks = tasks.filter((t) => t.section_id === (opts.sectionId ?? null));
      const maxPos = sectionTasks.length ? Math.max(...sectionTasks.map((t) => t.tp_position)) : 0;

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: opts.workspaceId,
          name: opts.name,
          created_by: opts.createdBy,
          assignee_id: opts.assigneeId || null,
          due_date: opts.dueDate || null,
        })
        .select()
        .single();
      if (error || !task || !projectId) return null;

      await supabase.from('task_projects').insert({
        task_id: task.id,
        project_id: projectId,
        section_id: opts.sectionId ?? null,
        position: maxPos + 1000,
      });
      return task;
    },
    [supabase, tasks, projectId]
  );

  const moveTask = useCallback(
    async (taskId: string, sectionId: string | null, position: number) => {
      if (!projectId) return;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, section_id: sectionId, tp_position: position } : t)));
      await supabase
        .from('task_projects')
        .update({ section_id: sectionId, position })
        .eq('task_id', taskId)
        .eq('project_id', projectId);
    },
    [supabase, projectId]
  );

  const toggleComplete = useCallback(
    async (taskId: string, completed: boolean) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)));
      await supabase.from('tasks').update({ completed }).eq('id', taskId);
    },
    [supabase]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await supabase.from('tasks').delete().eq('id', taskId);
    },
    [supabase]
  );

  return { tasks, loading, createTask, moveTask, toggleComplete, deleteTask, reload: load };
}

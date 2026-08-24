'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;
export type CommentRow = Tables<'comments'> & { author: Profile | null };
export type ActivityRow = Tables<'activity_log'> & { actor: Profile | null };
export type CustomFieldValueRow = Tables<'custom_field_values'>;
export type AttachmentRow = Tables<'attachments'>;
export type DependencyRow = Tables<'task_dependencies'> & { depends_on: Tables<'tasks'> | null };

export interface TaskDetail extends Tables<'tasks'> {
  assignee: Profile | null;
  created_by_profile: Profile | null;
  tags: Tables<'tags'>[];
  projects: { project_id: string; section_id: string | null; project: Tables<'projects'> | null }[];
  subtasks: Tables<'tasks'>[];
}

export function useTaskDetail(taskId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [customValues, setCustomValues] = useState<CustomFieldValueRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [dependencies, setDependencies] = useState<DependencyRow[]>([]);
  const [dependents, setDependents] = useState<DependencyRow[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    const [taskRes, subtasksRes] = await Promise.all([
      supabase
        .from('tasks')
        .select(
          `*, assignee:profiles!tasks_assignee_id_fkey(*), created_by_profile:profiles!tasks_created_by_fkey(*),
           task_tags(tag:tags(*)), task_projects(project_id, section_id, project:projects(*))`
        )
        .eq('id', taskId)
        .single(),
      supabase.from('tasks').select('*').eq('parent_task_id', taskId).order('position'),
    ]);
    if (taskRes.data) {
      const d: any = taskRes.data;
      setTask({
        ...d,
        tags: (d.task_tags || []).map((t: any) => t.tag).filter(Boolean),
        projects: d.task_projects || [],
        subtasks: subtasksRes.data || [],
      });
    }
  }, [supabase, taskId]);

  const loadComments = useCallback(async () => {
    if (!taskId) return;
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    setComments((data as any) || []);
  }, [supabase, taskId]);

  const loadActivity = useCallback(async () => {
    if (!taskId) return;
    const { data } = await supabase
      .from('activity_log')
      .select('*, actor:profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(60);
    setActivity((data as any) || []);
  }, [supabase, taskId]);

  const loadExtras = useCallback(async () => {
    if (!taskId) return;
    const [cv, att, deps, dpts, fol, lik] = await Promise.all([
      supabase.from('custom_field_values').select('*').eq('task_id', taskId),
      supabase.from('attachments').select('*').eq('task_id', taskId).order('created_at', { ascending: false }),
      supabase.from('task_dependencies').select('*, depends_on:tasks!task_dependencies_depends_on_task_id_fkey(*)').eq('task_id', taskId),
      supabase.from('task_dependencies').select('*, depends_on:tasks!task_dependencies_task_id_fkey(*)').eq('depends_on_task_id', taskId),
      supabase.from('task_followers').select('user_id').eq('task_id', taskId),
      supabase.from('task_likes').select('user_id').eq('task_id', taskId),
    ]);
    setCustomValues(cv.data || []);
    setAttachments(att.data || []);
    setDependencies((deps.data as any) || []);
    setDependents((dpts.data as any) || []);
    setFollowers((fol.data || []).map((f) => f.user_id));
    setLikes((lik.data || []).map((l) => l.user_id));
  }, [supabase, taskId]);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    Promise.all([loadTask(), loadComments(), loadActivity(), loadExtras()]).then(() => setLoading(false));

    const channel = supabase
      .channel(`task-detail:${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` }, loadTask)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `parent_task_id=eq.${taskId}` }, loadTask)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` }, loadComments)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log', filter: `task_id=eq.${taskId}` }, loadActivity)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_field_values', filter: `task_id=eq.${taskId}` }, loadExtras)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' }, loadTask)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_likes', filter: `task_id=eq.${taskId}` }, loadExtras)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments', filter: `task_id=eq.${taskId}` }, loadExtras)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, supabase, loadTask, loadComments, loadActivity, loadExtras]);

  const updateTask = useCallback(
    async (patch: Partial<Tables<'tasks'>>) => {
      if (!taskId) return;
      setTask((prev) => (prev ? { ...prev, ...patch } : prev));
      await supabase.from('tasks').update(patch).eq('id', taskId);
    },
    [supabase, taskId]
  );

  const addComment = useCallback(
    async (authorId: string, body: string) => {
      if (!taskId || !body.trim()) return;
      await supabase.from('comments').insert({ task_id: taskId, author_id: authorId, body: body.trim() });
    },
    [supabase, taskId]
  );

  const toggleLike = useCallback(
    async (userId: string) => {
      if (!taskId) return;
      if (likes.includes(userId)) {
        await supabase.from('task_likes').delete().eq('task_id', taskId).eq('user_id', userId);
      } else {
        await supabase.from('task_likes').insert({ task_id: taskId, user_id: userId });
      }
    },
    [supabase, taskId, likes]
  );

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!taskId) return;
      if (followers.includes(userId)) {
        await supabase.from('task_followers').delete().eq('task_id', taskId).eq('user_id', userId);
      } else {
        await supabase.from('task_followers').insert({ task_id: taskId, user_id: userId });
      }
    },
    [supabase, taskId, followers]
  );

  const addTag = useCallback(
    async (tagId: string) => {
      if (!taskId) return;
      await supabase.from('task_tags').insert({ task_id: taskId, tag_id: tagId });
      loadTask();
    },
    [supabase, taskId, loadTask]
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      if (!taskId) return;
      await supabase.from('task_tags').delete().eq('task_id', taskId).eq('tag_id', tagId);
      loadTask();
    },
    [supabase, taskId, loadTask]
  );

  const setCustomFieldValue = useCallback(
    async (customFieldId: string, patch: Partial<Tables<'custom_field_values'>>) => {
      if (!taskId) return;
      await supabase
        .from('custom_field_values')
        .upsert({ task_id: taskId, custom_field_id: customFieldId, ...patch }, { onConflict: 'task_id,custom_field_id' });
    },
    [supabase, taskId]
  );

  const addSubtask = useCallback(
    async (name: string, createdBy: string) => {
      if (!taskId || !task) return;
      const maxPos = task.subtasks.length ? Math.max(...task.subtasks.map((s) => s.position)) : 0;
      await supabase.from('tasks').insert({
        workspace_id: task.workspace_id,
        name,
        parent_task_id: taskId,
        created_by: createdBy,
        position: maxPos + 1000,
      });
      loadTask();
    },
    [supabase, taskId, task, loadTask]
  );

  const addDependency = useCallback(
    async (dependsOnTaskId: string, type: 'blocking' | 'waiting_on' = 'blocking') => {
      if (!taskId) return;
      await supabase.from('task_dependencies').insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId, type });
      loadExtras();
    },
    [supabase, taskId, loadExtras]
  );

  const removeDependency = useCallback(
    async (dependsOnTaskId: string) => {
      if (!taskId) return;
      await supabase.from('task_dependencies').delete().eq('task_id', taskId).eq('depends_on_task_id', dependsOnTaskId);
      loadExtras();
    },
    [supabase, taskId, loadExtras]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      await supabase.from('comments').delete().eq('id', commentId);
    },
    [supabase]
  );

  const moveToSection = useCallback(
    async (projectId: string, sectionId: string) => {
      if (!taskId) return;
      await supabase.from('task_projects').update({ section_id: sectionId }).eq('task_id', taskId).eq('project_id', projectId);
      loadTask();
    },
    [supabase, taskId, loadTask]
  );

  return {
    task, comments, activity, customValues, attachments, dependencies, dependents, followers, likes, loading,
    updateTask, addComment, deleteComment, toggleLike, toggleFollow, addTag, removeTag,
    setCustomFieldValue, addSubtask, addDependency, removeDependency, moveToSection, reload: loadTask,
  };
}

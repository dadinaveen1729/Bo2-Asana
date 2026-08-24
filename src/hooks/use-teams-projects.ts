'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type Team = Tables<'teams'>;
export type Project = Tables<'projects'>;

export function useTeams(workspaceId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase.from('teams').select('*').eq('workspace_id', workspaceId).order('name');
    setTeams(data || []);
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    load();
    if (!workspaceId) return;
    const channel = supabase
      .channel(`teams:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `workspace_id=eq.${workspaceId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspaceId, load]);

  return { teams, loading, reload: load };
}

export function useProjects(workspaceId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('archived', false)
      .order('created_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    load();
    if (!workspaceId) return;
    const channel = supabase
      .channel(`projects:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${workspaceId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspaceId, load]);

  return { projects, loading, reload: load };
}

export function useProject(projectId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase.from('projects').select('*').eq('id', projectId).single();
    setProject(data);
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    load();
    if (!projectId) return;
    const channel = supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, load]);

  return { project, loading, reload: load };
}

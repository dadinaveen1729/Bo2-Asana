'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type Section = Tables<'sections'>;

export function useSections(projectId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase.from('sections').select('*').eq('project_id', projectId).order('position');
    setSections(data || []);
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    load();
    if (!projectId) return;
    const channel = supabase
      .channel(`sections:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections', filter: `project_id=eq.${projectId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, load]);

  async function createSection(name: string) {
    if (!projectId) return;
    const maxPos = sections.length ? Math.max(...sections.map((s) => s.position)) : 0;
    await supabase.from('sections').insert({ project_id: projectId, name, position: maxPos + 1000 });
  }

  async function renameSection(id: string, name: string) {
    await supabase.from('sections').update({ name }).eq('id', id);
  }

  async function deleteSection(id: string) {
    await supabase.from('sections').delete().eq('id', id);
  }

  async function reorderSection(id: string, position: number) {
    await supabase.from('sections').update({ position }).eq('id', id);
  }

  return { sections, loading, createSection, renameSection, deleteSection, reorderSection, reload: load };
}

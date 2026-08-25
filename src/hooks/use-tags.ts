'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hashColor } from '@/lib/utils';
import type { Tables } from '@/types/database';

export function useTags(workspaceId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [tags, setTags] = useState<Tables<'tags'>[]>([]);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase.from('tags').select('*').eq('workspace_id', workspaceId).order('name');
    setTags(data || []);
  }, [supabase, workspaceId]);

  useEffect(() => {
    load();
    if (!workspaceId) return;
    const channel = supabase
      .channel(`tags:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags', filter: `workspace_id=eq.${workspaceId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspaceId, load]);

  const createTag = useCallback(
    async (name: string) => {
      if (!workspaceId) return null;
      const { data } = await supabase
        .from('tags')
        .insert({ workspace_id: workspaceId, name, color: hashColor(name) })
        .select()
        .single();
      return data;
    },
    [supabase, workspaceId]
  );

  const updateTag = useCallback(
    async (id: string, patch: Partial<Pick<Tables<'tags'>, 'name' | 'color'>>) => {
      const { data, error } = await supabase.from('tags').update(patch).eq('id', id).select().single();
      return { data, error };
    },
    [supabase]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      return { error };
    },
    [supabase]
  );

  return { tags, createTag, updateTag, deleteTag, reload: load };
}

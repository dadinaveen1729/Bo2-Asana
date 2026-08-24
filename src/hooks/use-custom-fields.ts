'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type CustomField = Tables<'custom_fields'>;

export function useCustomFields(projectId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [fields, setFields] = useState<CustomField[]>([]);

  const load = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase.from('custom_fields').select('*').eq('project_id', projectId).order('position');
    setFields(data || []);
  }, [supabase, projectId]);

  useEffect(() => {
    load();
    if (!projectId) return;
    const channel = supabase
      .channel(`custom-fields:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_fields', filter: `project_id=eq.${projectId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, load]);

  const createField = useCallback(
    async (workspaceId: string, name: string, type: CustomField['type'], options: { id: string; label: string; color: string }[] = []) => {
      if (!projectId) return null;
      const maxPos = fields.length ? Math.max(...fields.map((f) => f.position)) : 0;
      const { data } = await supabase
        .from('custom_fields')
        .insert({ workspace_id: workspaceId, project_id: projectId, name, type, options, position: maxPos + 1000 })
        .select()
        .single();
      return data;
    },
    [supabase, projectId, fields]
  );

  const deleteField = useCallback(
    async (id: string) => {
      await supabase.from('custom_fields').delete().eq('id', id);
    },
    [supabase]
  );

  return { fields, createField, deleteField, reload: load };
}

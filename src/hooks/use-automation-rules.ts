'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type AutomationRule = Tables<'automation_rules'>;

export function useAutomationRules(projectId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase.from('automation_rules').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    setRules(data || []);
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    load();
    if (!projectId) return;
    const channel = supabase
      .channel(`automation-rules:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automation_rules', filter: `project_id=eq.${projectId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, projectId, load]);

  const createRule = useCallback(
    async (rule: {
      name: string;
      trigger_type: AutomationRule['trigger_type'];
      trigger_config: Record<string, any>;
      action_type: AutomationRule['action_type'];
      action_config: Record<string, any>;
      created_by: string;
    }) => {
      if (!projectId) return null;
      const { data } = await supabase.from('automation_rules').insert({ project_id: projectId, ...rule }).select().single();
      return data;
    },
    [supabase, projectId]
  );

  const toggleRule = useCallback(async (id: string, enabled: boolean) => {
    await supabase.from('automation_rules').update({ enabled }).eq('id', id);
  }, [supabase]);

  const deleteRule = useCallback(async (id: string) => {
    await supabase.from('automation_rules').delete().eq('id', id);
  }, [supabase]);

  return { rules, loading, createRule, toggleRule, deleteRule, reload: load };
}

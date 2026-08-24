'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export interface PortfolioWithProjects extends Tables<'portfolios'> {
  projects: Tables<'projects'>[];
}

export function usePortfolios(workspaceId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [portfolios, setPortfolios] = useState<PortfolioWithProjects[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('portfolios')
      .select('*, portfolio_projects(project:projects(*))')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (data) {
      setPortfolios((data as any[]).map((p) => ({ ...p, projects: (p.portfolio_projects || []).map((x: any) => x.project).filter(Boolean) })));
    }
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    load();
    if (!workspaceId) return;
    const channel = supabase
      .channel(`portfolios:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios', filter: `workspace_id=eq.${workspaceId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio_projects' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspaceId, load]);

  const createPortfolio = useCallback(
    async (name: string, color: string, ownerId: string) => {
      if (!workspaceId) return null;
      const { data } = await supabase.from('portfolios').insert({ workspace_id: workspaceId, name, color, owner_id: ownerId }).select().single();
      return data;
    },
    [supabase, workspaceId]
  );

  const addProject = useCallback(
    async (portfolioId: string, projectId: string) => {
      await supabase.from('portfolio_projects').insert({ portfolio_id: portfolioId, project_id: projectId });
    },
    [supabase]
  );

  const removeProject = useCallback(
    async (portfolioId: string, projectId: string) => {
      await supabase.from('portfolio_projects').delete().eq('portfolio_id', portfolioId).eq('project_id', projectId);
    },
    [supabase]
  );

  return { portfolios, loading, createPortfolio, addProject, removeProject, reload: load };
}

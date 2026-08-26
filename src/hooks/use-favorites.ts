'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useFavorites(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    let { data, error } = await supabase.from('project_favorites').select('project_id').eq('user_id', userId);
    if (error) {
      // Right after login (especially on mobile, where the network/JS is
      // slower to settle) the very first request sometimes lands before
      // the session has fully warmed up and fails transiently -- not a
      // real problem, just bad timing. One quiet retry clears almost all
      // of these before ever surfacing an error toast.
      await new Promise((r) => setTimeout(r, 800));
      ({ data, error } = await supabase.from('project_favorites').select('project_id').eq('user_id', userId));
    }
    if (error) {
      toast.error('Could not load starred projects');
    } else {
      setFavoriteProjectIds(new Set((data || []).map((r) => r.project_id)));
    }
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const channel = supabase
      .channel(`project_favorites:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_favorites', filter: `user_id=eq.${userId}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  const addFavorite = useCallback(
    async (projectId: string) => {
      if (!userId) return;
      setFavoriteProjectIds((prev) => {
        if (prev.has(projectId)) return prev;
        const next = new Set(prev);
        next.add(projectId);
        return next;
      });
      const { error } = await supabase
        .from('project_favorites')
        .upsert({ user_id: userId, project_id: projectId }, { onConflict: 'user_id,project_id', ignoreDuplicates: true });
      if (error) {
        setFavoriteProjectIds((prev) => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
        toast.error('Could not pin project to sidebar');
      }
    },
    [supabase, userId]
  );

  const removeFavorite = useCallback(
    async (projectId: string) => {
      if (!userId) return;
      setFavoriteProjectIds((prev) => {
        if (!prev.has(projectId)) return prev;
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
      const { error } = await supabase
        .from('project_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId);
      if (error) {
        setFavoriteProjectIds((prev) => new Set(prev).add(projectId));
        toast.error('Could not unpin project');
      }
    },
    [supabase, userId]
  );

  return { favoriteProjectIds, addFavorite, removeFavorite, loading };
}

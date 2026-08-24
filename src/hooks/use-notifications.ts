'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type NotificationRow = Tables<'notifications'> & {
  actor: Tables<'profiles'> | null;
  task: Tables<'tasks'> | null;
};

export function useNotifications(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(*), task:tasks(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(80);
    setNotifications((data as any) || []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(
    async (id: string) => {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    },
    [supabase]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  }, [supabase, userId]);

  return { notifications, unreadCount, loading, markRead, markAllRead, reload: load };
}

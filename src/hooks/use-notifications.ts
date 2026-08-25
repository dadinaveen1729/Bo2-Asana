'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

export type NotificationRow = Tables<'notifications'> & {
  actor: Tables<'profiles'> | null;
  task: Tables<'tasks'> | null;
  bookmarked: boolean;
};

export function useNotifications(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const [notifRes, bookmarksRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*, actor:profiles!notifications_actor_id_fkey(*), task:tasks(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(80),
      supabase.from('notification_bookmarks').select('notification_id').eq('user_id', userId),
    ]);
    const bookmarkedIds = new Set((bookmarksRes.data || []).map((b) => b.notification_id));
    setNotifications(((notifRes.data as any) || []).map((n: any) => ({ ...n, bookmarked: bookmarkedIds.has(n.id) })));
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_bookmarks', filter: `user_id=eq.${userId}` }, load)
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

  const toggleBookmark = useCallback(
    async (notificationId: string, bookmarked: boolean) => {
      if (!userId) return;
      if (bookmarked) {
        await supabase.from('notification_bookmarks').delete().eq('user_id', userId).eq('notification_id', notificationId);
      } else {
        await supabase.from('notification_bookmarks').insert({ user_id: userId, notification_id: notificationId });
      }
    },
    [supabase, userId]
  );

  return { notifications, unreadCount, loading, markRead, markAllRead, toggleBookmark, reload: load };
}

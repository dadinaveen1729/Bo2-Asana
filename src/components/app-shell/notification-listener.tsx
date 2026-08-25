'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTaskPanel } from '@/lib/task-panel-context';

const MESSAGE_BY_TYPE: Record<string, (actor: string) => string> = {
  assigned: (a) => `${a} assigned you a task`,
  mentioned: (a) => `${a} mentioned you`,
  comment: (a) => `${a} commented on your task`,
  due_soon: () => 'A task is due soon',
  completed: (a) => `${a} completed a task`,
  status_change: (a) => `${a} changed a project's status`,
  added_to_project: (a) => `${a} added you to a project`,
  dependency_cleared: () => 'A task you were waiting on is done',
};

/**
 * Live "it just happened" feedback for the current tab: whenever a new
 * notification row lands for the signed-in user (assignment, mention,
 * comment, etc.), pop a toast immediately instead of waiting for them to
 * check the Inbox. Complements — doesn't replace — the Inbox page.
 */
export function NotificationListener({ userId }: { userId: string }) {
  const { openTask } = useTaskPanel();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const n = payload.new as { id: string; type: string; actor_id: string | null; task_id: string | null; message: string };
          let actorName = 'Someone';
          if (n.actor_id) {
            const { data } = await supabase.from('profiles').select('full_name, email').eq('id', n.actor_id).maybeSingle();
            if (data) actorName = data.full_name || data.email;
          }
          const describe = MESSAGE_BY_TYPE[n.type] || (() => 'You have a new update');
          toast(describe(actorName), {
            description: n.message,
            action: n.task_id ? { label: 'Open', onClick: () => openTask(n.task_id!) } : undefined,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, openTask]);

  return null;
}

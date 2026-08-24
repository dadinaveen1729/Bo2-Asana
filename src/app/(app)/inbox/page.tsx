'use client';

import { formatDistanceToNow } from 'date-fns';
import { AtSign, Bell, CheckCircle2, MessageSquare, UserPlus, Clock } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useNotifications, type NotificationRow } from '@/hooks/use-notifications';
import { useTaskPanel } from '@/lib/task-panel-context';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const ICONS: Record<string, any> = {
  assigned: UserPlus,
  mentioned: AtSign,
  comment: MessageSquare,
  due_soon: Clock,
  completed: CheckCircle2,
  status_change: Bell,
  added_to_project: UserPlus,
  dependency_cleared: CheckCircle2,
};

export default function InboxPage() {
  const { user } = useWorkspace();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id);
  const { openTask } = useTaskPanel();

  function handleClick(n: NotificationRow) {
    if (!n.read) markRead(n.id);
    if (n.task_id) openTask(n.task_id);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Inbox</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border">
        {notifications.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          return (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-hover',
                !n.read && 'bg-brand-50/40'
              )}
            >
              <div className="relative shrink-0">
                <Avatar name={n.actor?.full_name} email={n.actor?.email} color={n.actor?.avatar_color} src={n.actor?.avatar_url} size={32} />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-ink-muted ring-2 ring-white">
                  <Icon size={10} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{n.actor?.full_name || n.actor?.email || 'Someone'}</span>{' '}
                  {n.type === 'assigned' && 'assigned you a task:'}
                  {n.type === 'comment' && 'commented on:'}
                  {n.type === 'mentioned' && 'mentioned you in:'}
                  {!['assigned', 'comment', 'mentioned'].includes(n.type) && 'updated:'}
                  {' '}
                  <span className="text-ink-muted">{n.message}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-faint">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
            </button>
          );
        })}

        {notifications.length === 0 && (
          <div className="px-4 py-16 text-center text-sm text-ink-muted">No notifications yet.</div>
        )}
      </div>
    </div>
  );
}

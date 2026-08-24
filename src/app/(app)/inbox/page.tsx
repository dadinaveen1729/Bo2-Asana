'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, subDays } from 'date-fns';
import { AtSign, Bell, CheckCircle2, MessageSquare, UserPlus, Clock, Sparkles, Bookmark, Archive as ArchiveIcon, X } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useNotifications, type NotificationRow } from '@/hooks/use-notifications';
import { useTaskPanel } from '@/lib/task-panel-context';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const BUCKET_ORDER = ['Today', 'Yesterday', 'Earlier this week', 'Earlier'] as const;

function bucketFor(date: Date): (typeof BUCKET_ORDER)[number] {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'Earlier this week';
  return 'Earlier';
}

function groupByDate(list: NotificationRow[]) {
  const groups: Record<string, NotificationRow[]> = {};
  for (const n of list) {
    const label = bucketFor(new Date(n.created_at));
    (groups[label] ||= []).push(n);
  }
  return BUCKET_ORDER.filter((label) => groups[label]?.length).map((label) => ({ label, items: groups[label] }));
}

export default function InboxPage() {
  const { user } = useWorkspace();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id);
  const { openTask } = useTaskPanel();
  const [tab, setTab] = useState<'activity' | 'bookmarks' | 'archive' | 'mentioned'>('activity');
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [summaryTimeframe, setSummaryTimeframe] = useState<'week' | 'month'>('week');
  const [summaryText, setSummaryText] = useState<string | null>(null);

  function handleClick(n: NotificationRow) {
    if (!n.read) markRead(n.id);
    if (n.task_id) openTask(n.task_id);
  }

  const archived = useMemo(() => notifications.filter((n) => n.read), [notifications]);
  const mentioned = useMemo(() => notifications.filter((n) => n.type === 'mentioned'), [notifications]);

  function computeSummary() {
    const cutoff = subDays(new Date(), summaryTimeframe === 'week' ? 7 : 30);
    const inRange = notifications.filter((n) => new Date(n.created_at) >= cutoff);
    const assignedCount = inRange.filter((n) => n.type === 'assigned').length;
    const mentionedCount = inRange.filter((n) => n.type === 'mentioned').length;
    const period = summaryTimeframe === 'week' ? 'this week' : 'this month';
    setSummaryText(
      `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}, including ${assignedCount} task assignment${assignedCount === 1 ? '' : 's'} and ${mentionedCount} mention${mentionedCount === 1 ? '' : 's'} ${period}.`
    );
  }

  function renderRow(n: NotificationRow) {
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
  }

  function renderFeed(list: NotificationRow[], emptyText: string) {
    if (list.length === 0) {
      return <div className="px-4 py-16 text-center text-sm text-ink-muted">{emptyText}</div>;
    }
    const groups = groupByDate(list);
    return groups.map((g, i) => (
      <div key={g.label}>
        <div className={cn('bg-surface-hover px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint', i === 0 && 'border-t-0')}>
          {g.label}
        </div>
        {g.items.map((n) => renderRow(n))}
      </div>
    ));
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
          <TabsTrigger value="mentioned">@Mentioned</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          {!summaryDismissed && (
            <div className="mb-4 rounded-xl border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Sparkles size={14} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">Inbox Summary</p>
                    <p className="mt-0.5 text-xs text-ink-muted">Summarize your most important and actionable notifications</p>
                  </div>
                </div>
                <button onClick={() => setSummaryDismissed(true)} className="shrink-0 text-ink-faint hover:text-ink-muted">
                  <X size={14} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={summaryTimeframe} onValueChange={(v) => { setSummaryTimeframe(v as 'week' | 'month'); setSummaryText(null); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <span className="text-ink-faint">Timeframe:</span> <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Past week</SelectItem>
                    <SelectItem value="month">Past month</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={computeSummary}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  View summary
                </button>
              </div>

              {summaryText && (
                <p className="mt-3 rounded-lg bg-surface-hover px-3 py-2.5 text-xs leading-relaxed text-ink">{summaryText}</p>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border">
            {renderFeed(notifications, 'No notifications yet.')}
          </div>
        </TabsContent>

        <TabsContent value="bookmarks" className="mt-4">
          <div className="rounded-xl border border-dashed border-border px-4 py-16 text-center">
            <Bookmark className="mx-auto mb-2 text-ink-faint" size={20} />
            <p className="text-sm text-ink-muted">No bookmarks yet.</p>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border">
            {archived.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <ArchiveIcon className="mx-auto mb-2 text-ink-faint" size={20} />
                <p className="text-sm text-ink-muted">Nothing archived yet.</p>
              </div>
            ) : (
              renderFeed(archived, 'Nothing archived yet.')
            )}
          </div>
        </TabsContent>

        <TabsContent value="mentioned" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border">
            {renderFeed(mentioned, "No mentions yet. When someone @mentions you, it'll show up here.")}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

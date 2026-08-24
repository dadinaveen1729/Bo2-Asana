'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTaskPanel } from '@/lib/task-panel-context';

export default function TaskDeepLinkPage({ params }: { params: { taskId: string } }) {
  const { openTask, openTaskId } = useTaskPanel();
  const router = useRouter();
  const hasOpened = useRef(false);

  useEffect(() => {
    openTask(params.taskId);
    hasOpened.current = true;
  }, [params.taskId, openTask]);

  useEffect(() => {
    if (hasOpened.current && openTaskId === null) {
      router.push('/home');
    }
  }, [openTaskId, router]);

  return (
    <div className="flex h-full items-center justify-center text-sm text-ink-faint">
      Opening task...
    </div>
  );
}

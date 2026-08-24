'use client';

import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { TaskPanelProvider } from '@/lib/task-panel-context';
import { Sidebar } from '@/components/app-shell/sidebar';
import { TopBar } from '@/components/app-shell/topbar';
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';

function Shell({ children }: { children: React.ReactNode }) {
  const { loading, error, workspace } = useWorkspace();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas">
        <Loader2 className="animate-spin text-brand-500" size={22} />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-canvas px-6 text-center">
        <p className="text-sm font-medium text-ink">{error || 'No workspace found.'}</p>
        <p className="text-sm text-ink-muted">Try refreshing, or contact a workspace admin.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
      <TaskDetailPanel />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <TooltipProvider delayDuration={300}>
        <TaskPanelProvider>
          <Shell>{children}</Shell>
        </TaskPanelProvider>
      </TooltipProvider>
    </WorkspaceProvider>
  );
}

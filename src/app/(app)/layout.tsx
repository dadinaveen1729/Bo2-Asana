'use client';

import { createContext, useContext } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { Hash } from 'lucide-react';
import { toast } from 'sonner';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { TaskPanelProvider } from '@/lib/task-panel-context';
import { UndoProvider } from '@/lib/undo-context';
import { Sidebar } from '@/components/app-shell/sidebar';
import { TopBar } from '@/components/app-shell/topbar';
import { NotificationListener } from '@/components/app-shell/notification-listener';
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';

// Drop target id for the sidebar's "Starred" section — project cards elsewhere
// in the app (e.g. the Home page grid) become draggable with the project's id
// as their draggable id, so dropping on this zone pins that project.
export const SIDEBAR_STARRED_DROP_ID = 'sidebar-starred-dropzone';

type FavoritesDndValue = ReturnType<typeof useFavorites>;
const FavoritesDndContext = createContext<FavoritesDndValue | null>(null);

export function useFavoritesDnd() {
  const ctx = useContext(FavoritesDndContext);
  if (!ctx) throw new Error('useFavoritesDnd must be used within the (app) layout');
  return ctx;
}

type DragCardData = { name: string; color?: string | null };

function Shell({ children }: { children: React.ReactNode }) {
  const { loading, error, workspace, user } = useWorkspace();
  const favorites = useFavorites(user?.id);
  const [activeDrag, setActiveDrag] = useState<DragCardData | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveDrag((e.active.data.current as DragCardData) || null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over || over.id !== SIDEBAR_STARRED_DROP_ID) return;
    const projectId = active.id as string;
    if (favorites.favoriteProjectIds.has(projectId)) return;
    favorites.addFavorite(projectId);
    toast.success('Pinned to sidebar');
  }

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
    <FavoritesDndContext.Provider value={favorites}>
      {user && <NotificationListener userId={user.id} />}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-screen w-screen overflow-hidden bg-canvas">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <div className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">{children}</div>
          </div>
          <TaskDetailPanel />
        </div>
        <DragOverlay>
          {activeDrag ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-panel">
              <Hash size={14} style={{ color: activeDrag.color || '#FC636B' }} />
              <span className="text-sm font-medium text-ink">{activeDrag.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </FavoritesDndContext.Provider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <TooltipProvider delayDuration={300}>
        <UndoProvider>
          <TaskPanelProvider>
            <Shell>{children}</Shell>
          </TaskPanelProvider>
        </UndoProvider>
      </TooltipProvider>
    </WorkspaceProvider>
  );
}

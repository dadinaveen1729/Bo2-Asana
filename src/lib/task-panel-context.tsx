'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface TaskPanelContextValue {
  openTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
}

const TaskPanelContext = createContext<TaskPanelContextValue | null>(null);

export function TaskPanelProvider({ children }: { children: React.ReactNode }) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = useCallback((id: string) => setOpenTaskId(id), []);
  const closeTask = useCallback(() => setOpenTaskId(null), []);

  return (
    <TaskPanelContext.Provider value={{ openTaskId, openTask, closeTask }}>
      {children}
    </TaskPanelContext.Provider>
  );
}

export function useTaskPanel() {
  const ctx = useContext(TaskPanelContext);
  if (!ctx) throw new Error('useTaskPanel must be used within TaskPanelProvider');
  return ctx;
}

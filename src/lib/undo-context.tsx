'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface UndoableAction {
  label: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

interface UndoContextValue {
  pushUndo: (action: UndoableAction) => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

const MAX_STACK = 30;

/**
 * App-wide undo/redo via Ctrl/Cmd+Z and Ctrl/Cmd+Y (or Ctrl/Cmd+Shift+Z).
 * Any mutation that calls pushUndo() becomes undoable from the keyboard —
 * not every mutation in the app does this yet, only the destructive/
 * frequently-mistaken ones (task delete, task completion, project
 * archive/delete) are wired in so far.
 */
export function UndoProvider({ children }: { children: React.ReactNode }) {
  const undoStack = useRef<UndoableAction[]>([]);
  const redoStack = useRef<UndoableAction[]>([]);
  const [busy, setBusy] = useState(false);

  const pushUndo = useCallback((action: UndoableAction) => {
    undoStack.current.push(action);
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (typing) return; // let native text-field undo work
        if (undoStack.current.length === 0 || busy) return;
        e.preventDefault();
        const action = undoStack.current.pop()!;
        setBusy(true);
        try {
          await action.undo();
          redoStack.current.push(action);
          toast(`Undid: ${action.label}`);
        } catch (err: any) {
          toast.error(`Could not undo: ${err?.message || 'unknown error'}`);
        } finally {
          setBusy(false);
        }
      } else if ((e.key.toLowerCase() === 'y' && !e.shiftKey) || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        if (typing) return;
        if (redoStack.current.length === 0 || busy) return;
        e.preventDefault();
        const action = redoStack.current.pop()!;
        setBusy(true);
        try {
          await action.redo();
          undoStack.current.push(action);
          toast(`Redid: ${action.label}`);
        } catch (err: any) {
          toast.error(`Could not redo: ${err?.message || 'unknown error'}`);
        } finally {
          setBusy(false);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy]);

  return <UndoContext.Provider value={{ pushUndo }}>{children}</UndoContext.Provider>;
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error('useUndo must be used within UndoProvider');
  return ctx;
}

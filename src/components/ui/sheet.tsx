'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  width = 640,
  overlay = true,
  ...props
}: DialogPrimitive.DialogContentProps & { width?: number; overlay?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      {overlay && <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-fade-in" />}
      <DialogPrimitive.Content
        className={cn(
          // h-dvh (not h-screen/100vh) so this doesn't render taller than
          // what's actually visible on mobile once browser chrome is
          // factored in -- same bug class as the sidebar drawer.
          'fixed right-0 top-0 z-50 flex h-dvh flex-col border-l border-border bg-white shadow-2xl focus:outline-none',
          'data-[state=open]:animate-slide-in',
          className
        )}
        style={{ width, maxWidth: '100vw' }}
        {...props}
        onInteractOutside={!overlay ? (e) => e.preventDefault() : props.onInteractOutside}
        onPointerDownOutside={!overlay ? (e) => e.preventDefault() : props.onPointerDownOutside}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetCloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close className={cn('rounded-md p-1.5 text-ink-faint transition hover:bg-surface-hover hover:text-ink', className)}>
      <X size={17} />
    </DialogPrimitive.Close>
  );
}

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

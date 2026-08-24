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
  ...props
}: DialogPrimitive.DialogContentProps & { width?: number }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed right-0 top-0 z-50 flex h-screen flex-col border-l border-border bg-white shadow-2xl focus:outline-none',
          'data-[state=open]:animate-slide-in',
          className
        )}
        style={{ width, maxWidth: '100vw' }}
        {...props}
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

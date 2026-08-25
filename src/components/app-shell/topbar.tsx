'use client';

import { useState } from 'react';
import { Search, Bell, UserPlus, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/lib/workspace-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useMobileNav } from '@/app/(app)/layout';
import { CommandPalette } from './command-palette';
import { InviteDialog } from '@/components/admin/invite-dialog';

export function TopBar() {
  const router = useRouter();
  const { user, role } = useWorkspace();
  const { unreadCount } = useNotifications(user?.id);
  const { setOpen: setMobileNavOpen } = useMobileNav();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-white px-3 sm:px-5">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-surface-hover lg:hidden"
        >
          <Menu size={19} />
        </button>

        <button
          onClick={() => setPaletteOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-sm text-ink-faint transition hover:border-border-strong sm:w-72 sm:flex-none"
        >
          <Search size={15} className="shrink-0" />
          <span className="flex-1 truncate text-left">Search...</span>
          <kbd className="hidden shrink-0 rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-faint sm:inline-block">⌘K</kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {(role === 'owner' || role === 'admin') && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition hover:bg-surface-hover sm:px-3"
            >
              <UserPlus size={14} /> <span className="hidden sm:inline">Invite</span>
            </button>
          )}
          <button
            onClick={() => router.push('/inbox')}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-hover"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDroppable } from '@dnd-kit/core';
import {
  Home, CheckSquare, Inbox, LayoutGrid, Target, ChevronDown, ChevronRight,
  Plus, Users, Settings, LogOut, Hash, Sparkles, UserCircle2, UserPlus, Building2, Star, X,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { useTeams, useProjects } from '@/hooks/use-teams-projects';
import { useNotifications } from '@/hooks/use-notifications';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useFavoritesDnd, useMobileNav, SIDEBAR_STARRED_DROP_ID } from '@/app/(app)/layout';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import { QuickAddTaskDialog } from '@/components/tasks/quick-add-task-dialog';
import { InviteDialog } from '@/components/admin/invite-dialog';
import { EditProfileDialog } from '@/components/people/edit-profile-dialog';

function NavLink({ href, icon: Icon, label, badge, active }: { href: string; icon: any; label: string; badge?: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium transition-colors',
        active ? 'bg-sidebar-hover text-sidebar-ink-strong' : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-ink-strong'
      )}
    >
      <Icon size={16.5} strokeWidth={2} className={active ? 'text-brand-500' : 'text-sidebar-ink-faint group-hover:text-sidebar-ink'} />
      <span className="flex-1 block truncate">{label}</span>
      {!!badge && (
        <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, workspace, role, members } = useWorkspace();
  const { teams } = useTeams(workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const { unreadCount } = useNotifications(user?.id);
  const { favoriteProjectIds, removeFavorite } = useFavoritesDnd();
  const { open: mobileOpen, setOpen: setMobileOpen } = useMobileNav();
  const { setNodeRef: setStarredDropRef, isOver: isOverStarred } = useDroppable({ id: SIDEBAR_STARRED_DROP_ID });
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [starredOpen, setStarredOpen] = useState(true);
  const [openTeamIds, setOpenTeamIds] = useState<Record<string, boolean>>({});
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // The drawer should get out of the way once a link is actually followed,
  // since it's a full off-canvas overlay below `lg` and would otherwise
  // cover the page it just navigated to.
  useEffect(() => {
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const untethered = projects.filter((p) => !p.team_id);
  const starredProjects = useMemo(
    () => projects.filter((p) => favoriteProjectIds.has(p.id)),
    [projects, favoriteProjectIds]
  );

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          // h-screen (100vh) renders taller than what's actually visible on
          // mobile browsers once the address-bar/toolbar chrome is factored
          // in, which pushed the bottom user-menu section (Profile, admin,
          // sign out) below the visible area with no way to scroll to it --
          // h-dvh tracks the real visible viewport instead.
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-[248px] shrink-0 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out',
          'lg:static lg:z-auto lg:h-screen lg:translate-x-0',
          mobileOpen && 'translate-x-0'
        )}
      >
        {/* Workspace switcher */}
        <div className="flex items-center gap-2 px-3.5 py-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L10 18L20 6" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="flex-1 block truncate text-[14px] font-semibold text-sidebar-ink-strong">{workspace?.name || 'Boost Hub'}</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-sidebar-ink-faint hover:bg-sidebar-hover hover:text-sidebar-ink-strong lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-2.5 pb-4">
          {/* Create button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mb-3 flex w-full items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-600">
                <Plus size={15} strokeWidth={2.5} />
                Create
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={() => setQuickAddOpen(true)}>
                <CheckSquare size={15} /> New task
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/projects/new')}>
                <LayoutGrid size={15} /> New project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCreateTeamOpen(true)}>
                <Users size={15} /> New team
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/portfolios?create=1')}>
                <Sparkles size={15} /> New portfolio
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/goals?create=1')}>
                <Target size={15} /> New goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <nav className="space-y-0.5">
            <NavLink href="/home" icon={Home} label="Home" active={pathname === '/home'} />
            <NavLink href="/my-tasks" icon={CheckSquare} label="My tasks" active={pathname.startsWith('/my-tasks')} />
            <NavLink href="/inbox" icon={Inbox} label="Inbox" badge={unreadCount} active={pathname.startsWith('/inbox')} />
          </nav>

          <div className="mt-5 space-y-0.5">
            <NavLink href="/portfolios" icon={Sparkles} label="Portfolios" active={pathname.startsWith('/portfolios')} />
            <NavLink href="/goals" icon={Target} label="Goals" active={pathname.startsWith('/goals')} />
            <NavLink href="/people" icon={Users} label="People" active={pathname.startsWith('/people')} />
          </div>

          {/* Starred projects (drag a project card here, or use its star toggle) */}
          <div className="mt-5">
            <button
              onClick={() => setStarredOpen((o) => !o)}
              className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-ink-faint hover:text-sidebar-ink"
            >
              {starredOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Star size={12} />
              Starred
            </button>
            {starredOpen && (
              <div
                ref={setStarredDropRef}
                className={cn(
                  'mt-1 space-y-0.5 rounded-lg p-0.5 transition-colors',
                  isOverStarred && 'bg-brand-50 ring-1 ring-inset ring-brand-200'
                )}
              >
                {starredProjects.length === 0 && (
                  <p className="px-2 py-2 text-xs leading-snug text-sidebar-ink-faint">
                    Drag a project here to give it a permanent seat
                  </p>
                )}
                {starredProjects.map((p) => (
                  <div key={p.id} className="group flex items-center rounded-lg hover:bg-sidebar-hover">
                    <Link
                      href={`/projects/${p.id}`}
                      className={cn(
                        'flex flex-1 items-center gap-2 truncate rounded-lg px-2.5 py-[6px] text-[13px]',
                        pathname.startsWith(`/projects/${p.id}`) ? 'bg-sidebar-hover text-sidebar-ink-strong' : 'text-sidebar-ink hover:text-sidebar-ink-strong'
                      )}
                    >
                      <Hash size={13} style={{ color: p.color || '#F14545' }} />
                      <span className="block truncate">{p.name}</span>
                    </Link>
                    <button
                      onClick={() => removeFavorite(p.id)}
                      title="Unpin from sidebar"
                      className="mr-1 hidden h-5 w-5 shrink-0 items-center justify-center rounded text-sidebar-ink-faint hover:bg-sidebar-hover hover:text-sidebar-ink-strong group-hover:flex"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teams tree */}
          <div className="mt-5">
            <button
              onClick={() => setTeamsOpen((o) => !o)}
              className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-ink-faint hover:text-sidebar-ink"
            >
              {teamsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Teams
            </button>
            {teamsOpen && (
              <div className="mt-1 space-y-0.5">
                {teams.map((team) => {
                  const teamProjects = projects.filter((p) => p.team_id === team.id);
                  const open = openTeamIds[team.id] ?? false;
                  return (
                    <div key={team.id}>
                      <div className="group flex items-center rounded-lg hover:bg-sidebar-hover">
                        <button
                          onClick={() => setOpenTeamIds((s) => ({ ...s, [team.id]: !open }))}
                          className="flex h-6 w-6 shrink-0 items-center justify-center text-sidebar-ink-faint"
                        >
                          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        <Link
                          href={`/teams/${team.id}`}
                          className={cn(
                            'flex flex-1 items-center gap-2 truncate py-[7px] pr-2 text-[13.5px] font-medium',
                            pathname === `/teams/${team.id}` ? 'text-sidebar-ink-strong' : 'text-sidebar-ink'
                          )}
                        >
                          <span
                            className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                            style={{ backgroundColor: team.color || '#6C5CE7', width: 18, height: 18 }}
                          >
                            {team.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="block truncate">{team.name}</span>
                        </Link>
                        <button
                          onClick={() => router.push(`/projects/new?team=${team.id}`)}
                          className="mr-1 hidden h-5 w-5 shrink-0 items-center justify-center rounded text-sidebar-ink-faint hover:bg-sidebar-hover hover:text-sidebar-ink-strong group-hover:flex"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      {open && (
                        <div className="ml-6 space-y-0.5 border-l border-sidebar-border pl-2">
                          {teamProjects.length === 0 && (
                            <p className="py-1 pl-2 text-xs text-sidebar-ink-faint">Still catching its breath — no projects yet</p>
                          )}
                          {teamProjects.map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects/${p.id}`}
                              className={cn(
                                'flex items-center gap-2 truncate rounded-lg px-2 py-[6px] text-[13px]',
                                pathname.startsWith(`/projects/${p.id}`) ? 'bg-sidebar-hover text-sidebar-ink-strong' : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-ink-strong'
                              )}
                            >
                              <Hash size={13} style={{ color: p.color || '#F14545' }} />
                              <span className="block truncate">{p.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Projects without a team */}
          {untethered.length > 0 && (
            <div className="mt-5">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-ink-faint">Projects</p>
              <div className="space-y-0.5">
                {untethered.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className={cn(
                      'flex items-center gap-2 truncate rounded-lg px-2.5 py-[6px] text-[13px]',
                      pathname.startsWith(`/projects/${p.id}`) ? 'bg-sidebar-hover text-sidebar-ink-strong' : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-ink-strong'
                    )}
                  >
                    <Hash size={13} style={{ color: p.color || '#F14545' }} />
                    <span className="block truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="border-t border-sidebar-border p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-sidebar-hover">
                <Avatar name={profile?.full_name} email={profile?.email} color={profile?.avatar_color} src={profile?.avatar_url} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-sidebar-ink-strong">{profile?.full_name || profile?.email}</p>
                  <p className="truncate text-[11px] capitalize text-sidebar-ink-faint">{role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-60">
              <DropdownMenuLabel>{profile?.full_name || profile?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => user && router.push(`/people/${user.id}`)}>
                <UserCircle2 size={15} /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/admin')}>
                <Building2 size={15} /> My organization
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setInviteOpen(true)}>
                <UserPlus size={15} /> Invite teammates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditProfileOpen(true)}>
                <Settings size={15} /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/admin')}>
                <Users size={15} /> Admin & members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut} className="text-red-600 data-[highlighted]:bg-red-50">
                <LogOut size={15} /> Sign out
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <p className="px-2.5 py-1 text-[11px] text-ink-faint">
                Built with <span className="text-red-500">❤</span> by Naveen Dadi
              </p>
              <p className="px-2.5 pb-1 text-[11px] text-ink-faint">
                Developed by{' '}
                <a
                  href="https://americanprimellc.com/about"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
                >
                  American Prime LLC
                </a>
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <CreateTeamDialog open={createTeamOpen} onOpenChange={setCreateTeamOpen} />
      <QuickAddTaskDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} profile={profile} />
    </>
  );
}

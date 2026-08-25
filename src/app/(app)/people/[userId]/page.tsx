'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, Building2, Calendar, Hash, Loader2, Pencil, Target, UserPlus } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { usePersonProfile } from '@/hooks/use-person';
import { SimpleTaskRow } from '@/components/tasks/simple-task-row';
import { Avatar } from '@/components/ui/avatar';
import { PROJECT_STATUS_META } from '@/lib/utils';
import { EditProfileDialog } from '@/components/people/edit-profile-dialog';
import { InviteDialog } from '@/components/admin/invite-dialog';

export default function PersonProfilePage({ params }: { params: { userId: string } }) {
  const { user, workspace } = useWorkspace();
  const { profile, tasks, projects, collaborators, loading, reload } = usePersonProfile(params.userId, workspace?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const isSelf = user?.id === params.userId;

  if (loading || !profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={20} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="flex items-start gap-4">
        <Avatar name={profile.full_name} email={profile.email} color={profile.avatar_color} src={profile.avatar_url} size={72} />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-2xl font-semibold text-ink">{profile.full_name || profile.email}</h1>
          {profile.out_of_office_until && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint">
              <Calendar size={12} /> Out of office until {profile.out_of_office_until}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {profile.title ? (
              <span className="flex items-center gap-1.5 text-ink-muted"><Briefcase size={13} /> {profile.title}</span>
            ) : isSelf ? (
              <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 text-ink-faint hover:text-brand-600">+ Add job title</button>
            ) : null}
            {profile.department ? (
              <span className="flex items-center gap-1.5 text-ink-muted"><Building2 size={13} /> {profile.department}</span>
            ) : isSelf ? (
              <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 text-ink-faint hover:text-brand-600">+ Add team or dept.</button>
            ) : null}
          </div>
          {profile.about_me ? (
            <p className="mt-2 max-w-lg text-sm text-ink-muted">{profile.about_me}</p>
          ) : isSelf ? (
            <button onClick={() => setEditOpen(true)} className="mt-2 text-sm text-ink-faint hover:text-brand-600">+ Add about me</button>
          ) : null}
          <p className="mt-1 text-xs text-ink-faint">{profile.email}</p>

          {isSelf && (
            <button
              onClick={() => setEditOpen(true)}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-hover"
            >
              <Pencil size={13} /> Edit profile
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold text-ink">{isSelf ? 'My tasks' : 'Tasks'}</h2>
            </div>
            {tasks.length > 0 ? (
              tasks.map((t) => <SimpleTaskRow key={t.id} task={t} showProject={false} />)
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">No open tasks assigned.</p>
            )}
          </div>

          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold text-ink">{isSelf ? 'My recent projects' : 'Recent projects'}</h2>
            </div>
            {projects.length > 0 ? (
              <div className="divide-y divide-border">
                {projects.map((p) => {
                  const meta = PROJECT_STATUS_META[p.status];
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-hover">
                      <Hash size={14} style={{ color: p.color || '#FC636B' }} />
                      <span className="flex-1 block truncate text-sm text-ink">{p.name}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">No projects yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Frequent collaborators</h2>
            {isSelf && (
              <button onClick={() => setInviteOpen(true)} className="mb-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-ink-faint hover:bg-surface-hover">
                <UserPlus size={15} /> Invite teammates
              </button>
            )}
            {collaborators.length > 0 ? (
              <div className="space-y-2.5">
                {collaborators.map((c) => (
                  <Link key={c.id} href={`/people/${c.id}`} className="flex items-center gap-2.5">
                    <Avatar name={c.full_name} email={c.email} color={c.avatar_color} src={c.avatar_url} size={28} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{c.full_name || c.email}</p>
                      {c.title && <p className="truncate text-xs text-ink-faint">{c.title}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No shared projects yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-border p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Target size={14} /> Goals</h2>
            <p className="mt-2 text-sm text-ink-muted">
              See goals this person owns on the{' '}
              <Link href="/goals" className="font-medium text-brand-600 hover:text-brand-700">Goals page</Link>.
            </p>
          </div>
        </div>
      </div>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} onSaved={reload} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

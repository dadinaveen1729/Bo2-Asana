'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-context';
import { createClient } from '@/lib/supabase/client';
import { AdminNav, type AdminSection } from '@/components/admin/admin-nav';
import { WorkspaceSettingsSection } from '@/components/admin/workspace-settings-section';
import { MembersSection, type MemberRow } from '@/components/admin/members-section';
import { TeamsSection } from '@/components/admin/teams-section';
import { TagsSection } from '@/components/admin/tags-section';
import { SecuritySection } from '@/components/admin/security-section';
import { DangerZoneSection } from '@/components/admin/danger-zone-section';
import type { Tables } from '@/types/database';

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const { workspace, role, user, refreshWorkspace } = useWorkspace();
  const [section, setSection] = useState<AdminSection>('workspace');
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<Tables<'invites'>[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'owner' || role === 'admin';

  const load = useCallback(async () => {
    if (!workspace) return;
    const [membersRes, invitesRes] = await Promise.all([
      supabase.from('workspace_members').select('user_id, role, profile:profiles(*)').eq('workspace_id', workspace.id),
      supabase.from('invites').select('*').eq('workspace_id', workspace.id).eq('accepted', false).order('created_at', { ascending: false }),
    ]);
    setRows((membersRes.data as any) || []);
    setInvites(invitesRes.data || []);
    setLoading(false);
  }, [workspace, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the member and invite lists live across admins/tabs, matching the
  // realtime-subscription style used by useTeams/useTags.
  useEffect(() => {
    if (!workspace || !isAdmin) return;
    const channel = supabase
      .channel(`admin:${workspace.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_id=eq.${workspace.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invites', filter: `workspace_id=eq.${workspace.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, workspace, isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <Shield className="mx-auto mb-2 text-ink-faint" size={22} />
          <p className="text-sm text-ink-muted">Only workspace admins can view this page.</p>
        </div>
      </div>
    );
  }

  const roleCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <h1 className="text-2xl font-semibold text-ink">Admin console</h1>
      <p className="mt-0.5 text-sm text-ink-muted">Manage {workspace?.name}&apos;s settings, members, and access.</p>

      <div className="mt-6 flex flex-col gap-8 sm:flex-row">
        <AdminNav active={section} onChange={setSection} />

        <div className="min-w-0 flex-1 pb-10">
          {loading || !workspace || !user ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand-500" size={18} />
            </div>
          ) : (
            <>
              {section === 'workspace' && <WorkspaceSettingsSection workspace={workspace} onSaved={refreshWorkspace} />}
              {section === 'members' && (
                <MembersSection
                  workspace={workspace}
                  currentUserId={user.id}
                  rows={rows}
                  invites={invites}
                  onRowsChange={(updater) => setRows(updater)}
                  onInvitesChange={(updater) => setInvites(updater)}
                />
              )}
              {section === 'teams' && <TeamsSection workspaceId={workspace.id} currentUserId={user.id} />}
              {section === 'tags' && <TagsSection workspaceId={workspace.id} />}
              {section === 'security' && <SecuritySection roleCounts={roleCounts} totalMembers={rows.length} />}
              {section === 'danger' && <DangerZoneSection workspaceId={workspace.id} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

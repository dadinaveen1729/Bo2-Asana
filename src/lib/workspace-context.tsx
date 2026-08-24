'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database';

type Profile = Tables<'profiles'>;
type Workspace = Tables<'workspaces'>;
type WorkspaceRole = Tables<'workspace_members'>['role'];

interface WorkspaceContextValue {
  user: User | null;
  profile: Profile | null;
  workspace: Workspace | null;
  role: WorkspaceRole | null;
  members: Profile[];
  loading: boolean;
  error: string | null;
  refreshMembers: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(
    async (workspaceId: string) => {
      const { data } = await supabase
        .from('workspace_members')
        .select('user_id, role, profiles(*)')
        .eq('workspace_id', workspaceId);
      if (data) {
        setMembers(data.map((m: any) => m.profiles).filter(Boolean));
      }
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || cancelled) {
        setLoading(false);
        return;
      }
      setUser(authUser);

      const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      if (cancelled) return;
      setProfile(profileRow);

      let { data: membership } = await supabase
        .from('workspace_members')
        .select('role, workspaces(*)')
        .limit(1)
        .maybeSingle();

      if (!membership) {
        const { data: defaultWs } = await supabase.from('workspaces').select('*').eq('is_default', true).maybeSingle();
        if (defaultWs) {
          await supabase.from('workspace_members').insert({ workspace_id: defaultWs.id, user_id: authUser.id, role: 'member' });
          const retry = await supabase
            .from('workspace_members')
            .select('role, workspaces(*)')
            .eq('workspace_id', defaultWs.id)
            .maybeSingle();
          membership = retry.data as any;
        }
      }

      if (cancelled) return;

      if (membership?.workspaces) {
        const ws = membership.workspaces as unknown as Workspace;
        setWorkspace(ws);
        setRole(membership.role as WorkspaceRole);
        await loadMembers(ws.id);
      } else {
        setError('Could not find or join a workspace. Contact your admin.');
      }

      setLoading(false);
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setWorkspace(null);
        setRole(null);
        setMembers([]);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadMembers]);

  const refreshMembers = useCallback(async () => {
    if (workspace) await loadMembers(workspace.id);
  }, [workspace, loadMembers]);

  return (
    <WorkspaceContext.Provider value={{ user, profile, workspace, role, members, loading, error, refreshMembers }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

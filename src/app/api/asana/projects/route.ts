import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listProjects, AsanaError } from '@/lib/asana';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { token, workspaceGid } = await req.json();
  if (!token || !workspaceGid) {
    return NextResponse.json({ error: 'Missing token or workspace.' }, { status: 400 });
  }

  try {
    const projects = await listProjects(token, workspaceGid);
    return NextResponse.json({ projects });
  } catch (err: any) {
    const status = err instanceof AsanaError ? err.status : 500;
    return NextResponse.json({ error: err.message || 'Could not reach Asana.' }, { status });
  }
}

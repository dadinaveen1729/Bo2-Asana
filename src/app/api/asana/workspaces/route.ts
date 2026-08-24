import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listWorkspaces, AsanaError } from '@/lib/asana';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing Asana token.' }, { status: 400 });
  }

  try {
    const workspaces = await listWorkspaces(token);
    return NextResponse.json({ workspaces });
  } catch (err: any) {
    const status = err instanceof AsanaError ? err.status : 500;
    return NextResponse.json({ error: err.message || 'Could not reach Asana.' }, { status });
  }
}

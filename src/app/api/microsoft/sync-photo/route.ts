import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUserPhoto } from '@/lib/microsoft-graph';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { userId, email } = (await req.json().catch(() => ({}))) as { userId?: string; email?: string };
  const targetUserId = userId || user.id;

  // Anyone can trigger a sync for themselves; syncing someone else requires admin/owner.
  if (targetUserId !== user.id) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only admins can sync another member’s photo.' }, { status: 403 });
    }
  }

  const { data: profile } = await supabase.from('profiles').select('email').eq('id', targetUserId).maybeSingle();
  const lookupEmail = email || profile?.email;
  if (!lookupEmail) return NextResponse.json({ error: 'No email on file for this user.' }, { status: 400 });

  try {
    const photo = await fetchUserPhoto(lookupEmail);
    if (!photo) {
      return NextResponse.json({ synced: false, reason: 'No Microsoft 365 photo is set for this account.' });
    }

    const ext = EXT_BY_MIME[photo.contentType] || 'jpg';
    const path = `${targetUserId}/ms365-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, photo.bytes, { contentType: photo.contentType, upsert: true });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl.publicUrl })
      .eq('id', targetUserId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ synced: true, avatarUrl: publicUrl.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Microsoft 365 photo sync failed.' }, { status: 500 });
  }
}

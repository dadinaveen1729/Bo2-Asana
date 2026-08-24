import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUserPhoto } from '@/lib/microsoft-graph';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      syncMicrosoftPhotoIfMissing(supabase).catch(() => {});
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

// Best-effort, non-blocking: fills in a profile photo from Microsoft 365 the
// first time someone confirms their account, if they don't already have one.
// Any failure (Graph not configured, no photo set, network hiccup) is
// swallowed so it never affects the login/confirmation redirect.
async function syncMicrosoftPhotoIfMissing(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;

  const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
  if (profile?.avatar_url) return;

  const photo = await fetchUserPhoto(user.email);
  if (!photo) return;

  const ext = photo.contentType === 'image/png' ? 'png' : photo.contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${user.id}/ms365-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, photo.bytes, { contentType: photo.contentType, upsert: true });
  if (uploadError) return;

  const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
  await supabase.from('profiles').update({ avatar_url: publicUrl.publicUrl }).eq('id', user.id);
}

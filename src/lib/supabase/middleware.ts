import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/reset-password') || path.startsWith('/accept-invite');
  // Server-to-server webhook routes (invoked by pg_net from a Postgres
  // trigger, not a browser) carry no session cookie and authenticate
  // themselves via an x-webhook-secret header instead. Without this bypass
  // every such call was silently redirected to /login (307), which the
  // caller can't follow as a POST, turning into a 405 -- so every invite
  // and notification email was failing before it ever reached Brevo.
  const isWebhookRoute = path.startsWith('/api/notifications/email');
  // Link-preview crawlers (Slack, iMessage, WhatsApp, Discord, etc.) fetch
  // og:image/twitter:image anonymously -- no session cookie. Without this
  // bypass they'd get redirected to the /login HTML instead of the actual
  // image, so every shared link would show a blank/broken preview card.
  const isShareImage = path.startsWith('/opengraph-image') || path.startsWith('/twitter-image');
  const isPublicAsset = path.startsWith('/_next') || path.startsWith('/favicon') || path.startsWith('/api/public') || isWebhookRoute || isShareImage;

  if (!user && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

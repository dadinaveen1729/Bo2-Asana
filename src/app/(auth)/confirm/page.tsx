'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const COPY: Record<string, { title: string; body: string; cta: string }> = {
  recovery: {
    title: 'Reset your password',
    body: "One more click and you're in — this confirms it's really you before we let you set a new password.",
    cta: 'Continue to reset password',
  },
  signup: {
    title: 'Confirm your account',
    body: "Last step. Click below to activate your account and join the Boost Oxygen workspace.",
    cta: 'Confirm and join Boost Hub',
  },
  email_change: {
    title: 'Confirm your new email',
    body: "Click below to confirm this is your new email address.",
    cta: 'Confirm email',
  },
};

// Deliberately a click, not something that fires on page load. Corporate
// email security scanners (Microsoft Safe Links and similar) auto-open
// links in incoming mail to check them for malware -- if verification ran
// automatically here, the scanner's bot would burn the one-time token
// before the actual person ever saw the email, and every link would look
// "already used" by the time someone clicked it. Requiring a real click
// means a scanner just sees an inert page; only a human lands on it and
// presses the button, so the token stays valid until they do.
function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenHash = params.get('token_hash');
  const type = params.get('type') || 'recovery';
  const next = params.get('next') || (type === 'recovery' ? '/update-password' : '/home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!tokenHash) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
    setLoading(false);
    if (error) {
      setError("This link has expired or was already used. Head back and request a new one.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (!tokenHash) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ShieldAlert size={22} />
        </div>
        <h1 className="text-xl font-semibold text-ink">This link isn't valid</h1>
        <p className="mt-2 text-sm text-ink-muted">
          It may have already been used, or got cut off somewhere. Head back and request a new one.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </div>
    );
  }

  const copy = COPY[type] || COPY.recovery;

  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold text-ink">{copy.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{copy.body}</p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-left text-sm text-red-700">{error}</div>
      )}

      <button
        onClick={handleConfirm}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? 'Just a sec…' : copy.cta}
      </button>

      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmForm />
    </Suspense>
  );
}

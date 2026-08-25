import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <span className="text-2xl font-bold">404</span>
      </div>
      <h1 className="mt-5 text-xl font-semibold text-ink">Looks like this page ran out of oxygen.</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        We checked everywhere — under the couch, behind the sidebar — this page just isn't here.
      </p>
      <Link
        href="/home"
        className="mt-6 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
      >
        Back to fresh air
      </Link>
    </div>
  );
}

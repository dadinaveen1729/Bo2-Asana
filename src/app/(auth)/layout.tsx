export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0B14] px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 10%, rgba(252,99,107,0.35) 0%, rgba(252,99,107,0) 60%), radial-gradient(50% 45% at 85% 90%, rgba(108,92,231,0.35) 0%, rgba(108,92,231,0) 60%), #0B0B14',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L10 18L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Boost Hub</span>
        </div>
        <div className="animate-slide-up rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-white/40">Internal work management for Boost Oxygen — now with 100% more oxygen.</p>
        <p className="mt-2 text-center text-xs text-white/30">
          Developed by{' '}
          <a
            href="https://americanprimellc.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-white/50 hover:text-white/80"
          >
            American Prime LLC
          </a>
        </p>
      </div>
    </div>
  );
}

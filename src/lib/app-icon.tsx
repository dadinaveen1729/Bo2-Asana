// Shared JSX for every PWA/home-screen icon size (apple-icon, manifest
// icons), so the checkmark mark stays pixel-identical to icon.svg and
// opengraph-image.tsx instead of being redrawn per file.
export function AppIconMark({ size, maskable = false }: { size: number; maskable?: boolean }) {
  // Maskable icons are clipped by the OS into its own shape (circle,
  // squircle, ...), so content must sit inside the safe zone with the
  // background filling the full square -- no rounding, more padding.
  const radius = maskable ? 0 : Math.round(size * 0.25);
  const markScale = maskable ? 0.42 : 0.55;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FC636B',
        borderRadius: radius,
      }}
    >
      <svg width={`${markScale * 100}%`} height={`${markScale * 100}%`} viewBox="0 0 24 24" fill="none">
        <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

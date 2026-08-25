// Shared JSX for both opengraph-image.tsx and twitter-image.tsx, so the
// share-preview card looks identical on every platform without duplicating
// the markup in two Next.js special-file route handlers.
export function BoostHubOgCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B0B14',
        backgroundImage:
          'radial-gradient(60% 55% at 12% 10%, rgba(252,99,107,0.45) 0%, rgba(252,99,107,0) 60%), radial-gradient(55% 50% at 88% 92%, rgba(108,92,231,0.45) 0%, rgba(108,92,231,0) 60%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 128,
          height: 128,
          borderRadius: 32,
          backgroundColor: '#FC636B',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40,
          boxShadow: '0 20px 60px rgba(252,99,107,0.4)',
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, color: 'white', letterSpacing: -2 }}>Boost Hub</div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 30, color: 'rgba(255,255,255,0.55)' }}>
        Internal work management for Boost Oxygen
      </div>
    </div>
  );
}

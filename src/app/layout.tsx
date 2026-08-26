import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const APP_URL = 'https://bo2-asana.vercel.app';
const DESCRIPTION = 'Internal work management for Boost Oxygen — now with 100% more oxygen.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'Boost Hub',
  description: DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Boost Hub',
  },
  openGraph: {
    title: 'Boost Hub',
    description: DESCRIPTION,
    url: APP_URL,
    siteName: 'Boost Hub',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Boost Hub',
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FC636B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
        <PwaRegister />
      </body>
    </html>
  );
}

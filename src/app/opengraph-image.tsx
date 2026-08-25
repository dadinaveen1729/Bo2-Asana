import { ImageResponse } from 'next/og';
import { BoostHubOgCard } from '@/lib/og-image';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Boost Hub — internal work management for Boost Oxygen';

export default function OpengraphImage() {
  return new ImageResponse(<BoostHubOgCard />, { ...size });
}

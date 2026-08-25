'use client';

import { Check } from 'lucide-react';
import { cn, colorForIndex } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const SWATCH_COLORS = Array.from({ length: 10 }, (_, i) => colorForIndex(i));

export function ColorSwatchPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change color"
          className="h-6 w-6 shrink-0 rounded-full ring-2 ring-offset-2 transition"
          style={{ backgroundColor: value, ['--tw-ring-color' as any]: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="flex max-w-[150px] flex-wrap gap-1.5">
          {SWATCH_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn('flex h-6 w-6 items-center justify-center rounded-full', value === c && 'ring-2 ring-offset-2')}
              style={{ backgroundColor: c, ['--tw-ring-color' as any]: c }}
            >
              {value === c && <Check size={11} className="text-white" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

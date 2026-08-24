import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  color?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}

export function Avatar({ name, email, color, src, size = 24, className, ring }: AvatarProps) {
  const bg = color || '#6C5CE7';
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white',
        ring && 'ring-2 ring-white',
        className
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.max(9, size * 0.4) }}
      title={name || email || undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || ''} className="h-full w-full object-cover" />
      ) : (
        initials(name, email)
      )}
    </div>
  );
}

export function AvatarStack({
  people,
  size = 22,
  max = 4,
}: {
  people: { name?: string | null; email?: string | null; color?: string | null; src?: string | null }[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center" style={{ paddingLeft: 4 }}>
      {shown.map((p, i) => (
        <div key={i} style={{ marginLeft: -6 }}>
          <Avatar {...p} size={size} ring />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{ marginLeft: -6, width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
          className="flex shrink-0 items-center justify-center rounded-full bg-ink-faint font-medium text-white ring-2 ring-white"
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

import * as React from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A framed photo tile. Renders over a gradient so it always looks intentional,
 * and if the remote image fails to load it gracefully falls back to just the
 * gradient + an icon (no broken-image state).
 */
export function Shot({
  src,
  alt,
  className,
  gradient = 'from-primary/30 via-sky-400/20 to-fuchsia-400/20',
  icon: Icon = ImageIcon,
}: {
  src: string;
  alt: string;
  className?: string;
  gradient?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [failed, setFailed] = React.useState(false);
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl',
        'bg-gradient-to-br',
        gradient,
        className,
      )}
    >
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <Icon className="h-10 w-10 text-white/70" />
        </div>
      )}
      {/* subtle top sheen, very Apple */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
    </div>
  );
}

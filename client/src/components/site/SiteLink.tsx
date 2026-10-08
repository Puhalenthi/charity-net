import { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Camera,
  CircleCheck,
  Gift,
  Handshake,
  Heart,
  House,
  Leaf,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Recycle,
  Sparkles,
  Star,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { SiteIcon } from '@charity-net/shared';

export const SITE_ICON_COMPONENTS: Record<SiteIcon, LucideIcon> = {
  camera: Camera,
  'map-pin': MapPin,
  'message-circle': MessageCircle,
  heart: Heart,
  truck: Truck,
  package: Package,
  home: House,
  users: Users,
  gift: Gift,
  recycle: Recycle,
  star: Star,
  phone: Phone,
  calendar: Calendar,
  'check-circle': CircleCheck,
  sparkles: Sparkles,
  handshake: Handshake,
  warehouse: Warehouse,
  leaf: Leaf,
};

/**
 * True inside the Site editor's live preview: links render inert so clicking
 * a button selects its section instead of navigating away from the editor.
 */
export const SitePreviewContext = createContext(false);

export function SiteLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const preview = useContext(SitePreviewContext);
  if (preview || !href) return <span className={className}>{children}</span>;
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}

/** Plain text with blank-line paragraph breaks (no HTML, ever). */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className={className}>
          {p.split('\n').map((line, j, all) => (
            <span key={j}>
              {line}
              {j < all.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}

import { Link } from 'react-router-dom';
import { Clock, MapPin } from 'lucide-react';
import type { Item } from '@charity-net/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils';

export function ItemCard({ item }: { item: Item }) {
  const cover = item.images[0]?.url;
  const deadlineLabel = item.status === 'active'
    ? formatRelative(item.interestDeadline)
    : item.status;
  return (
    <Link to={`/items/${item.id}`} className="block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        {cover && (
          <div className="aspect-[4/3] bg-muted">
            <img src={cover} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold line-clamp-1">{item.title}</div>
            {item.aiCategory && <Badge variant="secondary">{item.aiCategory}</Badge>}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.aiTags.slice(0, 4).map((t) => (
              <span key={t} className="text-xs rounded-full bg-muted px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location.city ?? 'Nearby'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {deadlineLabel}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
  variant?: "default" | "shimmer" | "pulse" | "wave";
  hasImage?: boolean;
  hasActions?: boolean;
  className?: string;
}

export function SkeletonCard({ 
  variant = "shimmer", 
  hasImage = false, 
  hasActions = false,
  className 
}: SkeletonCardProps) {
  return (
    <Card className={className}>
      {hasImage && (
        <Skeleton variant={variant} className="h-48 w-full rounded-t-lg rounded-b-none" />
      )}
      <CardHeader>
        <Skeleton variant={variant} className="h-6 w-3/4 mb-2" />
        <Skeleton variant={variant} className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton variant={variant} className="h-4 w-full" />
        <Skeleton variant={variant} className="h-4 w-5/6" />
        <Skeleton variant={variant} className="h-4 w-4/6" />
        {hasActions && (
          <div className="flex gap-2 pt-2">
            <Skeleton variant={variant} className="h-9 w-24" />
            <Skeleton variant={variant} className="h-9 w-24" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SkeletonListProps {
  count?: number;
  variant?: "default" | "shimmer" | "pulse" | "wave";
  hasImage?: boolean;
  hasActions?: boolean;
  className?: string;
}

export function SkeletonList({ 
  count = 3, 
  variant = "shimmer",
  hasImage = false,
  hasActions = false,
  className 
}: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard 
          key={i} 
          variant={variant}
          hasImage={hasImage}
          hasActions={hasActions}
          className="mb-4"
        />
      ))}
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  variant?: "default" | "shimmer" | "pulse" | "wave";
  hasImage?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function SkeletonGrid({ 
  count = 4, 
  variant = "shimmer",
  hasImage = true,
  columns = 4,
  className 
}: SkeletonGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 md:gap-6 ${className || ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard 
          key={i} 
          variant={variant}
          hasImage={hasImage}
        />
      ))}
    </div>
  );
}

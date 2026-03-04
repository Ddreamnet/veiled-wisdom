import { Skeleton } from '@/components/ui/skeleton';

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  </div>
);

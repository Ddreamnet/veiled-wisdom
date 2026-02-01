import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

interface ListingStatsProps {
  totalListings: number;
  activeListings: number;
  inactiveListings: number;
}

export function ListingStats({ totalListings, activeListings, inactiveListings }: ListingStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Toplam İlan</p>
              <p className="text-2xl font-bold">{totalListings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktif İlan</p>
              <p className="text-2xl font-bold">{activeListings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pasif İlan</p>
              <p className="text-2xl font-bold">{inactiveListings}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Video, MessageSquare, Package } from 'lucide-react';
import { ListingWithPrices } from '../types';
import { ConsultationType } from '@/lib/supabase';

interface ListingCardProps {
  listing: ListingWithPrices;
  onEdit: (listing: ListingWithPrices) => void;
  onDelete: (id: string) => void;
}

const formatDurationLabel = (minutes: number, type: ConsultationType) => {
  if (type === 'product') {
    return `${minutes} adet`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return type === 'video' 
        ? `${hours} saat görüntülü görüşme`
        : `${hours} saat mesajlaşma`;
    }
    return type === 'video'
      ? `${hours} saat ${remainingMinutes} dk görüntülü görüşme`
      : `${hours} saat ${remainingMinutes} dk mesajlaşma`;
  }
  return type === 'video'
    ? `${minutes} dakika görüntülü görüşme`
    : `${minutes} dakika mesajlaşma`;
};

const getConsultationIcon = (type: ConsultationType) => {
  switch (type) {
    case 'video':
      return <Video className="h-3 w-3" />;
    case 'messaging':
      return <MessageSquare className="h-3 w-3" />;
    case 'product':
      return <Package className="h-3 w-3" />;
    default:
      return <Video className="h-3 w-3" />;
  }
};

const getConsultationLabel = (type: ConsultationType) => {
  switch (type) {
    case 'video':
      return 'Görüntülü';
    case 'messaging':
      return 'Mesajlaşma';
    case 'product':
      return 'Ürün';
    default:
      return 'Görüntülü';
  }
};

export function ListingCard({ listing, onEdit, onDelete }: ListingCardProps) {
  const consultationType = listing.consultation_type || 'video';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {listing.cover_url && (
        <div className="relative h-32 sm:h-40 overflow-hidden">
          <img
            src={listing.cover_url}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Badge variant={listing.is_active ? "default" : "secondary"} className="text-xs">
              {listing.is_active ? 'Aktif' : 'Pasif'}
            </Badge>
          </div>
        </div>
      )}
      
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base sm:text-lg line-clamp-2">{listing.title}</CardTitle>
          {!listing.cover_url && (
            <Badge variant={listing.is_active ? "default" : "secondary"} className="text-xs shrink-0">
              {listing.is_active ? 'Aktif' : 'Pasif'}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge variant="outline" className="text-xs">
            {listing.category?.name || 'Kategori yok'}
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            {getConsultationIcon(consultationType)}
            {getConsultationLabel(consultationType)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {listing.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {listing.description}
          </p>
        )}
        
        {listing.prices.length > 0 && (
          <div className="space-y-1 mb-4">
            {listing.prices.slice(0, 3).map((price) => (
              <div key={price.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatDurationLabel(price.duration_minutes, consultationType)}
                </span>
                <span className="font-medium">{price.price} TL</span>
              </div>
            ))}
            {listing.prices.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{listing.prices.length - 3} paket daha
              </p>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(listing)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Düzenle
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(listing.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

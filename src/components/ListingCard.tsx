import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import type { ListingWithProfile } from "@/types/database";

interface ListingCardProps {
  listing: ListingWithProfile;
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link to={`/listings/${listing.id}`}>
      <Card className="hover:shadow-glow transition-smooth h-full card-hover">
        {listing.cover_url ? (
          <img
            src={listing.cover_url}
            alt={listing.title}
            loading="lazy"
            decoding="async"
            className="w-full h-40 sm:h-44 md:h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-40 sm:h-44 md:h-48 bg-primary/20 rounded-t-lg" />
        )}
        <CardContent className="p-4 sm:p-5 md:p-6">
          <Link
            to={`/profile/${listing.teacher_id}`}
            className="flex items-center gap-2 mb-3 hover:opacity-80 transition-smooth w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            {listing.profiles.avatar_url ? (
              <img
                src={listing.profiles.avatar_url}
                alt={listing.profiles.username}
                loading="lazy"
                decoding="async"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-xs sm:text-sm text-muted-foreground">
              {listing.profiles.username}
            </span>
          </Link>
          <h3 className="font-semibold text-base sm:text-lg mb-2">{listing.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {listing.description}
          </p>
          {listing.minPrice && (
            <p className="text-sm font-semibold text-primary">
              {listing.minPrice} ₺'den başlayan fiyatlarla
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

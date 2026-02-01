import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { ReviewWithProfile } from "../types";

interface ReviewsSectionProps {
  reviews: ReviewWithProfile[];
  averageRating: number;
}

export function ReviewsSection({ reviews, averageRating }: ReviewsSectionProps) {
  return (
    <Card className="border-2">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xl md:text-2xl flex items-center gap-2">
            <Star className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            Yorumlar
          </span>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 text-base md:text-lg">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{averageRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({reviews.length} değerlendirme)
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-sm md:text-base text-muted-foreground text-center py-6 md:py-8">
            Henüz yorum bulunmuyor.
          </p>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b last:border-0 pb-4 md:pb-6 last:pb-0"
              >
                <div className="flex items-start gap-3 md:gap-4 mb-2 md:mb-3">
                  <Avatar className="w-8 h-8 md:w-10 md:h-10">
                    <AvatarImage src={review.customer.avatar_url || undefined} />
                    <AvatarFallback>
                      {review.customer.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm md:text-base truncate">
                        {review.customer.username}
                      </p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 md:w-4 md:h-4 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5 md:mb-2">
                      {new Date(review.created_at).toLocaleDateString("tr-TR")}
                    </p>
                    <p className="text-xs md:text-sm text-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
    <Card className="border border-border/40 shadow-sm rounded-xl">
      <CardHeader className="px-4 py-2.5 bg-muted/20">
        <CardTitle className="flex items-center justify-between">
          <span className="text-sm md:text-base font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            Yorumlar
          </span>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs md:text-sm">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({reviews.length})
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Henüz yorum bulunmuyor.
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-border/30 last:border-0 pb-3 last:pb-0"
              >
                <div className="flex items-start gap-3 mb-1.5">
                  <Avatar className="w-7 h-7 md:w-8 md:h-8">
                    <AvatarImage src={review.customer.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {review.customer.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-semibold text-xs md:text-sm truncate">
                        {review.customer.username}
                      </p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1">
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

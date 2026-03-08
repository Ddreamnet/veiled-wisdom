import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

import { TeacherDetails, ReviewWithProfile } from "../types";

interface TeacherInfoCardProps {
  teacher: TeacherDetails;
  teacherId: string;
  reviews: ReviewWithProfile[];
  averageRating: number;
  currentUserId?: string;
}

export function TeacherInfoCard({
  teacher,
  teacherId,
  reviews,
  averageRating,
}: TeacherInfoCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = !!teacher.bio && teacher.bio.length > 300;

  return (
    <Card className="border border-border/40 shadow-sm rounded-xl">
      <CardHeader className="px-4 py-2.5 bg-gradient-to-r from-primary/3 to-primary/6">
        <CardTitle className="text-sm md:text-base font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          Uzman Hakkında
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Clickable avatar + name area */}
        <Link
          to={`/profile/${teacherId}`}
          className="flex items-center gap-3 group hover:bg-accent/30 rounded-lg p-2 -m-2 transition-colors"
        >
          {teacher.avatar_url ? (
            <img
              src={teacher.avatar_url}
              alt={teacher.username}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg md:text-xl text-primary">
                {teacher.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm md:text-base truncate group-hover:text-primary transition-colors">
                {teacher.username}
              </h3>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {reviews.length > 0 ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span>({reviews.length} değerlendirme)</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Henüz değerlendirme yok</p>
            )}
          </div>
        </Link>

        {/* Compact info rows */}
        <div className="space-y-2 text-xs md:text-sm">
          {teacher.specialization && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground whitespace-nowrap">Uzmanlık:</span>
              <span className="text-muted-foreground">{teacher.specialization}</span>
            </div>
          )}

          {teacher.years_of_experience !== undefined && teacher.years_of_experience !== null && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground whitespace-nowrap">Deneyim:</span>
              <span className="text-muted-foreground">{teacher.years_of_experience} yıl</span>
            </div>
          )}

          {teacher.education && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground whitespace-nowrap">Eğitim:</span>
              <span className="text-muted-foreground">{teacher.education}</span>
            </div>
          )}

          {teacher.bio && (
            <div className="pt-1 border-t border-border/30">
              <p
                className={`text-muted-foreground leading-relaxed whitespace-pre-line ${
                  !expanded && isLong ? "line-clamp-4" : ""
                }`}
              >
                {teacher.bio}
              </p>
              {isLong && (
                <Button
                  variant="ghost"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 h-7 px-2 text-xs text-primary hover:text-primary/80"
                >
                  {expanded ? (
                    <>
                      Daha az göster <ChevronUp className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Devamını oku <ChevronDown className="ml-1 h-3 w-3" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
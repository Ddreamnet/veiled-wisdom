import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare } from "lucide-react";
import { getOptimizedAvatarUrl } from "@/lib/imageOptimizer";
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
  currentUserId,
}: TeacherInfoCardProps) {
  const navigate = useNavigate();
  const canMessage = currentUserId && currentUserId !== teacherId;

  return (
    <Card className="border-2 shadow-md">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Uzman Hakkında
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-5 p-5 md:p-6">
        <div className="flex items-start gap-3 md:gap-4 pb-3 md:pb-4 border-b">
          {teacher.avatar_url ? (
            <img
              src={getOptimizedAvatarUrl(teacher.avatar_url)}
              alt={teacher.username}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl md:text-2xl text-primary">
                {teacher.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base md:text-lg mb-1 truncate">
              {teacher.username}
            </h3>
            {reviews.length > 0 ? (
              <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-xs md:text-sm">({reviews.length} değerlendirme)</span>
              </div>
            ) : (
              <div className="text-xs md:text-sm text-muted-foreground">
                Henüz değerlendirme yok
              </div>
            )}
          </div>
        </div>

        {teacher.specialization && (
          <div>
            <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">
              Uzmanlık Alanı
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              {teacher.specialization}
            </p>
          </div>
        )}

        {teacher.years_of_experience !== undefined && teacher.years_of_experience !== null && (
          <div>
            <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">
              Deneyim
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              {teacher.years_of_experience} yıl
            </p>
          </div>
        )}

        {teacher.education && (
          <div>
            <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">
              Eğitim
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">{teacher.education}</p>
          </div>
        )}

        {teacher.bio && (
          <div>
            <p className="text-xs md:text-sm font-medium text-foreground mb-0.5 md:mb-1">
              Hakkında
            </p>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {teacher.bio}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {canMessage && (
            <Button
              onClick={() => navigate(`/messages?userId=${teacherId}`)}
              className="w-full"
              variant="default"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Mesaj Gönder
            </Button>
          )}

          <Link to={`/profile/${teacherId}`}>
            <Button variant="outline" className="w-full">
              Profili Görüntüle
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

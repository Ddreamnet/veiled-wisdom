import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Mail, Phone, GraduationCap, Calendar, AlertTriangle, Wrench } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { TeacherApproval } from "../types";

interface ApprovalCardProps {
  approval: TeacherApproval;
  showActions?: boolean;
  loading: boolean;
  repairing: string | null;
  onRepair: (approval: TeacherApproval) => void;
  onApproval: (approvalId: string, userId: string, approve: boolean) => void;
}

export function ApprovalCard({
  approval,
  showActions = false,
  loading,
  repairing,
  onRepair,
  onApproval,
}: ApprovalCardProps) {
  const needsRepair = approval.hasProfileIssue || approval.hasRoleIssue;
  const isRepairing = repairing === approval.id;

  return (
    <Card className={needsRepair ? "border-amber-500/50" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {approval.profiles.avatar_url ? (
              <img
                src={approval.profiles.avatar_url}
                alt={approval.profiles.username}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {approval.profiles.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <CardTitle className="flex items-center gap-2">
                {approval.profiles.username}
                {needsRepair && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Onarım Gerekli
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                {new Date(approval.created_at).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <Badge
            variant={
              approval.status === "approved"
                ? "default"
                : approval.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {approval.status === "pending" ? "Bekliyor" : approval.status === "approved" ? "Onaylandı" : "Reddedildi"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsRepair && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400 mb-2">Tespit edilen sorunlar:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              {approval.hasProfileIssue && <li>Kullanıcı profili eksik</li>}
              {approval.hasRoleIssue && <li>Uzman rolü atanmamış</li>}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-amber-500/50 hover:bg-amber-500/10"
              onClick={() => onRepair(approval)}
              disabled={isRepairing}
            >
              <Wrench className="h-4 w-4 mr-2" />
              {isRepairing ? "Onarılıyor..." : "Profili Onar"}
            </Button>
          </div>
        )}

        <div className="grid gap-3 text-sm">
          {approval.profiles.email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">E-posta:</span>{" "}
                <span className="text-muted-foreground">{approval.profiles.email}</span>
              </div>
            </div>
          )}
          {approval.phone && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Telefon:</span>{" "}
                <span className="text-muted-foreground">{approval.phone}</span>
              </div>
            </div>
          )}
          {approval.date_of_birth && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Doğum Tarihi:</span>{" "}
                <span className="text-muted-foreground">
                  {new Date(approval.date_of_birth).toLocaleDateString("tr-TR")}
                </span>
              </div>
            </div>
          )}
          {approval.specialization && (
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Uzmanlık Alanı:</span>{" "}
                <span className="text-muted-foreground">{approval.specialization}</span>
              </div>
            </div>
          )}
          {approval.education && (
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Eğitim:</span>{" "}
                <span className="text-muted-foreground whitespace-pre-wrap">{approval.education}</span>
              </div>
            </div>
          )}
          {approval.years_of_experience !== null && (
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">Deneyim:</span>{" "}
                <span className="text-muted-foreground">{approval.years_of_experience} yıl</span>
              </div>
            </div>
          )}
          {approval.status !== "pending" && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-primary" />
              <div>
                <span className="font-medium">İncelenme Tarihi:</span>{" "}
                <span className="text-muted-foreground">
                  {new Date(approval.updated_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={loading}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Onayla
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Başvuruyu Onayla</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{approval.profiles.username}</strong> kullanıcısını uzman olarak onaylamak istediğinize
                    emin misiniz? Onaylandıktan sonra giriş yapabilecek.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onApproval(approval.id, approval.user_id, true)}>
                    Onayla
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={loading}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reddet
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Başvuruyu Reddet</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{approval.profiles.username}</strong> kullanıcısının başvurusunu reddetmek istediğinize
                    emin misiniz?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onApproval(approval.id, approval.user_id, false)}>
                    Reddet
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

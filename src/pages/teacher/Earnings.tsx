import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TurkishLira, Calendar, CreditCard, Clock, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type PayoutHistory = {
  id: string;
  appointment_count: number;
  amount: number;
  paid_at: string;
};

type EarningsSummary = {
  totalCompleted: number;
  totalEarnings: number;
  pendingCount: number;
  pendingAmount: number;
};

export default function TeacherEarnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<EarningsSummary>({
    totalCompleted: 0,
    totalEarnings: 0,
    pendingCount: 0,
    pendingAmount: 0,
  });
  const [payouts, setPayouts] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all data in parallel
      const [completedResult, payoutSummaryResult, payoutHistoryResult] = await Promise.all([
        supabase.from("appointments").select("price_at_booking").eq("teacher_id", user.id).eq("status", "completed"),
        supabase.from("teacher_payouts").select("appointment_count, amount").eq("teacher_id", user.id),
        supabase.from("teacher_payouts").select("*").eq("teacher_id", user.id).order("paid_at", { ascending: false }),
      ]);

      const completed = completedResult.data || [];
      const payoutData = payoutSummaryResult.data || [];

      const totalCompleted = completed.length;
      const totalEarnings = completed.reduce((sum, apt) => sum + Number(apt.price_at_booking), 0);

      const paidCount = payoutData.reduce((sum, p) => sum + p.appointment_count, 0);
      const paidAmount = payoutData.reduce((sum, p) => sum + Number(p.amount), 0);

      setSummary({
        totalCompleted,
        totalEarnings,
        pendingCount: totalCompleted - paidCount,
        pendingAmount: totalEarnings - paidAmount,
      });

      if (payoutHistoryResult.data) {
        setPayouts(payoutHistoryResult.data);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 md:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb Navigation - Desktop only */}
      <div className="mb-4 hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Ana Sayfa
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/profile">Uzman</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Gelirlerim</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Back Button - Mobile only */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 md:hidden">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Gelirlerim</h1>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton variant="shimmer" className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton variant="shimmer" className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton variant="shimmer" className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton variant="wave" className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Tamamlanan Randevular</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold">{summary.totalCompleted}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TurkishLira className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Toplam Gelir</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold break-words">{summary.totalEarnings.toFixed(2)} TL</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Ödenecek Randevu</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold">{summary.pendingCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Ödenecek Miktar</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold break-words">{summary.pendingAmount.toFixed(2)} TL</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Ödeme Geçmişi</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {payouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Henüz ödeme geçmişiniz bulunmuyor.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ödenen Randevu Sayısı</TableHead>
                      <TableHead>Ödeme Miktarı</TableHead>
                      <TableHead>Ödeme Tarihi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>{payout.appointment_count}</TableCell>
                        <TableCell>{Number(payout.amount).toFixed(2)} TL</TableCell>
                        <TableCell>
                          {new Date(payout.paid_at).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

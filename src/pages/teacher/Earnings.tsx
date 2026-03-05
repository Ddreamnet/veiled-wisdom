import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CreditCard, Clock, Home } from "lucide-react";
import { TurkishLiraIcon } from "@/components/icons/TurkishLiraIcon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";

type EarningsSummary = {
  totalTransactions: number;
  totalTeacherEarnings: number;
  pendingCount: number;
  pendingAmount: number;
  // Legacy
  legacyCount: number;
  legacyAmount: number;
};

type PayoutHistory = {
  id: string;
  appointment_count: number;
  amount: number;
  paid_at: string;
};

export default function TeacherEarnings() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EarningsSummary>({
    totalTransactions: 0,
    totalTeacherEarnings: 0,
    pendingCount: 0,
    pendingAmount: 0,
    legacyCount: 0,
    legacyAmount: 0,
  });
  const [payouts, setPayouts] = useState<PayoutHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const nowIso = new Date().toISOString();

      const [ledgerResult, legacyResult, payoutHistoryResult] = await Promise.all([
        // Ledger-based earnings
        supabase
          .from("earnings_ledger")
          .select("teacher_amount, payout_id")
          .eq("teacher_id", user.id),
        // Legacy: appointments without payment_request_id
        supabase
          .from("appointments")
          .select("price_at_booking")
          .eq("teacher_id", user.id)
          .eq("status", "confirmed")
          .lt("end_ts", nowIso)
          .is("payment_request_id", null),
        supabase
          .from("teacher_payouts")
          .select("*")
          .eq("teacher_id", user.id)
          .order("paid_at", { ascending: false }),
      ]);

      const ledger = ledgerResult.data || [];
      const legacy = legacyResult.data || [];

      const ledgerTeacherTotal = ledger.reduce((s, e) => s + Number(e.teacher_amount), 0);
      const unpaidLedger = ledger.filter((e) => !e.payout_id);
      const unpaidAmount = unpaidLedger.reduce((s, e) => s + Number(e.teacher_amount), 0);

      const legacyTotal = legacy.reduce((s, a) => s + Number(a.price_at_booking), 0);
      const legacyTeacherAmount = legacyTotal * (1 - PLATFORM_COMMISSION_RATE);

      setSummary({
        totalTransactions: ledger.length + legacy.length,
        totalTeacherEarnings: ledgerTeacherTotal + legacyTeacherAmount,
        pendingCount: unpaidLedger.length,
        pendingAmount: unpaidAmount,
        legacyCount: legacy.length,
        legacyAmount: legacyTeacherAmount,
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
                  <span className="truncate">Toplam İşlem</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold">{summary.totalTransactions}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TurkishLiraIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Toplam Kazanç</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold break-words">{summary.totalTeacherEarnings.toFixed(2)} TL</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Ödenecek İşlem</span>
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
                  <span className="truncate">Ödenecek Tutar</span>
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
                      <TableHead>Kalem Sayısı</TableHead>
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

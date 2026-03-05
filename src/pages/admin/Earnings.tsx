import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/useToast";
import { TrendingUp, Calendar, Filter, Eye } from "lucide-react";
import { TurkishLiraIcon } from "@/components/icons/TurkishLiraIcon";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { UnifiedBreadcrumb as AdminBreadcrumb } from "@/components/UnifiedBreadcrumb";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";

// Lazy load chart components
const ChartContainer = lazy(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartContainer })));
const ChartTooltip = lazy(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltip })));
const ChartTooltipContent = lazy(() =>
  import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltipContent })),
);
const AreaChart = lazy(() => import("recharts").then((m) => ({ default: m.AreaChart })));
const Area = lazy(() => import("recharts").then((m) => ({ default: m.Area })));
const CartesianGrid = lazy(() => import("recharts").then((m) => ({ default: m.CartesianGrid })));
const XAxis = lazy(() => import("recharts").then((m) => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then((m) => ({ default: m.YAxis })));

const ChartSkeleton = () => (
  <div className="h-[300px] w-full bg-muted/50 rounded animate-pulse flex items-center justify-center">
    <span className="text-muted-foreground text-sm">Grafik yükleniyor...</span>
  </div>
);

type TeacherEarning = {
  teacher_id: string;
  username: string;
  avatar_url: string | null;
  ledger_total: number;
  ledger_teacher_amount: number;
  ledger_platform_amount: number;
  ledger_count: number;
  unpaid_amount: number;
  unpaid_count: number;
  // Legacy (non-ledger) data
  legacy_total: number;
  legacy_count: number;
  last_payout_date: string | null;
};

type PayoutHistory = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  amount: number;
  appointment_count: number;
  paid_at: string;
};

type LedgerItem = {
  id: string;
  source_type: string;
  gross_amount: number;
  teacher_amount: number;
  platform_amount: number;
  created_at: string;
  payment_request: { reference_code: string; listing: { title: string } | null } | null;
};

type EarningTrend = {
  date: string;
  amount: number;
  count: number;
};

export default function AdminEarnings() {
  const [earnings, setEarnings] = useState<TeacherEarning[]>([]);
  const [totalPlatformRevenue, setTotalPlatformRevenue] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [earningTrends, setEarningTrends] = useState<EarningTrend[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const [payoutItems, setPayoutItems] = useState<LedgerItem[]>([]);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEarnings();
    fetchPayoutHistory();
    fetchEarningTrends();
  }, [selectedTeacher, dateRange]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const { data: teachers } = await supabase
        .from("user_roles")
        .select("user_id, profiles(username, avatar_url)")
        .eq("role", "teacher");

      if (!teachers) return;

      const earningsData: TeacherEarning[] = [];
      const nowIso = new Date().toISOString();

      for (const teacher of teachers) {
        if (selectedTeacher !== "all" && teacher.user_id !== selectedTeacher) continue;

        // Ledger-based earnings
        let ledgerQuery = supabase
          .from("earnings_ledger")
          .select("gross_amount, teacher_amount, platform_amount, payout_id")
          .eq("teacher_id", teacher.user_id);

        if (dateRange !== "all") {
          const startDate = subDays(new Date(), parseInt(dateRange));
          ledgerQuery = ledgerQuery.gte("created_at", startDate.toISOString());
        }

        const { data: ledgerData } = await ledgerQuery;

        const ledgerTotal = ledgerData?.reduce((s, e) => s + Number(e.gross_amount), 0) || 0;
        const ledgerTeacher = ledgerData?.reduce((s, e) => s + Number(e.teacher_amount), 0) || 0;
        const ledgerPlatform = ledgerData?.reduce((s, e) => s + Number(e.platform_amount), 0) || 0;
        const unpaidItems = ledgerData?.filter((e) => !e.payout_id) || [];
        const unpaidAmount = unpaidItems.reduce((s, e) => s + Number(e.teacher_amount), 0);

        // Legacy earnings (appointments without payment_request_id)
        let legacyQuery = supabase
          .from("appointments")
          .select("price_at_booking")
          .eq("teacher_id", teacher.user_id)
          .eq("status", "confirmed")
          .lt("end_ts", nowIso)
          .is("payment_request_id", null);

        if (dateRange !== "all") {
          const startDate = subDays(new Date(), parseInt(dateRange));
          legacyQuery = legacyQuery.gte("created_at", startDate.toISOString());
        }

        const { data: legacyData } = await legacyQuery;
        const legacyTotal = legacyData?.reduce((s, a) => s + Number(a.price_at_booking), 0) || 0;

        const { data: lastPayout } = await supabase
          .from("teacher_payouts")
          .select("paid_at")
          .eq("teacher_id", teacher.user_id)
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        earningsData.push({
          teacher_id: teacher.user_id,
          username: (teacher.profiles as any)?.username || "Bilinmeyen",
          avatar_url: (teacher.profiles as any)?.avatar_url || null,
          ledger_total: ledgerTotal,
          ledger_teacher_amount: ledgerTeacher,
          ledger_platform_amount: ledgerPlatform,
          ledger_count: ledgerData?.length || 0,
          unpaid_amount: unpaidAmount,
          unpaid_count: unpaidItems.length,
          legacy_total: legacyTotal,
          legacy_count: legacyData?.length || 0,
          last_payout_date: lastPayout?.paid_at || null,
        });
      }

      setEarnings(earningsData);
      const totalPlatform =
        earningsData.reduce((s, e) => s + e.ledger_platform_amount, 0) +
        earningsData.reduce((s, e) => s + e.legacy_total * PLATFORM_COMMISSION_RATE, 0);
      setTotalPlatformRevenue(totalPlatform);
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      let query = supabase
        .from("teacher_payouts")
        .select("id, teacher_id, amount, appointment_count, paid_at, profiles!teacher_payouts_teacher_id_fkey(username)")
        .order("paid_at", { ascending: false });

      if (dateRange !== "all") {
        query = query.gte("paid_at", subDays(new Date(), parseInt(dateRange)).toISOString());
      }
      if (selectedTeacher !== "all") {
        query = query.eq("teacher_id", selectedTeacher);
      }

      const { data } = await query;
      if (data) {
        setPayoutHistory(
          data.map((p) => ({
            id: p.id,
            teacher_id: p.teacher_id,
            teacher_name: (p.profiles as any)?.username || "Bilinmeyen",
            amount: p.amount,
            appointment_count: p.appointment_count,
            paid_at: p.paid_at,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching payout history:", error);
    }
  };

  const fetchEarningTrends = async () => {
    try {
      const daysAgo = dateRange === "all" ? 30 : parseInt(dateRange);
      const startDate = subDays(new Date(), daysAgo);

      let query = supabase
        .from("earnings_ledger")
        .select("platform_amount, created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (selectedTeacher !== "all") {
        query = query.eq("teacher_id", selectedTeacher);
      }

      const { data } = await query;
      if (data) {
        const trendMap = new Map<string, { amount: number; count: number }>();
        data.forEach((entry) => {
          const date = format(new Date(entry.created_at), "dd MMM");
          const existing = trendMap.get(date) || { amount: 0, count: 0 };
          trendMap.set(date, {
            amount: existing.amount + Number(entry.platform_amount),
            count: existing.count + 1,
          });
        });
        setEarningTrends(
          Array.from(trendMap.entries()).map(([date, d]) => ({ date, amount: d.amount, count: d.count }))
        );
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  };

  const handlePayout = async (teacherId: string, amount: number, count: number) => {
    try {
      // 1. Create payout record
      const { data: payoutData, error: payoutError } = await supabase
        .from("teacher_payouts")
        .insert({ teacher_id: teacherId, amount, appointment_count: count })
        .select("id")
        .single();

      if (payoutError) throw payoutError;

      // 2. Update ledger entries with payout_id
      await supabase
        .from("earnings_ledger")
        .update({ payout_id: payoutData.id })
        .eq("teacher_id", teacherId)
        .is("payout_id", null);

      toast({ title: "Ödeme Yapıldı", description: `₺${amount.toFixed(2)} ödeme kaydedildi.` });
      fetchEarnings();
      fetchPayoutHistory();
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const fetchPayoutItemsList = async (payoutId: string) => {
    const { data } = await supabase
      .from("earnings_ledger")
      .select(`
        id, source_type, gross_amount, teacher_amount, platform_amount, created_at,
        payment_request:payment_requests!earnings_ledger_payment_request_id_fkey(
          reference_code,
          listing:listings!payment_requests_listing_id_fkey(title)
        )
      `)
      .eq("payout_id", payoutId);

    setPayoutItems((data as any) || []);
    setPayoutDialogOpen(true);
  };

  const teacherOptions = earnings.map((e) => ({ id: e.teacher_id, name: e.username }));

  if (loading) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Platform Gelirleri</h1>
          <p className="text-muted-foreground mt-2">Uzman kazançları ve ödeme yönetimi</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtrele
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Uzman</label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Tüm Uzmanlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Uzmanlar</SelectItem>
                {teacherOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Tarih Aralığı</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Son 7 Gün</SelectItem>
                <SelectItem value="30">Son 30 Gün</SelectItem>
                <SelectItem value="90">Son 90 Gün</SelectItem>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Komisyonu</CardTitle>
            <TurkishLiraIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{totalPlatformRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">%{PLATFORM_COMMISSION_RATE * 100} komisyon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ledger İşlemleri</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earnings.reduce((s, e) => s + e.ledger_count, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Onaylanmış ödemeler</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Ödeme</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₺{earnings.reduce((s, e) => s + e.unpaid_amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Uzmanlara ödenecek</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gelir Trendi</CardTitle>
          <CardDescription>Günlük platform komisyon geliri</CardDescription>
        </CardHeader>
        <CardContent>
          {earningTrends.length > 0 ? (
            <Suspense fallback={<ChartSkeleton />}>
              <ChartContainer
                config={{ amount: { label: "Gelir (₺)", color: "hsl(var(--primary))" } }}
                className="h-[300px]"
              >
                <AreaChart data={earningTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                </AreaChart>
              </ChartContainer>
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Henüz ledger verisi yok</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Uzman Ödemeleri</TabsTrigger>
          <TabsTrigger value="history">Ödeme Geçmişi</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Uzman Ödemeleri</CardTitle>
              <CardDescription>Ledger bazlı kazanç ve ödeme durumu</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uzman</TableHead>
                    <TableHead>İşlem Sayısı</TableHead>
                    <TableHead>Toplam Gelir</TableHead>
                    <TableHead>Uzman Payı</TableHead>
                    <TableHead>Son Ödeme</TableHead>
                    <TableHead>Ödenecek</TableHead>
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((e) => (
                    <TableRow key={e.teacher_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {e.avatar_url ? (
                            <img src={e.avatar_url} alt={e.username} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/20" />
                          )}
                          <span>{e.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{e.ledger_count}{e.legacy_count > 0 && ` (+${e.legacy_count} eski)`}</TableCell>
                      <TableCell>₺{(e.ledger_total + e.legacy_total).toFixed(2)}</TableCell>
                      <TableCell>₺{(e.ledger_teacher_amount + e.legacy_total * (1 - PLATFORM_COMMISSION_RATE)).toFixed(2)}</TableCell>
                      <TableCell>
                        {e.last_payout_date ? format(new Date(e.last_payout_date), "dd MMM yyyy") : "-"}
                      </TableCell>
                      <TableCell>₺{e.unpaid_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {e.unpaid_amount > 0 ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm">Ödendi</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Ödeme Onayla</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {e.username} için ₺{e.unpaid_amount.toFixed(2)} ödeme yapıldı olarak işaretlenecek.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handlePayout(e.teacher_id, e.unpaid_amount, e.unpaid_count)}>
                                  Onayla
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Geçmişi</CardTitle>
              <CardDescription>Tamamlanan ödemeler ve kalem detayları</CardDescription>
            </CardHeader>
            <CardContent>
              {payoutHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Uzman</TableHead>
                      <TableHead>Kalem Sayısı</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Detay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutHistory.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.paid_at), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>{p.teacher_name}</TableCell>
                        <TableCell>{p.appointment_count}</TableCell>
                        <TableCell className="font-medium">₺{p.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => fetchPayoutItemsList(p.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Kalemler
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Henüz ödeme geçmişi yok</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Items Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ödeme Kalemleri</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referans</TableHead>
                <TableHead>İlan</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Brüt</TableHead>
                <TableHead>Uzman Payı</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.payment_request?.reference_code || "-"}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{item.payment_request?.listing?.title || "-"}</TableCell>
                  <TableCell>{item.source_type === "appointment" ? "Randevu" : "Ürün"}</TableCell>
                  <TableCell>₺{Number(item.gross_amount).toFixed(2)}</TableCell>
                  <TableCell>₺{Number(item.teacher_amount).toFixed(2)}</TableCell>
                  <TableCell>₺{Number(item.platform_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{format(new Date(item.created_at), "dd MMM yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

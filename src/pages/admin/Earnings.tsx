import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TurkishLira, TrendingUp, Calendar, Filter } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";

// Lazy load chart components
const ChartContainer = lazy(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartContainer })));
const ChartTooltip = lazy(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltip })));
const ChartTooltipContent = lazy(() =>
  import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltipContent })),
);

// Lazy load recharts
const AreaChart = lazy(() => import("recharts").then((m) => ({ default: m.AreaChart })));
const Area = lazy(() => import("recharts").then((m) => ({ default: m.Area })));
const CartesianGrid = lazy(() => import("recharts").then((m) => ({ default: m.CartesianGrid })));
const XAxis = lazy(() => import("recharts").then((m) => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then((m) => ({ default: m.YAxis })));

// Chart loading fallback
const ChartSkeleton = () => (
  <div className="h-[300px] w-full bg-muted/50 rounded animate-pulse flex items-center justify-center">
    <span className="text-muted-foreground text-sm">Grafik yükleniyor...</span>
  </div>
);

type TeacherEarning = {
  teacher_id: string;
  username: string;
  avatar_url: string | null;
  completed_count: number;
  total_earnings: number;
  pending_count: number;
  pending_amount: number;
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

type EarningTrend = {
  date: string;
  amount: number;
  count: number;
};

export default function AdminEarnings() {
  const [earnings, setEarnings] = useState<TeacherEarning[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [earningTrends, setEarningTrends] = useState<EarningTrend[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEarnings();
    fetchPayoutHistory();
    fetchEarningTrends();
  }, [selectedTeacher, dateRange]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      // Get all teachers
      let teachersQuery = supabase
        .from("user_roles")
        .select("user_id, profiles(username, avatar_url)")
        .eq("role", "teacher");

      const { data: teachers } = await teachersQuery;

      if (!teachers) return;

      const earningsData: TeacherEarning[] = [];

      for (const teacher of teachers) {
        // Skip if filtering by specific teacher
        if (selectedTeacher !== "all" && teacher.user_id !== selectedTeacher) {
          continue;
        }

        // Get completed appointments
        let appointmentsQuery = supabase
          .from("appointments")
          .select("price_at_booking, created_at")
          .eq("teacher_id", teacher.user_id)
          .eq("status", "completed");

        // Apply date filter
        if (dateRange !== "all") {
          const daysAgo = parseInt(dateRange);
          const startDate = subDays(new Date(), daysAgo);
          appointmentsQuery = appointmentsQuery.gte("created_at", startDate.toISOString());
        }

        const { data: completed } = await appointmentsQuery;

        const completedCount = completed?.length || 0;
        const totalEarnings = completed?.reduce((sum, apt) => sum + Number(apt.price_at_booking), 0) || 0;

        // Get pending appointments (completed but not paid)
        const { data: pending } = await supabase
          .from("appointments")
          .select("id, price_at_booking")
          .eq("teacher_id", teacher.user_id)
          .eq("status", "completed");

        // Get last payout
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
          completed_count: completedCount,
          total_earnings: totalEarnings,
          pending_count: pending?.length || 0,
          pending_amount: pending?.reduce((sum, apt) => sum + Number(apt.price_at_booking), 0) || 0,
          last_payout_date: lastPayout?.paid_at || null,
        });
      }

      setEarnings(earningsData);

      // Calculate total platform revenue (commission)
      const total = earningsData.reduce((sum, e) => sum + e.total_earnings, 0);
      setTotalRevenue(total * 0.15); // 15% commission
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
        .select(
          "id, teacher_id, amount, appointment_count, paid_at, profiles!teacher_payouts_teacher_id_fkey(username)",
        )
        .order("paid_at", { ascending: false });

      // Apply date filter
      if (dateRange !== "all") {
        const daysAgo = parseInt(dateRange);
        const startDate = subDays(new Date(), daysAgo);
        query = query.gte("paid_at", startDate.toISOString());
      }

      // Apply teacher filter
      if (selectedTeacher !== "all") {
        query = query.eq("teacher_id", selectedTeacher);
      }

      const { data } = await query;

      if (data) {
        setPayoutHistory(
          data.map((payout) => ({
            id: payout.id,
            teacher_id: payout.teacher_id,
            teacher_name: (payout.profiles as any)?.username || "Bilinmeyen",
            amount: payout.amount,
            appointment_count: payout.appointment_count,
            paid_at: payout.paid_at,
          })),
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
        .from("appointments")
        .select("price_at_booking, created_at, teacher_id")
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      // Apply teacher filter
      if (selectedTeacher !== "all") {
        query = query.eq("teacher_id", selectedTeacher);
      }

      const { data } = await query;

      if (data) {
        // Group by date
        const trendMap = new Map<string, { amount: number; count: number }>();
        data.forEach((apt) => {
          const date = format(new Date(apt.created_at), "dd MMM");
          const existing = trendMap.get(date) || { amount: 0, count: 0 };
          trendMap.set(date, {
            amount: existing.amount + Number(apt.price_at_booking) * 0.15,
            count: existing.count + 1,
          });
        });

        const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
          date,
          amount: data.amount,
          count: data.count,
        }));

        setEarningTrends(trends);
      }
    } catch (error) {
      console.error("Error fetching earning trends:", error);
    }
  };

  const handlePayout = async (teacherId: string, amount: number, appointmentCount: number) => {
    const { error } = await supabase.from("teacher_payouts").insert({
      teacher_id: teacherId,
      appointment_count: appointmentCount,
      amount,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "Ödeme kaydedilemedi.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ödeme Yapıldı",
      description: `${amount} TL ödeme kaydedildi.`,
    });

    fetchEarnings();
    fetchPayoutHistory();
  };

  // Get unique teachers for filter
  const teacherOptions = earnings.map((e) => ({
    id: e.teacher_id,
    name: e.username,
  }));

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
                {teacherOptions.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Tarih Aralığı</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Komisyon</CardTitle>
            <TurkishLira className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">%15 komisyon geliri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Randevu</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earnings.reduce((sum, e) => sum + e.completed_count, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tamamlanan randevular</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Ödeme</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₺{earnings.reduce((sum, e) => sum + e.pending_amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ödenecek tutar</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gelir Trendi</CardTitle>
          <CardDescription>Günlük komisyon geliri grafiği</CardDescription>
        </CardHeader>
        <CardContent>
          {earningTrends.length > 0 ? (
            <Suspense fallback={<ChartSkeleton />}>
              <ChartContainer
                config={{
                  amount: {
                    label: "Gelir (₺)",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <AreaChart data={earningTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ChartContainer>
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Henüz veri yok</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Current Earnings and History */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">Güncel Ödemeler</TabsTrigger>
          <TabsTrigger value="history">Ödeme Geçmişi</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Uzman Ödemeleri</CardTitle>
              <CardDescription>Bekleyen ve tamamlanan ödemeler</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uzman</TableHead>
                    <TableHead>Tamamlanan</TableHead>
                    <TableHead>Toplam Gelir</TableHead>
                    <TableHead>Son Ödeme</TableHead>
                    <TableHead>Ödenecek Adet</TableHead>
                    <TableHead>Ödenecek Tutar</TableHead>
                    <TableHead>İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.teacher_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {earning.avatar_url ? (
                            <img src={earning.avatar_url} alt={earning.username} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/20" />
                          )}
                          <span>{earning.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>{earning.completed_count}</TableCell>
                      <TableCell>₺{earning.total_earnings.toFixed(2)}</TableCell>
                      <TableCell>
                        {earning.last_payout_date ? format(new Date(earning.last_payout_date), "dd MMM yyyy") : "-"}
                      </TableCell>
                      <TableCell>{earning.pending_count}</TableCell>
                      <TableCell>₺{earning.pending_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {earning.pending_amount > 0 ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm">Ödendi</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Ödeme Onayla</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {earning.username} için ₺{earning.pending_amount.toFixed(2)} ödeme yapıldı olarak
                                  işaretlenecek.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handlePayout(earning.teacher_id, earning.pending_amount, earning.pending_count)
                                  }
                                >
                                  Onayla
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-muted-foreground text-sm">Ödeme yok</span>
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
              <CardDescription>Tamamlanan ödemelerin listesi</CardDescription>
            </CardHeader>
            <CardContent>
              {payoutHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Uzman</TableHead>
                      <TableHead>Randevu Sayısı</TableHead>
                      <TableHead>Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutHistory.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>{format(new Date(payout.paid_at), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>{payout.teacher_name}</TableCell>
                        <TableCell>{payout.appointment_count}</TableCell>
                        <TableCell className="font-medium">₺{payout.amount.toFixed(2)}</TableCell>
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
    </div>
  );
}

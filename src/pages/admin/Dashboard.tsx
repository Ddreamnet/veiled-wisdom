import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderTree, FileText, Sparkles, TrendingUp, Calendar, TurkishLira, UserCheck } from "lucide-react";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabase";
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
const BarChart = lazy(() => import("recharts").then((m) => ({ default: m.BarChart })));
const Bar = lazy(() => import("recharts").then((m) => ({ default: m.Bar })));
const CartesianGrid = lazy(() => import("recharts").then((m) => ({ default: m.CartesianGrid })));
const XAxis = lazy(() => import("recharts").then((m) => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then((m) => ({ default: m.YAxis })));

type DashboardStats = {
  totalTeachers: number;
  pendingApprovals: number;
  totalCategories: number;
  totalAppointments: number;
  monthlyRevenue: number;
  completedAppointments: number;
};

type AppointmentTrend = {
  date: string;
  count: number;
};

// Chart loading fallback
const ChartSkeleton = () => (
  <div className="h-[200px] w-full bg-muted/50 rounded animate-pulse flex items-center justify-center">
    <span className="text-muted-foreground text-sm">Grafik yükleniyor...</span>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTeachers: 0,
    pendingApprovals: 0,
    totalCategories: 0,
    totalAppointments: 0,
    monthlyRevenue: 0,
    completedAppointments: 0,
  });
  const [appointmentTrends, setAppointmentTrends] = useState<AppointmentTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch all stats in parallel
      const [
        teachersResult,
        pendingResult,
        categoriesResult,
        appointmentsResult,
        completedResult,
        revenueResult,
        trendsResult,
      ] = await Promise.all([
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("teacher_approvals").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase
          .from("appointments")
          .select("price_at_booking")
          .eq("status", "completed")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("appointments")
          .select("created_at")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: true }),
      ]);

      const monthlyRevenue = revenueResult.data?.reduce((sum, apt) => sum + apt.price_at_booking * 0.15, 0) || 0;

      // Group trends by date
      const trendMap = new Map<string, number>();
      trendsResult.data?.forEach((apt) => {
        const date = new Date(apt.created_at).toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
        trendMap.set(date, (trendMap.get(date) || 0) + 1);
      });

      const trends = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

      setStats({
        totalTeachers: teachersResult.count || 0,
        pendingApprovals: pendingResult.count || 0,
        totalCategories: categoriesResult.count || 0,
        totalAppointments: appointmentsResult.count || 0,
        monthlyRevenue,
        completedAppointments: completedResult.count || 0,
      });

      setAppointmentTrends(trends);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const adminCards = [
    {
      title: "Kullanıcı Yönetimi",
      description: "Tüm kullanıcıları görüntüle ve rolleri yönet",
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "Uzmanları Düzenle",
      description: "Onaylı uzmanları yönet ve düzenle",
      icon: UserCheck,
      href: "/admin/teachers",
    },
    {
      title: "Kategorileri Düzenle",
      description: "Ana ve alt kategorileri yönet",
      icon: FolderTree,
      href: "/admin/categories",
    },
    {
      title: "Sayfaları Düzenle",
      description: "Statik sayfaları düzenle",
      icon: FileText,
      href: "/admin/pages",
    },
    {
      title: "Merak Konuları",
      description: "Blog yazılarını yönet",
      icon: Sparkles,
      href: "/admin/curiosities",
    },
  ];

  const statCards = [
    {
      title: "Toplam Uzman",
      value: stats.totalTeachers,
      icon: Users,
      description: "Onaylanmış uzmanlar",
      color: "text-primary",
    },
    {
      title: "Bekleyen Onay",
      value: stats.pendingApprovals,
      icon: UserCheck,
      description: "Onay bekleyen başvurular",
      color: "text-orange-500",
    },
    {
      title: "Toplam Randevu",
      value: stats.totalAppointments,
      icon: Calendar,
      description: `${stats.completedAppointments} tamamlandı`,
      color: "text-blue-500",
    },
    {
      title: "Aylık Gelir",
      value: `₺${stats.monthlyRevenue.toFixed(2)}`,
      icon: TurkishLira,
      description: "Son 30 gün komisyon",
      color: "text-green-500",
    },
  ];

  if (loading) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton variant="shimmer" className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <Skeleton variant="shimmer" className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton variant="wave" className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton variant="shimmer" className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton variant="wave" className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Admin Paneli</h1>
          <p className="text-muted-foreground mt-2">Sistem özeti ve yönetim araçları</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Randevu Trendi</CardTitle>
            <CardDescription>Son 7 günlük randevu sayıları</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentTrends.length > 0 ? (
              <Suspense fallback={<ChartSkeleton />}>
                <ChartContainer
                  config={{
                    count: {
                      label: "Randevu",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[200px]"
                >
                  <AreaChart data={appointmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="count"
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

        <Card>
          <CardHeader>
            <CardTitle>Platform İstatistikleri</CardTitle>
            <CardDescription>Genel bakış</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton />}>
              <ChartContainer
                config={{
                  value: {
                    label: "Sayı",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[200px]"
              >
                <BarChart
                  data={[
                    { name: "Uzmanlar", value: stats.totalTeachers },
                    { name: "Kategoriler", value: stats.totalCategories },
                    { name: "Randevular", value: stats.totalAppointments },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ChartContainer>
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold mb-4">Hızlı Erişim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {adminCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} to={card.href}>
                <Card className="hover:shadow-glow transition-smooth h-full cursor-pointer">
                  <CardHeader>
                    <Icon className="h-12 w-12 text-primary mb-4" />
                    <CardTitle>{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

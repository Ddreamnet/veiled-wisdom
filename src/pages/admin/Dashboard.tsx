import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, FolderTree, FileText, Sparkles, TrendingUp, Calendar, DollarSign, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';

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
      // Fetch total approved teachers
      const { count: teachersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_teacher_approved', true);

      // Fetch pending approvals
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_teacher_approved', false);

      // Fetch total categories
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      // Fetch total appointments
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      // Fetch completed appointments
      const { count: completedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Fetch monthly revenue (15% commission)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: revenueData } = await supabase
        .from('appointments')
        .select('price_at_booking')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const monthlyRevenue = revenueData?.reduce((sum, apt) => sum + (apt.price_at_booking * 0.15), 0) || 0;

      // Fetch appointment trends for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: trendsData } = await supabase
        .from('appointments')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const trendMap = new Map<string, number>();
      trendsData?.forEach((apt) => {
        const date = new Date(apt.created_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
        trendMap.set(date, (trendMap.get(date) || 0) + 1);
      });

      const trends = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

      setStats({
        totalTeachers: teachersCount || 0,
        pendingApprovals: pendingCount || 0,
        totalCategories: categoriesCount || 0,
        totalAppointments: appointmentsCount || 0,
        monthlyRevenue,
        completedAppointments: completedCount || 0,
      });

      setAppointmentTrends(trends);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminCards = [
    {
      title: 'Hocaları Düzenle',
      description: 'Onaylı hocaları yönet ve düzenle',
      icon: Users,
      href: '/admin/teachers',
    },
    {
      title: 'Kategorileri Düzenle',
      description: 'Ana ve alt kategorileri yönet',
      icon: FolderTree,
      href: '/admin/categories',
    },
    {
      title: 'Sayfaları Düzenle',
      description: 'Statik sayfaları düzenle',
      icon: FileText,
      href: '/admin/pages',
    },
    {
      title: 'Merak Konuları',
      description: 'Blog yazılarını yönet',
      icon: Sparkles,
      href: '/admin/curiosities',
    },
  ];

  const statCards = [
    {
      title: 'Toplam Hoca',
      value: stats.totalTeachers,
      icon: Users,
      description: 'Onaylanmış hocalar',
      color: 'text-primary',
    },
    {
      title: 'Bekleyen Onay',
      value: stats.pendingApprovals,
      icon: UserCheck,
      description: 'Onay bekleyen başvurular',
      color: 'text-orange-500',
    },
    {
      title: 'Toplam Randevu',
      value: stats.totalAppointments,
      icon: Calendar,
      description: `${stats.completedAppointments} tamamlandı`,
      color: 'text-blue-500',
    },
    {
      title: 'Aylık Gelir',
      value: `₺${stats.monthlyRevenue.toFixed(2)}`,
      icon: DollarSign,
      description: 'Son 30 gün komisyon',
      color: 'text-green-500',
    },
  ];

  if (loading) {
    return (
      <div className="container py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div>
          <h1 className="text-3xl font-bold">Admin Paneli</h1>
          <p className="text-muted-foreground mt-2">Sistem özeti ve yönetim araçları</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Randevu Trendi</CardTitle>
            <CardDescription>Son 7 günlük randevu sayıları</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentTrends.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: 'Randevu',
                    color: 'hsl(var(--primary))',
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
            <ChartContainer
              config={{
                value: {
                  label: 'Sayı',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[200px]"
            >
              <BarChart
                data={[
                  { name: 'Hocalar', value: stats.totalTeachers },
                  { name: 'Kategoriler', value: stats.totalCategories },
                  { name: 'Randevular', value: stats.totalAppointments },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Hızlı Erişim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

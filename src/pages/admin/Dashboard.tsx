import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderTree, FileText, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
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

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold mb-8">Admin Paneli</h1>
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
  );
}

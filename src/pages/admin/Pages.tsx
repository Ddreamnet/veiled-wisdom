import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';

const staticPages = [
  { title: 'Biz kimiz', path: '/about' },
  { title: 'Nasıl çalışır', path: '/how-it-works' },
  { title: 'Üretlendirme', path: '/production' },
  { title: 'İletişim', path: '/contact' },
  { title: 'Kullanım Koşulları', path: '/terms' },
  { title: 'Gizlilik Politikası', path: '/privacy' },
  { title: 'SSS', path: '/faq' },
];

export default function PagesManagement() {
  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <h1 className="text-2xl md:text-3xl font-bold">Sayfaları Düzenle</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {staticPages.map((page) => (
          <Card key={page.path} className="hover:shadow-glow transition-smooth cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {page.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {page.path}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                (Sayfa içeriği düzenleme özelliği ileride eklenecek)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

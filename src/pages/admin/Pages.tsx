import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

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
    <div className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Sayfaları Düzenle</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

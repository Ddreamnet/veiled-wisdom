import { Card, CardContent } from '@/components/ui/card';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

export default function Production() {
  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">Üretlendirme</h1>
      <Card>
        <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            Leyl platformu, en yüksek güvenlik standartlarıyla geliştirilmiştir.
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            Tüm ödemeler güvenli altyapı üzerinden işlenir ve kullanıcı verileri
            korunur.
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            Platform sürekli olarak güncellenmekte ve geliştirilmektedir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

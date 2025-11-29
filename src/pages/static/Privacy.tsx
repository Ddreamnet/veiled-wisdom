import { Card, CardContent } from '@/components/ui/card';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

export default function Privacy() {
  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">Gizlilik Politikası</h1>
      <Card>
        <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">1. Veri Toplama</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Platformumuz, kullanıcı deneyimini iyileştirmek için belirli verileri toplar.
            </p>
          </section>
          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">2. Veri Kullanımı</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Toplanan veriler yalnızca hizmet kalitesini artırmak için kullanılır.
            </p>
          </section>
          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">3. Veri Güvenliği</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Kullanıcı verileri en yüksek güvenlik standartlarıyla korunmaktadır.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent } from '@/components/ui/card';

export default function Privacy() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Gizlilik Politikası</h1>
      <Card>
        <CardContent className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Veri Toplama</h2>
            <p className="text-muted-foreground">
              Platformumuz, kullanıcı deneyimini iyileştirmek için belirli verileri toplar.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Veri Kullanımı</h2>
            <p className="text-muted-foreground">
              Toplanan veriler yalnızca hizmet kalitesini artırmak için kullanılır.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Veri Güvenliği</h2>
            <p className="text-muted-foreground">
              Kullanıcı verileri en yüksek güvenlik standartlarıyla korunmaktadır.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

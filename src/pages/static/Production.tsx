import { Card, CardContent } from '@/components/ui/card';

export default function Production() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Üretlendirme</h1>
      <Card>
        <CardContent className="p-8 space-y-6">
          <p className="text-muted-foreground">
            Leyl platformu, en yüksek güvenlik standartlarıyla geliştirilmiştir.
          </p>
          <p className="text-muted-foreground">
            Tüm ödemeler güvenli altyapı üzerinden işlenir ve kullanıcı verileri
            korunur.
          </p>
          <p className="text-muted-foreground">
            Platform sürekli olarak güncellenmekte ve geliştirilmektedir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

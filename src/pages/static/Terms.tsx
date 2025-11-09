import { Card, CardContent } from '@/components/ui/card';

export default function Terms() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Kullanım Koşulları</h1>
      <Card>
        <CardContent className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Genel Hükümler</h2>
            <p className="text-muted-foreground">
              Bu platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Kullanıcı Sorumlulukları</h2>
            <p className="text-muted-foreground">
              Kullanıcılar, platform üzerinde gerçekleştirdikleri işlemlerden sorumludur.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Hizmet Şartları</h2>
            <p className="text-muted-foreground">
              Platform, hizmetlerini kesintisiz sunmayı hedefler ancak garanti vermez.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent } from '@/components/ui/card';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

export default function Terms() {
  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">Kullanım Koşulları</h1>
      <Card>
        <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">1. Genel Hükümler</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Bu platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.
            </p>
          </section>
          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">2. Kullanıcı Sorumlulukları</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Kullanıcılar, platform üzerinde gerçekleştirdikleri işlemlerden sorumludur.
            </p>
          </section>
          <section>
            <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">3. Hizmet Şartları</h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Platform, hizmetlerini kesintisiz sunmayı hedefler ancak garanti vermez.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

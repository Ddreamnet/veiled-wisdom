import { Card, CardContent } from '@/components/ui/card';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

export default function About() {
  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">Biz Kimiz</h1>
      <Card>
        <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
          <p className="text-sm md:text-base text-muted-foreground">
            Leyl, gizli ilimler ve antik bilgelik alanında uzmanlaşmış hocalar ile
            danışanları bir araya getiren modern bir platformdur.
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            Misyonumuz, kadim bilgelik ve modern teknolojinin buluştuğu bir köprü
            oluşturarak, insanların yaşamlarında anlam ve yön bulmalarına yardımcı
            olmaktır.
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            Uzman hocalarımız, bakım, temizleme, analiz ve astroloji gibi çeşitli
            alanlarda hizmet sunmaktadır.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

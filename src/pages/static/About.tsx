import { Card, CardContent } from '@/components/ui/card';

export default function About() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Biz Kimiz</h1>
      <Card>
        <CardContent className="p-8 space-y-6">
          <p className="text-muted-foreground">
            Leyl, gizli ilimler ve antik bilgelik alanında uzmanlaşmış hocalar ile
            danışanları bir araya getiren modern bir platformdur.
          </p>
          <p className="text-muted-foreground">
            Misyonumuz, kadim bilgelik ve modern teknolojinin buluştuğu bir köprü
            oluşturarak, insanların yaşamlarında anlam ve yön bulmalarına yardımcı
            olmaktır.
          </p>
          <p className="text-muted-foreground">
            Uzman hocalarımız, bakım, temizleme, analiz ve astroloji gibi çeşitli
            alanlarda hizmet sunmaktadır.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

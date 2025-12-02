import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";
import { useStaticPages, StaticPage } from "@/hooks/useStaticPages";
import { PageEditDialog } from "@/components/admin/PageEditDialog";

const defaultPages = [
  {
    slug: "about",
    title: "Biz Kimiz",
    content:
      "Leyl, gizli ilimler ve antik bilgelik alanında uzmanlaşmış hocalar ile danışanları bir araya getiren modern bir platformdur.\n\nMisyonumuz, kadim bilgelik ve modern teknolojinin buluştuğu bir köprü oluşturarak, insanların yaşamlarında anlam ve yön bulmalarına yardımcı olmaktır.\n\nUzman hocalarımız, bakım, temizleme, analiz ve astroloji gibi çeşitli alanlarda hizmet sunmaktadır.",
  },
  {
    slug: "how-it-works",
    title: "Nasıl Çalışır",
    content:
      "## Kayıt Olun\nÜcretsiz hesap oluşturun ve platformumuza katılın.\n\n## Hoca Seçin\nİhtiyacınıza uygun kategoride uzman hocaları keşfedin.\n\n## İletişime Geçin\nHocayla mesajlaşarak tarih ve saat belirleyin.\n\n## Randevu Alın\nÖdeme yapın ve randevunuzu tamamlayın.",
  },
  {
    slug: "production",
    title: "Ücretlendirme",
    content:
      "Leyl platformu, en yüksek güvenlik standartlarıyla geliştirilmiştir.\n\nTüm ödemeler güvenli altyapı üzerinden işlenir ve kullanıcı verileri korunur.\n\nPlatform sürekli olarak güncellenmekte ve geliştirilmektedir.",
  },
  {
    slug: "contact",
    title: "İletişim",
    content: "## E-posta\ndestek@elleyl.com\n\n## Telefon\n+90 XXX XXX XX XX\n\n## Adres\nİstanbul, Türkiye",
  },
  {
    slug: "terms",
    title: "Kullanım Koşulları",
    content:
      "## 1. Genel Hükümler\nBu platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.\n\n## 2. Kullanıcı Sorumlulukları\nKullanıcılar, platform üzerinde gerçekleştirdikleri işlemlerden sorumludur.\n\n## 3. Hizmet Şartları\nPlatform, hizmetlerini kesintisiz sunmayı hedefler ancak garanti vermez.",
  },
  {
    slug: "privacy",
    title: "Gizlilik Politikası",
    content:
      "## 1. Veri Toplama\nPlatformumuz, kullanıcı deneyimini iyileştirmek için belirli verileri toplar.\n\n## 2. Veri Kullanımı\nToplanan veriler yalnızca hizmet kalitesini artırmak için kullanılır.\n\n## 3. Veri Güvenliği\nKullanıcı verileri en yüksek güvenlik standartlarıyla korunmaktadır.",
  },
  {
    slug: "faq",
    title: "SSS",
    content:
      '## Platform nasıl çalışır?\nKayıt olduktan sonra kategorilerde uzman hocaları inceleyebilir, mesajlaşabilir ve randevu alabilirsiniz.\n\n## Ödeme nasıl yapılır?\nRandevu oluşturduktan sonra güvenli ödeme sayfasına yönlendirilirsiniz. Kredi kartı ile ödeme yapabilirsiniz.\n\n## Hoca olarak nasıl başvurabilirim?\nKayıt olurken "Hoca" seçeneğini işaretleyin. Başvurunuz incelendikten sonra onaylanacaktır.\n\n## Randevumu iptal edebilir miyim?\nRandevunuzu en az 24 saat öncesinden iptal edebilirsiniz. İptal politikası için hocayla iletişime geçin.\n\n## Verilerim güvende mi?\nEvet, tüm verileriniz şifrelenmiş olarak saklanır ve üçüncü şahıslarla paylaşılmaz.',
  },
];

export default function PagesManagement() {
  const { data: savedPages, isLoading } = useStaticPages();
  const [editingPage, setEditingPage] = useState<{ slug: string; title: string; content: string } | null>(null);

  const getPageData = (slug: string) => {
    const saved = savedPages?.find((p) => p.slug === slug);
    const defaultPage = defaultPages.find((p) => p.slug === slug);
    return {
      slug,
      title: saved?.title || defaultPage?.title || "",
      content: saved?.content || defaultPage?.content || "",
    };
  };

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <h1 className="text-2xl md:text-3xl font-bold">Sayfaları Düzenle</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {defaultPages.map((page) => {
            const pageData = getPageData(page.slug);
            const savedPage = savedPages?.find((p) => p.slug === page.slug);

            return (
              <Card 
                key={page.slug} 
                className="hover:shadow-glow transition-smooth cursor-pointer hover:border-primary/50"
                onClick={() => setEditingPage(pageData)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    {pageData.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">/{page.slug}</p>
                  {savedPage?.updated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Son güncelleme: {new Date(savedPage.updated_at).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editingPage && (
        <PageEditDialog
          open={!!editingPage}
          onOpenChange={(open) => !open && setEditingPage(null)}
          page={editingPage}
        />
      )}
    </div>
  );
}

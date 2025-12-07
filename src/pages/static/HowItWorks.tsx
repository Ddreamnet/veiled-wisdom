import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";

const defaultContent = `## Kayıt Olun
Ücretsiz hesap oluşturun ve platformumuza katılın.

## Hoca Seçin
İhtiyacınıza uygun kategoride uzmanları keşfedin.

## İletişime Geçin
Uzmanla mesajlaşarak tarih ve saat belirleyin.

## Randevu Alın
Ödeme yapın ve randevunuzu tamamlayın.`;

export default function HowItWorks() {
  const { data: page, isLoading } = useStaticPage("how-it-works");
  const content = page?.content || defaultContent;
  const title = page?.title || "Nasıl Çalışır";

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8 text-center">{title}</h1>
      <DynamicPageContent content={content} isLoading={isLoading} />
    </div>
  );
}

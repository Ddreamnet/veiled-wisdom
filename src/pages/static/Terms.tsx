import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";

const defaultContent = `## 1. Genel Hükümler
Bu platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.

## 2. Kullanıcı Sorumlulukları
Kullanıcılar, platform üzerinde gerçekleştirdikleri işlemlerden sorumludur.

## 3. Hizmet Şartları
Platform, hizmetlerini kesintisiz sunmayı hedefler ancak garanti vermez.`;

export default function Terms() {
  const { data: page, isLoading } = useStaticPage("terms");
  const content = page?.content || defaultContent;
  const title = page?.title || "Kullanım Koşulları";

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">{title}</h1>
      <DynamicPageContent content={content} isLoading={isLoading} />
    </div>
  );
}

import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { FileText } from "lucide-react";

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
      
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <FileText className="w-6 h-6 md:w-7 md:h-7 text-primary" />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h1>
      </div>
      
      <div className="max-w-4xl">
        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

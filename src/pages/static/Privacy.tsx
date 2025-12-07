import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Shield } from "lucide-react";

const defaultContent = `## 1. Veri Toplama
Platformumuz, kullanıcı deneyimini iyileştirmek için belirli verileri toplar.

## 2. Veri Kullanımı
Toplanan veriler yalnızca hizmet kalitesini artırmak için kullanılır.

## 3. Veri Güvenliği
Kullanıcı verileri en yüksek güvenlik standartlarıyla korunmaktadır.`;

export default function Privacy() {
  const { data: page, isLoading } = useStaticPage("privacy");
  const content = page?.content || defaultContent;
  const title = page?.title || "Gizlilik Politikası";

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      
      <div className="flex items-center justify-center gap-3 mb-6 md:mb-8">
        <Shield className="w-6 h-6 md:w-7 md:h-7 text-primary" />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h1>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

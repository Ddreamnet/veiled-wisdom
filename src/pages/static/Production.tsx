import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { CreditCard } from "lucide-react";

const defaultContent = `Leyl platformu, en yüksek güvenlik standartlarıyla geliştirilmiştir.

Tüm ödemeler güvenli altyapı üzerinden işlenir ve kullanıcı verileri korunur.

Platform sürekli olarak güncellenmekte ve geliştirilmektedir.`;

export default function Production() {
  const { data: page, isLoading } = useStaticPage("production");
  const content = page?.content || defaultContent;
  const title = page?.title || "Ücretlendirme";

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      
      <div className="flex items-center justify-center gap-3 mb-6 md:mb-8">
        <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-primary" />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h1>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

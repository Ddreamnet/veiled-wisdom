import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { FileText, Shield, AlertCircle } from "lucide-react";

const defaultContent = `## 1. Genel Hükümler
Bu platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.

## 2. Kullanıcı Sorumlulukları
Kullanıcılar, platform üzerinde gerçekleştirdikleri işlemlerden sorumludur.

## 3. Hizmet Şartları
Platform, hizmetlerini kesintisiz sunmayı hedefler ancak garanti vermez.`;

const highlights = [
  {
    icon: FileText,
    title: "Açık Şartlar",
    description: "Tüm koşullar net olarak belirtilmiştir"
  },
  {
    icon: Shield,
    title: "Haklarınız",
    description: "Kullanıcı hakları korunur"
  },
  {
    icon: AlertCircle,
    title: "Sorumluluklar",
    description: "Karşılıklı sorumluluklar açıklanmıştır"
  }
];

export default function Terms() {
  const { data: page, isLoading } = useStaticPage("terms");
  const content = page?.content || defaultContent;
  const title = page?.title || "Kullanım Koşulları";

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-56 h-56 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 md:px-6 lg:px-8 relative">
          <PageBreadcrumb />
          <div className="text-center max-w-3xl mx-auto mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-silver mb-4">
              {title}
            </h1>
            <p className="text-foreground/60 text-lg">
              Platform kullanım kuralları ve şartları
            </p>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="container px-4 md:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={index} 
                className="glass-effect rounded-2xl p-6 text-center border-border/30 hover-lift"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-foreground/60">{item.description}</p>
              </div>
            );
          })}
        </div>

        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

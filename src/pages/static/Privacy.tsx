import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Lock, Eye, Database, ShieldCheck } from "lucide-react";

const defaultContent = `## 1. Veri Toplama
Platformumuz, kullanıcı deneyimini iyileştirmek için belirli verileri toplar.

## 2. Veri Kullanımı
Toplanan veriler yalnızca hizmet kalitesini artırmak için kullanılır.

## 3. Veri Güvenliği
Kullanıcı verileri en yüksek güvenlik standartlarıyla korunmaktadır.`;

const privacyFeatures = [
  {
    icon: Lock,
    title: "Şifreli Veriler",
    description: "Tüm veriler şifrelenerek saklanır"
  },
  {
    icon: Eye,
    title: "Şeffaf Kullanım",
    description: "Verileriniz nasıl kullanıldığını bilirsiniz"
  },
  {
    icon: Database,
    title: "Güvenli Depolama",
    description: "Endüstri standardı güvenlik altyapısı"
  },
  {
    icon: ShieldCheck,
    title: "KVKK Uyumlu",
    description: "Yasal düzenlemelere tam uyum"
  }
];

export default function Privacy() {
  const { data: page, isLoading } = useStaticPage("privacy");
  const content = page?.content || defaultContent;
  const title = page?.title || "Gizlilik Politikası";

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-10 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-48 h-48 bg-primary-glow/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 md:px-6 lg:px-8 relative">
          <PageBreadcrumb />
          <div className="text-center max-w-3xl mx-auto mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-silver mb-4">
              {title}
            </h1>
            <p className="text-foreground/60 text-lg">
              Verilerinizin güvenliği bizim için önceliklidir
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Features */}
      <div className="container px-4 md:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {privacyFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="glass-effect rounded-2xl p-6 text-center border-border/30 hover-lift"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-foreground/60">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

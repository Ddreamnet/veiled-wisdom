import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { CreditCard, Percent, Gift, Zap } from "lucide-react";

const defaultContent = `Leyl platformu, en yüksek güvenlik standartlarıyla geliştirilmiştir.

Tüm ödemeler güvenli altyapı üzerinden işlenir ve kullanıcı verileri korunur.

Platform sürekli olarak güncellenmekte ve geliştirilmektedir.`;

const pricingFeatures = [
  {
    icon: CreditCard,
    title: "Güvenli Ödeme",
    description: "256-bit SSL şifreli güvenli ödeme"
  },
  {
    icon: Percent,
    title: "Şeffaf Fiyatlandırma",
    description: "Gizli ücret yok"
  },
  {
    icon: Gift,
    title: "İlk Danışma",
    description: "Yeni kullanıcılara özel fırsatlar"
  },
  {
    icon: Zap,
    title: "Anında Onay",
    description: "Hızlı ödeme işlemi"
  }
];

export default function Production() {
  const { data: page, isLoading } = useStaticPage("production");
  const content = page?.content || defaultContent;
  const title = page?.title || "Ücretlendirme";

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/3 w-56 h-56 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-primary-glow/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 md:px-6 lg:px-8 relative">
          <PageBreadcrumb />
          <div className="text-center max-w-3xl mx-auto mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-silver mb-4">
              {title}
            </h1>
            <p className="text-foreground/60 text-lg">
              Şeffaf ve güvenilir fiyatlandırma
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Features */}
      <div className="container px-4 md:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pricingFeatures.map((feature, index) => {
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

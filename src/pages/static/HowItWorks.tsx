import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { UserPlus, Search, MessageCircle, Calendar } from "lucide-react";

const defaultContent = `## Kayıt Olun
Ücretsiz hesap oluşturun ve platformumuza katılın.

## Hoca Seçin
İhtiyacınıza uygun kategoride uzmanları keşfedin.

## İletişime Geçin
Uzmanla mesajlaşarak tarih ve saat belirleyin.

## Randevu Alın
Ödeme yapın ve randevunuzu tamamlayın.`;

const steps = [
  {
    icon: UserPlus,
    title: "Kayıt Olun",
    description: "Ücretsiz hesap oluşturun",
    step: "01"
  },
  {
    icon: Search,
    title: "Hoca Seçin",
    description: "Uzmanları keşfedin",
    step: "02"
  },
  {
    icon: MessageCircle,
    title: "İletişime Geçin",
    description: "Mesajlaşarak görüşün",
    step: "03"
  },
  {
    icon: Calendar,
    title: "Randevu Alın",
    description: "Hizmetinizi tamamlayın",
    step: "04"
  }
];

export default function HowItWorks() {
  const { data: page, isLoading } = useStaticPage("how-it-works");
  const content = page?.content || defaultContent;
  const title = page?.title || "Nasıl Çalışır";

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 md:px-6 lg:px-8 relative">
          <PageBreadcrumb />
          <div className="text-center max-w-3xl mx-auto mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-silver mb-4">
              {title}
            </h1>
            <p className="text-foreground/60 text-lg">
              4 basit adımda hizmetinizi alın
            </p>
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="container px-4 md:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index} 
                className="glass-effect rounded-2xl p-6 border-border/30 hover-lift relative group"
              >
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-glow-sm">
                  {step.step}
                </div>
                <div className="w-14 h-14 mb-4 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-foreground/60">{step.description}</p>
              </div>
            );
          })}
        </div>

        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

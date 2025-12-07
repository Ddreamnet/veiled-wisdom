import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Users, Sparkles, Star } from "lucide-react";

const defaultContent = `Leyl, gizli ilimler ve antik bilgelik alanında uzmanlaşmış uzmanlar ile danışanları bir araya getiren modern bir platformdur.

Misyonumuz, kadim bilgelik ve modern teknolojinin buluştuğu bir köprü oluşturarak, insanların yaşamlarında anlam ve yön bulmalarına yardımcı olmaktır.

Uzman hocalarımız, bakım, temizleme, analiz ve astroloji gibi çeşitli alanlarda hizmet sunmaktadır.`;

export default function About() {
  const { data: page, isLoading } = useStaticPage("about");
  const content = page?.content || defaultContent;
  const title = page?.title || "Biz Kimiz";

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-primary-glow/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 md:px-6 lg:px-8 relative">
          <PageBreadcrumb />
          <div className="text-center max-w-3xl mx-auto mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-silver mb-4">
              {title}
            </h1>
            <p className="text-foreground/60 text-lg">
              Kadim bilgelik, modern deneyim
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container px-4 md:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-effect rounded-2xl p-6 text-center border-border/30 hover-lift">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Uzman Kadro</h3>
            <p className="text-sm text-foreground/60">Alanında deneyimli ve güvenilir hocalar</p>
          </div>
          
          <div className="glass-effect rounded-2xl p-6 text-center border-border/30 hover-lift">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Güvenli Platform</h3>
            <p className="text-sm text-foreground/60">Şifreli iletişim ve güvenli ödeme</p>
          </div>
          
          <div className="glass-effect rounded-2xl p-6 text-center border-border/30 hover-lift">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
              <Star className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">7/24 Destek</h3>
            <p className="text-sm text-foreground/60">Her zaman yanınızdayız</p>
          </div>
        </div>

        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

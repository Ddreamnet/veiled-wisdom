import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { DynamicPageContent } from "@/components/DynamicPageContent";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const defaultContent = `## E-posta
destek@elleyl.com

## Telefon
+90 XXX XXX XX XX

## Adres
İstanbul, Türkiye`;

const contactInfo = [
  {
    icon: Mail,
    title: "E-posta",
    value: "destek@leyl.com",
    description: "7/24 destek"
  },
  {
    icon: Phone,
    title: "Telefon",
    value: "+90 XXX XXX XX XX",
    description: "Hafta içi 09:00 - 18:00"
  },
  {
    icon: MapPin,
    title: "Adres",
    value: "İstanbul, Türkiye",
    description: "Merkez ofis"
  },
  {
    icon: Clock,
    title: "Çalışma Saatleri",
    value: "09:00 - 18:00",
    description: "Pazartesi - Cuma"
  }
];

export default function Contact() {
  const { data: page, isLoading } = useStaticPage("contact");
  const content = page?.content || defaultContent;
  const title = page?.title || "İletişim";

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-10 left-1/3 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/3 w-56 h-56 bg-primary-glow/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 md:px-6 lg:px-8 relative">
          <PageBreadcrumb />
          <div className="text-center max-w-3xl mx-auto mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-silver mb-4">
              {title}
            </h1>
            <p className="text-foreground/60 text-lg">
              Size nasıl yardımcı olabiliriz?
            </p>
          </div>
        </div>
      </div>

      {/* Contact Info Cards */}
      <div className="container px-4 md:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {contactInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <div 
                key={index} 
                className="glass-effect rounded-2xl p-6 border-border/30 hover-lift text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-1">{info.title}</h3>
                <p className="text-foreground/80 font-medium mb-1">{info.value}</p>
                <p className="text-sm text-foreground/50">{info.description}</p>
              </div>
            );
          })}
        </div>

        <DynamicPageContent content={content} isLoading={isLoading} />
      </div>
    </div>
  );
}

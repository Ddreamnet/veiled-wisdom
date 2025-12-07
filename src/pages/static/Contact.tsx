import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, MapPin } from "lucide-react";

interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

function parseContactContent(content: string): ContactInfo {
  const info: ContactInfo = {
    email: "destek@elleyl.com",
    phone: "+90 XXX XXX XX XX",
    address: "İstanbul, Türkiye"
  };

  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').toLowerCase();
    } else if (trimmed && currentSection) {
      if (currentSection.includes('e-posta') || currentSection.includes('email')) {
        info.email = trimmed;
      } else if (currentSection.includes('telefon') || currentSection.includes('phone')) {
        info.phone = trimmed;
      } else if (currentSection.includes('adres') || currentSection.includes('address')) {
        info.address = trimmed;
      }
    }
  }

  return info;
}

const defaultContent = `## E-posta
destek@elleyl.com

## Telefon
+90 XXX XXX XX XX

## Adres
İstanbul, Türkiye`;

export default function Contact() {
  const { data: page, isLoading } = useStaticPage("contact");
  const content = page?.content || defaultContent;
  const title = page?.title || "İletişim";
  const contactInfo = parseContactContent(content);

  if (isLoading) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <PageBreadcrumb />
        <Skeleton className="h-10 w-1/3 mb-6 md:mb-8" />
        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const contactCards = [
    {
      icon: Mail,
      title: "E-posta",
      value: contactInfo.email,
      href: `mailto:${contactInfo.email}`,
    },
    {
      icon: Phone,
      title: "Telefon",
      value: contactInfo.phone,
      href: `tel:${contactInfo.phone.replace(/\s/g, '')}`,
    },
    {
      icon: MapPin,
      title: "Adres",
      value: contactInfo.address,
      href: null,
    },
  ];

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8 text-center">{title}</h1>
      
      <div className="grid gap-4 md:gap-6 md:grid-cols-3 max-w-4xl mx-auto">
        {contactCards.map((card) => (
          <Card 
            key={card.title} 
            className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 group"
          >
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <card.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
              {card.href ? (
                <a 
                  href={card.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {card.value}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

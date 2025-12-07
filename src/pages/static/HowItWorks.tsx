import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Search, MessageCircle, CalendarCheck } from "lucide-react";

interface Step {
  title: string;
  description: string;
}

function parseSteps(content: string): Step[] {
  const steps: Step[] = [];
  const lines = content.split('\n');
  
  let currentTitle = '';
  let currentDesc: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      if (currentTitle && currentDesc.length > 0) {
        steps.push({ title: currentTitle, description: currentDesc.join(' ') });
      }
      currentTitle = trimmed.replace('## ', '');
      currentDesc = [];
    } else if (trimmed && currentTitle) {
      currentDesc.push(trimmed);
    }
  }
  
  if (currentTitle && currentDesc.length > 0) {
    steps.push({ title: currentTitle, description: currentDesc.join(' ') });
  }
  
  return steps;
}

const defaultContent = `## Kayıt Olun
Ücretsiz hesap oluşturun ve platformumuza katılın.

## Hoca Seçin
İhtiyacınıza uygun kategoride uzmanları keşfedin.

## İletişime Geçin
Uzmanla mesajlaşarak tarih ve saat belirleyin.

## Randevu Alın
Ödeme yapın ve randevunuzu tamamlayın.`;

const stepIcons = [UserPlus, Search, MessageCircle, CalendarCheck];

export default function HowItWorks() {
  const { data: page, isLoading } = useStaticPage("how-it-works");
  const content = page?.content || defaultContent;
  const title = page?.title || "Nasıl Çalışır";
  const steps = parseSteps(content);

  if (isLoading) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <PageBreadcrumb />
        <Skeleton className="h-10 w-1/3 mx-auto mb-6 md:mb-8" />
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-10 text-center">{title}</h1>
      
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
        {steps.map((step, index) => {
          const Icon = stepIcons[index % stepIcons.length];
          return (
            <Card 
              key={index} 
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {index + 1}
              </div>
              <CardContent className="p-6 pt-10 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

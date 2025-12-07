import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, MessageCircle, Search } from "lucide-react";

const defaultContent = `## Platform nasıl çalışır?
Kayıt olduktan sonra kategorilerde uzmanları inceleyebilir, mesajlaşabilir ve randevu alabilirsiniz.

## Ödeme nasıl yapılır?
Randevu oluşturduktan sonra güvenli ödeme sayfasına yönlendirilirsiniz. Kredi kartı ile ödeme yapabilirsiniz.

## Uzman olarak nasıl başvurabilirim?
Kayıt olurken "Uzman" seçeneğini işaretleyin. Başvurunuz incelendikten sonra onaylanacaktır.

## Randevumu iptal edebilir miyim?
Randevunuzu en az 24 saat öncesinden iptal edebilirsiniz. İptal politikası için uzmanla iletişime geçin.

## Verilerim güvende mi?
Evet, tüm verileriniz şifrelenmiş olarak saklanır ve üçüncü şahıslarla paylaşılmaz.`;

function parseContentToFAQs(content: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  const lines = content.split('\n');
  
  let currentQuestion = '';
  let currentAnswer: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      // Save previous FAQ if exists
      if (currentQuestion && currentAnswer.length > 0) {
        faqs.push({
          question: currentQuestion,
          answer: currentAnswer.join('\n').trim()
        });
      }
      currentQuestion = trimmed.replace('## ', '');
      currentAnswer = [];
    } else if (trimmed && currentQuestion) {
      currentAnswer.push(trimmed);
    }
  }
  
  // Don't forget the last FAQ
  if (currentQuestion && currentAnswer.length > 0) {
    faqs.push({
      question: currentQuestion,
      answer: currentAnswer.join('\n').trim()
    });
  }
  
  return faqs;
}

const faqHighlights = [
  {
    icon: HelpCircle,
    title: "Sorularınız mı var?",
    description: "En sık sorulan sorulara göz atın"
  },
  {
    icon: MessageCircle,
    title: "Canlı Destek",
    description: "Bize iletişim sayfasından ulaşın"
  },
  {
    icon: Search,
    title: "Hızlı Cevap",
    description: "Aradığınızı hemen bulun"
  }
];

export default function FAQ() {
  const { data: page, isLoading } = useStaticPage("faq");
  const content = page?.content || defaultContent;
  const title = page?.title || "Sıkça Sorulan Sorular";
  const faqs = parseContentToFAQs(content);

  if (isLoading) {
    return (
      <div className="min-h-[80vh]">
        <div className="relative py-12 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="container px-4 md:px-6 lg:px-8 relative">
            <PageBreadcrumb />
            <div className="text-center max-w-3xl mx-auto mt-6">
              <Skeleton className="h-12 w-2/3 mx-auto mb-4 bg-secondary/50" />
              <Skeleton className="h-6 w-1/2 mx-auto bg-secondary/40" />
            </div>
          </div>
        </div>
        <div className="container px-4 md:px-6 lg:px-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl bg-secondary/40" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-secondary/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      {/* Hero Section */}
      <div className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-primary-glow/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container px-4 md:px-6 lg:px-8 relative">
          <PageBreadcrumb />
          <div className="text-center max-w-3xl mx-auto mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-silver mb-4">
              {title}
            </h1>
            <p className="text-foreground/60 text-lg">
              Merak ettiklerinize hızlı cevaplar
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Highlights */}
      <div className="container px-4 md:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {faqHighlights.map((item, index) => {
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

        {/* FAQ Accordion */}
        <div className="glass-effect rounded-2xl p-6 md:p-8 border-border/30 shadow-elegant">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-border/30 rounded-xl px-4 data-[state=open]:bg-secondary/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

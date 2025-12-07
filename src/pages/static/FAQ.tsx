import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { useStaticPage } from "@/hooks/useStaticPages";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

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
      if (currentQuestion && currentAnswer.length > 0) {
        faqs.push({
          question: currentQuestion,
          answer: currentAnswer.join(' ')
        });
      }
      currentQuestion = trimmed.replace('## ', '');
      currentAnswer = [];
    } else if (trimmed && currentQuestion) {
      currentAnswer.push(trimmed);
    }
  }
  
  if (currentQuestion && currentAnswer.length > 0) {
    faqs.push({
      question: currentQuestion,
      answer: currentAnswer.join(' ')
    });
  }
  
  return faqs;
}

export default function FAQ() {
  const { data: page, isLoading } = useStaticPage("faq");
  const content = page?.content || defaultContent;
  const title = page?.title || "Sıkça Sorulan Sorular";
  const faqs = parseContentToFAQs(content);

  if (isLoading) {
    return (
      <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
        <PageBreadcrumb />
        <Skeleton className="h-10 w-1/3 mx-auto mb-6 md:mb-8" />
        <div className="space-y-3 max-w-3xl mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      
      <div className="flex items-center justify-center gap-3 mb-6 md:mb-8">
        <HelpCircle className="w-6 h-6 md:w-7 md:h-7 text-primary" />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{title}</h1>
      </div>
      
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm max-w-3xl mx-auto">
        <CardContent className="p-4 md:p-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                <AccordionTrigger className="text-left hover:no-underline hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

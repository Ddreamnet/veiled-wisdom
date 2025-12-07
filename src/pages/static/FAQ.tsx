import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

export default function FAQ() {
  const faqs = [
    {
      question: "Platform nasıl çalışır?",
      answer: "Kayıt olduktan sonra kategorilerde uzmanları inceleyebilir, mesajlaşabilir ve randevu alabilirsiniz.",
    },
    {
      question: "Ödeme nasıl yapılır?",
      answer:
        "Randevu oluşturduktan sonra güvenli ödeme sayfasına yönlendirilirsiniz. Kredi kartı ile ödeme yapabilirsiniz.",
    },
    {
      question: "Uzman olarak nasıl başvurabilirim?",
      answer: 'Kayıt olurken "Uzman" seçeneğini işaretleyin. Başvurunuz incelendikten sonra onaylanacaktır.',
    },
    {
      question: "Randevumu iptal edebilir miyim?",
      answer:
        "Randevunuzu en az 24 saat öncesinden iptal edebilirsiniz. İptal politikası için uzmanla iletişime geçin.",
    },
    {
      question: "Verilerim güvende mi?",
      answer: "Evet, tüm verileriniz şifrelenmiş olarak saklanır ve üçüncü şahıslarla paylaşılmaz.",
    },
  ];

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">Sıkça Sorulan Sorular</h1>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function FAQ() {
  const faqs = [
    {
      question: 'Platform nasıl çalışır?',
      answer:
        'Kayıt olduktan sonra kategorilerde uzman hocaları inceleyebilir, mesajlaşabilir ve randevu alabilirsiniz.',
    },
    {
      question: 'Ödeme nasıl yapılır?',
      answer:
        'Randevu oluşturduktan sonra güvenli ödeme sayfasına yönlendirilirsiniz. Kredi kartı ile ödeme yapabilirsiniz.',
    },
    {
      question: 'Hoca olarak nasıl başvurabilirim?',
      answer:
        'Kayıt olurken "Hoca" seçeneğini işaretleyin. Başvurunuz incelendikten sonra onaylanacaktır.',
    },
    {
      question: 'Randevumu iptal edebilir miyim?',
      answer:
        'Randevunuzu en az 24 saat öncesinden iptal edebilirsiniz. İptal politikası için hocayla iletişime geçin.',
    },
    {
      question: 'Verilerim güvende mi?',
      answer:
        'Evet, tüm verileriniz şifrelenmiş olarak saklanır ve üçüncü şahıslarla paylaşılmaz.',
    },
  ];

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Sıkça Sorulan Sorular</h1>
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

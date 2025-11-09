import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Search, Calendar, MessageSquare } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: 'Kayıt Olun',
      description: 'Ücretsiz hesap oluşturun ve platformumuza katılın.',
    },
    {
      icon: Search,
      title: 'Hoca Seçin',
      description: 'İhtiyacınıza uygun kategoride uzman hocaları keşfedin.',
    },
    {
      icon: MessageSquare,
      title: 'İletişime Geçin',
      description: 'Hocayla mesajlaşarak tarih ve saat belirleyin.',
    },
    {
      icon: Calendar,
      title: 'Randevu Alın',
      description: 'Ödeme yapın ve randevunuzu tamamlayın.',
    },
  ];

  return (
    <div className="container py-12 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Nasıl Çalışır</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={index} className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

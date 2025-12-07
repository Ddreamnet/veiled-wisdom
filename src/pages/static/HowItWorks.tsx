import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Search, Calendar, MessageSquare } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: "Kayıt Olun",
      description: "Ücretsiz hesap oluşturun ve platformumuza katılın.",
    },
    {
      icon: Search,
      title: "Uzman Seçin",
      description: "İhtiyacınıza uygun kategoride uzmanları keşfedin.",
    },
    {
      icon: MessageSquare,
      title: "İletişime Geçin",
      description: "Uzmanla mesajlaşarak tarih ve saat belirleyin.",
    },
    {
      icon: Calendar,
      title: "Randevu Alın",
      description: "Ödeme yapın ve randevunuzu tamamlayın.",
    },
  ];

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8 text-center">Nasıl Çalışır</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';

export default function Contact() {
  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8">
      <PageBreadcrumb />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">İletişim</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-5 md:p-6 text-center">
            <Mail className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
            <h3 className="font-semibold mb-2 text-sm md:text-base">E-posta</h3>
            <p className="text-sm text-muted-foreground">info@elleyl.com</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 md:p-6 text-center">
            <Phone className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
            <h3 className="font-semibold mb-2 text-sm md:text-base">Telefon</h3>
            <p className="text-sm text-muted-foreground">+90 XXX XXX XX XX</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 md:p-6 text-center">
            <MapPin className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
            <h3 className="font-semibold mb-2 text-sm md:text-base">Adres</h3>
            <p className="text-sm text-muted-foreground">İstanbul, Türkiye</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

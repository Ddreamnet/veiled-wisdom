import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Contact() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">İletişim</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">E-posta</h3>
            <p className="text-sm text-muted-foreground">info@elleyl.com</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Telefon</h3>
            <p className="text-sm text-muted-foreground">+90 XXX XXX XX XX</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Adres</h3>
            <p className="text-sm text-muted-foreground">İstanbul, Türkiye</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

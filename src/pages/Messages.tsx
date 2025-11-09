import { MessageSquare } from 'lucide-react';

export default function Messages() {
  return (
    <div className="container py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <MessageSquare className="h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-4">Mesajlar</h1>
        <p className="text-muted-foreground max-w-md">
          Mesajlaşma özelliği yakında eklenecek. Hocalarınızla iletişime geçebileceksiniz.
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateStaticPage } from '@/hooks/useStaticPages';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: {
    slug: string;
    title: string;
    content: string;
  };
}

export function PageEditDialog({ open, onOpenChange, page }: PageEditDialogProps) {
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const updatePage = useUpdateStaticPage();

  useEffect(() => {
    setTitle(page.title);
    setContent(page.content);
  }, [page]);

  const handleSave = async () => {
    try {
      await updatePage.mutateAsync({
        slug: page.slug,
        title,
        content,
      });
      toast.success('Sayfa güncellendi');
      onOpenChange(false);
    } catch (error) {
      toast.error('Sayfa güncellenirken hata oluştu');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sayfayı Düzenle: {page.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Sayfa Başlığı</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sayfa başlığı"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Sayfa İçeriği</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Sayfa içeriği (Her paragrafı yeni satırda yazın)"
              className="min-h-[300px]"
            />
            <p className="text-xs text-muted-foreground">
              Her paragrafı ayrı bir satırda yazın. Bölüm başlıkları için satır başına ## ekleyin.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSave} disabled={updatePage.isPending}>
            {updatePage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

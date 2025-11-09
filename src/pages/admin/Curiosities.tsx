import { useEffect, useState } from 'react';
import { supabase, Curiosity } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function CuriositiesManagement() {
  const [curiosities, setCuriosities] = useState<Curiosity[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCuriosities();
  }, []);

  const fetchCuriosities = async () => {
    const { data } = await supabase
      .from('curiosities')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCuriosities(data);
  };

  const handleSubmit = async () => {
    if (editingId) {
      const { error } = await supabase
        .from('curiosities')
        .update({ title, slug, content })
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Hata',
          description: 'Yazı güncellenemedi.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Başarılı',
        description: 'Yazı güncellendi.',
      });
    } else {
      const { error } = await supabase
        .from('curiosities')
        .insert({ title, slug, content });

      if (error) {
        toast({
          title: 'Hata',
          description: 'Yazı oluşturulamadı.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Başarılı',
        description: 'Yazı oluşturuldu.',
      });
    }

    setOpen(false);
    setEditingId(null);
    setTitle('');
    setSlug('');
    setContent('');
    fetchCuriosities();
  };

  const handleEdit = (curiosity: Curiosity) => {
    setEditingId(curiosity.id);
    setTitle(curiosity.title);
    setSlug(curiosity.slug);
    setContent(curiosity.content);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('curiosities').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Yazı silinemedi.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Başarılı',
      description: 'Yazı silindi.',
    });

    fetchCuriosities();
  };

  return (
    <div className="container py-12 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Merak Konuları</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                setTitle('');
                setSlug('');
                setContent('');
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Yazı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Yazıyı Düzenle' : 'Yeni Yazı Ekle'}
              </DialogTitle>
              <DialogDescription>
                Merak konuları bölümünde gösterilecek yazıyı oluşturun.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Başlık</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="content">İçerik</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit}>
                {editingId ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {curiosities.map((curiosity) => (
          <Card key={curiosity.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{curiosity.title}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(curiosity)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(curiosity.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {curiosity.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

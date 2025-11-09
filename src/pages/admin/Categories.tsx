import { useEffect, useState } from 'react';
import { supabase, Category } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('parent_id', { ascending: true });

    if (data) {
      setCategories(data);
      setMainCategories(data.filter((c) => !c.parent_id));
    }
  };

  const handleCreate = async () => {
    const { error } = await supabase.from('categories').insert({
      name,
      slug,
      parent_id: parentId || null,
    });

    if (error) {
      toast({
        title: 'Hata',
        description: 'Kategori oluşturulamadı.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Başarılı',
      description: 'Kategori oluşturuldu.',
    });

    setOpen(false);
    setName('');
    setSlug('');
    setParentId('');
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Kategori silinemedi.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Başarılı',
      description: 'Kategori silindi.',
    });

    fetchCategories();
  };

  const renderCategory = (category: Category) => {
    const subCategories = categories.filter((c) => c.parent_id === category.id);

    return (
      <Card key={category.id} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{category.name}</CardTitle>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(category.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        {subCategories.length > 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Alt Kategoriler:</p>
            <div className="space-y-2">
              {subCategories.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <span>{sub.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(sub.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="container py-12 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Kategorileri Düzenle</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kategori
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kategori Ekle</DialogTitle>
              <DialogDescription>
                Ana kategori veya alt kategori ekleyebilirsiniz.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Kategori Adı</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                <Label>Ana Kategori (opsiyonel)</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ana Kategori</SelectItem>
                    {mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Oluştur</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>{mainCategories.map(renderCategory)}</div>
    </div>
  );
}

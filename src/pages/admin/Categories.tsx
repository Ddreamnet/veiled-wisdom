import { useEffect, useState } from 'react';
import { supabase, Category } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, FolderPlus } from 'lucide-react';
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
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';

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

  const handleAddSubCategory = (parentCategory: Category) => {
    setParentId(parentCategory.id);
    setName('');
    setSlug('');
    setOpen(true);
  };

  const handleOpenNewDialog = () => {
    setParentId('');
    setName('');
    setSlug('');
    setOpen(true);
  };

  const renderCategory = (category: Category) => {
    const subCategories = categories.filter((c) => c.parent_id === category.id);

    return (
      <Card key={category.id} className="mb-4">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">{category.name}</CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Slug: {category.slug}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddSubCategory(category)}
                className="gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Alt Kategori</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(category.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {subCategories.length > 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3 font-medium">
              Alt Kategoriler ({subCategories.length})
            </p>
            <div className="space-y-2">
              {subCategories.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border/50"
                >
                  <div>
                    <span className="font-medium text-sm md:text-base">{sub.name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Slug: {sub.slug}</p>
                  </div>
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
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Kategorileri Düzenle</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ana kategorileri yönetin ve alt kategoriler ekleyin
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Yeni Ana Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect border-silver/20">
            <DialogHeader>
              <DialogTitle>
                {parentId ? 'Alt Kategori Ekle' : 'Yeni Ana Kategori Ekle'}
              </DialogTitle>
              <DialogDescription>
                {parentId 
                  ? `"${mainCategories.find(c => c.id === parentId)?.name}" kategorisi için alt kategori ekleyin.`
                  : 'Yeni bir ana kategori oluşturun.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Kategori Adı</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Bakımlar, Astroloji"
                  className="glass-effect border-silver/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL'de görünecek)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Örn: bakimlar, astroloji"
                  className="glass-effect border-silver/20"
                />
                <p className="text-xs text-muted-foreground">
                  Küçük harf, tire ve rakam kullanın
                </p>
              </div>
              {!parentId && (
                <div className="space-y-2">
                  <Label>Ana Kategori (opsiyonel)</Label>
                  <Select value={parentId || ''} onValueChange={setParentId}>
                    <SelectTrigger className="glass-effect border-silver/20">
                      <SelectValue placeholder="Ana Kategori (yok)" />
                    </SelectTrigger>
                    <SelectContent className="glass-effect border-silver/20">
                      <SelectItem value="">Ana Kategori</SelectItem>
                      {mainCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Boş bırakırsanız ana kategori olarak oluşturulur
                  </p>
                </div>
              )}
              {parentId && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Ana Kategori:</span>{' '}
                    <span className="text-primary">
                      {mainCategories.find(c => c.id === parentId)?.name}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!name || !slug}>
                {parentId ? 'Alt Kategori Ekle' : 'Ana Kategori Oluştur'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div>{mainCategories.map(renderCategory)}</div>
    </div>
  );
}

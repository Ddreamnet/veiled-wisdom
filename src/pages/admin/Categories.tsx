import { useEffect, useState } from 'react';
import { supabase, Category } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, FolderPlus, Edit, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminBreadcrumb } from '@/components/AdminBreadcrumb';
import { CategoryImageUpload } from '@/components/CategoryImageUpload';

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (data) {
      setCategories(data);
      setMainCategories(data.filter((c) => !c.parent_id));
    }
  };

  const handleCreate = async () => {
    if (editingId) {
      // Update existing category
      const { error } = await supabase
        .from('categories')
        .update({
          name,
          slug,
          parent_id: parentId || null,
          image_url: imageUrl || null,
        })
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Hata',
          description: 'Kategori güncellenemedi.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Başarılı',
        description: 'Kategori güncellendi.',
      });
    } else {
      // Create new category
      const { error } = await supabase.from('categories').insert({
        name,
        slug,
        parent_id: parentId || null,
        image_url: imageUrl || null,
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
    }

    setOpen(false);
    setName('');
    setSlug('');
    setParentId('');
    setImageUrl('');
    setEditingId(null);
    fetchCategories();
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Kategori silinemedi.',
        variant: 'destructive',
      });
      setCategoryToDelete(null);
      return;
    }

    toast({
      title: 'Başarılı',
      description: 'Kategori silindi.',
    });

    setCategoryToDelete(null);
    fetchCategories();
  };

  const handleAddSubCategory = (parentCategory: Category) => {
    setEditingId(null);
    setParentId(parentCategory.id);
    setName('');
    setSlug('');
    setImageUrl('');
    setOpen(true);
  };

  const handleOpenNewDialog = () => {
    setEditingId(null);
    setParentId('');
    setName('');
    setSlug('');
    setImageUrl('');
    setOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setParentId(category.parent_id || '');
    setImageUrl(category.image_url || '');
    setOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent, parentId: string | null = null) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const itemsToSort = parentId 
      ? categories.filter((c) => c.parent_id === parentId)
      : mainCategories;

    const oldIndex = itemsToSort.findIndex((item) => item.id === active.id);
    const newIndex = itemsToSort.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(itemsToSort, oldIndex, newIndex);

    // Update display_order for all affected items
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      display_order: index,
    }));

    // Optimistically update UI
    if (parentId) {
      setCategories((prev) =>
        prev.map((cat) => {
          const update = updates.find((u) => u.id === cat.id);
          return update ? { ...cat, display_order: update.display_order } : cat;
        })
      );
    } else {
      setMainCategories(reorderedItems);
    }

    // Update database
    try {
      for (const update of updates) {
        await supabase
          .from('categories')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      toast({
        title: 'Başarılı',
        description: 'Kategori sırası güncellendi.',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Sıralama güncellenemedi.',
        variant: 'destructive',
      });
      fetchCategories(); // Revert on error
    }
  };

  const SortableCategory = ({ category }: { category: Category }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const subCategories = categories.filter((c) => c.parent_id === category.id);

    return (
      <Card ref={setNodeRef} style={style} className="mb-4">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-xl">{category.name}</CardTitle>
                <CardDescription className="text-xs md:text-sm mt-1">
                  Slug: {category.slug}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(category)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Düzenle</span>
              </Button>
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
                onClick={() => setCategoryToDelete(category.id)}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, category.id)}
            >
              <SortableContext
                items={subCategories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {subCategories.map((sub) => (
                    <SortableSubCategory key={sub.id} category={sub} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        )}
      </Card>
    );
  };

  const SortableSubCategory = ({ category }: { category: Category }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between p-3 bg-muted/50 rounded-md border border-border/50"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm md:text-base">{category.name}</span>
            <p className="text-xs text-muted-foreground mt-0.5">Slug: {category.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(category)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCategoryToDelete(category.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
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
                {editingId 
                  ? 'Kategori Düzenle' 
                  : parentId 
                    ? 'Alt Kategori Ekle' 
                    : 'Yeni Ana Kategori Ekle'
                }
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Kategori bilgilerini güncelleyin.'
                  : parentId 
                    ? `"${mainCategories.find(c => c.id === parentId)?.name}" kategorisi için alt kategori ekleyin.`
                    : 'Yeni bir ana kategori oluşturun.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-2">
                <Label>Kategori Görseli</Label>
                <CategoryImageUpload
                  currentImageUrl={imageUrl}
                  categoryId={editingId || 'new'}
                  onUploadComplete={(url) => setImageUrl(url)}
                  onRemove={() => setImageUrl('')}
                />
              </div>
              
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
              {!parentId && !editingId && (
                <div className="space-y-2">
                  <Label>Ana Kategori (opsiyonel)</Label>
                  <Select value={parentId || undefined} onValueChange={setParentId}>
                    <SelectTrigger className="glass-effect border-silver/20">
                      <SelectValue placeholder="Ana Kategori (yok)" />
                    </SelectTrigger>
                    <SelectContent className="glass-effect border-silver/20">
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
              {(parentId || (editingId && categories.find(c => c.id === editingId)?.parent_id)) && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Ana Kategori:</span>{' '}
                    <span className="text-primary">
                      {mainCategories.find(c => c.id === (parentId || categories.find(cat => cat.id === editingId)?.parent_id))?.name}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!name || !slug}>
                {editingId 
                  ? 'Güncelle' 
                  : parentId 
                    ? 'Alt Kategori Ekle' 
                    : 'Ana Kategori Oluştur'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => handleDragEnd(event, null)}
      >
        <SortableContext
          items={mainCategories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {mainCategories.map((category) => (
              <SortableCategory key={category.id} category={category} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog open={categoryToDelete !== null} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
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
import { Switch } from '@/components/ui/switch';

export default function MyListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingWithPrices[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [coverUrl, setCoverUrl] = useState('');
  const [price30, setPrice30] = useState('');
  const [price45, setPrice45] = useState('');
  const [price60, setPrice60] = useState('');

  useEffect(() => {
    if (user) {
      fetchListings();
      fetchCategories();
    }
  }, [user]);

  const fetchListings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('listings')
      .select('*, category:categories(*)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const listingsWithPrices = await Promise.all(
        data.map(async (listing) => {
          const { data: prices } = await supabase
            .from('listing_prices')
            .select('*')
            .eq('listing_id', listing.id);

          return {
            ...listing,
            prices: prices || [],
          };
        })
      );

      setListings(listingsWithPrices as any);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) setCategories(data);
  };

  const handleEdit = (listing: ListingWithPrices) => {
    setEditingId(listing.id);
    setTitle(listing.title);
    setDescription(listing.description || '');
    setCategoryId(listing.category_id);
    setIsActive(listing.is_active);
    setCoverUrl(listing.cover_url || '');

    const p30 = listing.prices.find((p) => p.duration_minutes === 30);
    const p45 = listing.prices.find((p) => p.duration_minutes === 45);
    const p60 = listing.prices.find((p) => p.duration_minutes === 60);

    setPrice30(p30?.price.toString() || '');
    setPrice45(p45?.price.toString() || '');
    setPrice60(p60?.price.toString() || '');

    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    const listingData = {
      title,
      description,
      category_id: categoryId,
      is_active: isActive,
      cover_url: coverUrl || null,
      teacher_id: user.id,
    };

    let listingId = editingId;

    if (editingId) {
      const { error } = await supabase
        .from('listings')
        .update(listingData)
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Hata',
          description: 'İlan güncellenemedi.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single();

      if (error || !data) {
        toast({
          title: 'Hata',
          description: 'İlan oluşturulamadı.',
          variant: 'destructive',
        });
        return;
      }

      listingId = data.id;
    }

    // Update prices
    if (listingId) {
      await supabase.from('listing_prices').delete().eq('listing_id', listingId);

      const prices = [];
      if (price30) prices.push({ listing_id: listingId, duration_minutes: 30, price: parseFloat(price30) });
      if (price45) prices.push({ listing_id: listingId, duration_minutes: 45, price: parseFloat(price45) });
      if (price60) prices.push({ listing_id: listingId, duration_minutes: 60, price: parseFloat(price60) });

      if (prices.length > 0) {
        await supabase.from('listing_prices').insert(prices);
      }
    }

    toast({
      title: 'Başarılı',
      description: editingId ? 'İlan güncellendi.' : 'İlan oluşturuldu.',
    });

    setOpen(false);
    resetForm();
    fetchListings();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('listings').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'İlan silinemedi.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Başarılı',
      description: 'İlan silindi.',
    });

    fetchListings();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
    setIsActive(true);
    setCoverUrl('');
    setPrice30('');
    setPrice45('');
    setPrice60('');
  };

  return (
    <div className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">İlanlarım</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni İlan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'İlanı Düzenle' : 'Yeni İlan Oluştur'}</DialogTitle>
              <DialogDescription>
                İlan bilgilerini ve fiyatlandırmanı belirle.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">İlan Başlığı</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">İlan Açıklaması</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active">İlan aktif</Label>
              </div>

              {editingId && (
                <div>
                  <Label>İlan Görseli</Label>
                  <ImageUpload
                    currentImageUrl={coverUrl}
                    listingId={editingId}
                    onUploadComplete={setCoverUrl}
                    onRemove={() => setCoverUrl('')}
                  />
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Seans Fiyatları</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price30">30 Dakika (TL)</Label>
                    <Input
                      id="price30"
                      type="number"
                      value={price30}
                      onChange={(e) => setPrice30(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price45">45 Dakika (TL)</Label>
                    <Input
                      id="price45"
                      type="number"
                      value={price45}
                      onChange={(e) => setPrice45(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price60">60 Dakika (TL)</Label>
                    <Input
                      id="price60"
                      type="number"
                      value={price60}
                      onChange={(e) => setPrice60(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
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

      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Henüz ilan oluşturmadınız.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing.id} className="hover:shadow-glow transition-smooth">
              {listing.cover_url && (
                <img
                  src={listing.cover_url}
                  alt={listing.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  {listing.is_active ? (
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">
                      Aktif
                    </span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                      Pasif
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {listing.description}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Kategori: {listing.category.name}
                </p>
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Fiyatlar:</p>
                  {listing.prices.map((price) => (
                    <div key={price.duration_minutes} className="text-sm">
                      {price.duration_minutes} dk: {price.price} TL
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(listing)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Düzenle
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(listing.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

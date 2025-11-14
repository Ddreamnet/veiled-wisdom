import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase, Category, Listing, ListingPrice } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, Filter, BookOpen } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type ListingWithPrices = Listing & {
  prices: ListingPrice[];
  category: Category;
};

const listingFormSchema = z.object({
  title: z.string()
    .min(5, { message: "Başlık en az 5 karakter olmalıdır" })
    .max(100, { message: "Başlık en fazla 100 karakter olabilir" }),
  description: z.string()
    .min(20, { message: "Açıklama en az 20 karakter olmalıdır" })
    .max(1000, { message: "Açıklama en fazla 1000 karakter olabilir" }),
  category_id: z.string().min(1, { message: "Kategori seçmelisiniz" }),
  subcategory_id: z.string().optional(),
  is_active: z.boolean().default(true),
  cover_url: z.string().optional(),
  price_30: z.string().optional(),
  price_45: z.string().optional(),
  price_60: z.string().optional(),
}).refine((data) => {
  const hasAtLeastOnePrice = data.price_30 || data.price_45 || data.price_60;
  return hasAtLeastOnePrice;
}, {
  message: "En az bir fiyat girmelisiniz",
  path: ["price_30"],
}).refine((data) => {
  const prices = [data.price_30, data.price_45, data.price_60].filter(Boolean);
  return prices.every(price => {
    const num = parseFloat(price!);
    return !isNaN(num) && num > 0 && num <= 10000;
  });
}, {
  message: "Fiyatlar 0-10000 TL arasında olmalıdır",
  path: ["price_30"],
});

export default function MyListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingWithPrices[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const form = useForm<z.infer<typeof listingFormSchema>>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category_id: '',
      subcategory_id: '',
      is_active: true,
      cover_url: '',
      price_30: '',
      price_45: '',
      price_60: '',
    },
  });

  useEffect(() => {
    if (user) {
      fetchListings();
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    const categoryId = form.watch('category_id');
    if (categoryId) {
      fetchSubcategories(categoryId);
    } else {
      setSubcategories([]);
    }
  }, [form.watch('category_id')]);

  const fetchListings = async () => {
    if (!user) return;
    setLoading(true);

    try {
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
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'İlanlar yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('name');

    if (data) setCategories(data);
  };

  const fetchSubcategories = async (parentId: string) => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .order('name');

    if (data) setSubcategories(data);
  };

  const handleEdit = (listing: ListingWithPrices) => {
    setEditingId(listing.id);

    const p30 = listing.prices.find((p) => p.duration_minutes === 30);
    const p45 = listing.prices.find((p) => p.duration_minutes === 45);
    const p60 = listing.prices.find((p) => p.duration_minutes === 60);

    // Check if listing has a parent category (is subcategory)
    const parentCategory = categories.find(c => c.id === listing.category.parent_id);
    
    form.reset({
      title: listing.title,
      description: listing.description || '',
      category_id: parentCategory ? listing.category.parent_id! : listing.category_id,
      subcategory_id: parentCategory ? listing.category_id : '',
      is_active: listing.is_active,
      cover_url: listing.cover_url || '',
      price_30: p30?.price.toString() || '',
      price_45: p45?.price.toString() || '',
      price_60: p60?.price.toString() || '',
    });

    setOpen(true);
  };

  const handleSubmit = async (values: z.infer<typeof listingFormSchema>) => {
    if (!user) return;
    setSubmitting(true);

    try {
      // Use subcategory if available, otherwise use main category
      const finalCategoryId = values.subcategory_id || values.category_id;

      const listingData = {
        title: values.title,
        description: values.description,
        category_id: finalCategoryId,
        is_active: values.is_active,
        cover_url: values.cover_url || null,
        teacher_id: user.id,
      };

      let listingId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('listings')
          .insert(listingData)
          .select()
          .single();

        if (error || !data) throw error;
        listingId = data.id;
      }

      // Update prices
      if (listingId) {
        await supabase.from('listing_prices').delete().eq('listing_id', listingId);

        const prices = [];
        if (values.price_30) prices.push({ listing_id: listingId, duration_minutes: 30, price: parseFloat(values.price_30) });
        if (values.price_45) prices.push({ listing_id: listingId, duration_minutes: 45, price: parseFloat(values.price_45) });
        if (values.price_60) prices.push({ listing_id: listingId, duration_minutes: 60, price: parseFloat(values.price_60) });

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
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'İlan kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
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
    setSubcategories([]);
    form.reset({
      title: '',
      description: '',
      category_id: '',
      subcategory_id: '',
      is_active: true,
      cover_url: '',
      price_30: '',
      price_45: '',
      price_60: '',
    });
  };

  // Filtered listings
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && listing.is_active) ||
      (filterStatus === 'inactive' && !listing.is_active);
    
    const matchesCategory = filterCategory === 'all' || listing.category_id === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalListings = listings.length;
  const activeListings = listings.filter(l => l.is_active).length;
  const inactiveListings = listings.filter(l => !l.is_active).length;

  return (
    <div className="container px-4 md:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">İlanlarım</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni İlan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'İlanı Düzenle' : 'Yeni İlan Oluştur'}</DialogTitle>
                <DialogDescription>
                  İlan bilgilerini ve fiyatlandırmanı belirle. Tüm alanlar zorunludur.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İlan Başlığı *</FormLabel>
                        <FormControl>
                          <Input placeholder="Örn: Astroloji Danışmanlığı" {...field} />
                        </FormControl>
                        <FormDescription>
                          5-100 karakter arası olmalıdır
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İlan Açıklaması *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="İlanınızı detaylı bir şekilde açıklayın..." 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          20-1000 karakter arası olmalıdır
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category & Subcategory */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ana Kategori *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Kategori seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {subcategories.length > 0 && (
                      <FormField
                        control={form.control}
                        name="subcategory_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alt Kategori</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Alt kategori seçin (opsiyonel)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subcategories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Is Active */}
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">İlan aktif</FormLabel>
                      </FormItem>
                    )}
                  />

                  {/* Image Upload (only for editing) */}
                  {editingId && (
                    <FormField
                      control={form.control}
                      name="cover_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>İlan Görseli</FormLabel>
                          <FormControl>
                            <ImageUpload
                              currentImageUrl={field.value}
                              listingId={editingId}
                              onUploadComplete={field.onChange}
                              onRemove={() => field.onChange('')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Pricing */}
                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Seans Fiyatları *</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        En az bir fiyat girmelisiniz. Fiyatlar 0-10000 TL arasında olmalıdır.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="price_30"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>30 Dakika (TL)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price_45"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>45 Dakika (TL)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price_60"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>60 Dakika (TL)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Oluştur')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

      {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam İlan</p>
                  <p className="text-2xl font-bold">{totalListings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktif İlan</p>
                  <p className="text-2xl font-bold">{activeListings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pasif İlan</p>
                  <p className="text-2xl font-bold">{inactiveListings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="İlan ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="w-full h-48 rounded-t-lg" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 px-4 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {searchQuery || filterStatus !== 'all' || filterCategory !== 'all' ? (
              <>
                <p className="text-base md:text-lg font-semibold mb-2">Sonuç bulunamadı</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Arama kriterlerinize uygun ilan bulunamadı.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterCategory('all');
                  }}
                >
                  Filtreleri Temizle
                </Button>
              </>
            ) : (
              <>
                <p className="text-base md:text-lg font-semibold mb-2">Henüz ilan yok</p>
                <p className="text-sm text-muted-foreground mb-4">
                  İlk ilanınızı oluşturarak öğrencilere ulaşmaya başlayın.
                </p>
                <Button onClick={() => { resetForm(); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk İlanı Oluştur
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="hover:shadow-glow transition-smooth overflow-hidden">
              {listing.cover_url && (
                <img
                  src={listing.cover_url}
                  alt={listing.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{listing.title}</CardTitle>
                  {listing.is_active ? (
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded whitespace-nowrap">
                      Aktif
                    </span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded whitespace-nowrap">
                      Pasif
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {listing.description}
                </p>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>{listing.category.name}</span>
                </div>
                
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Fiyatlar:</p>
                  <div className="space-y-1">
                    {listing.prices.length > 0 ? (
                      listing.prices.map((price) => (
                        <div key={price.duration_minutes} className="flex justify-between text-sm">
                          <span>{price.duration_minutes} dakika</span>
                          <span className="font-semibold">{price.price} TL</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Fiyat bilgisi yok</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
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

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { supabase, Category, Listing, ListingPrice, ConsultationType } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, Filter, BookOpen, ArrowLeft, Home, Video, MessageSquare } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type ListingWithPrices = Listing & {
  prices: ListingPrice[];
  category: Category;
};

const pricePackageSchema = z.object({
  duration: z.string().min(1, "Süre gerekli"),
  price: z.string().min(1, "Fiyat gerekli"),
});

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
  consultation_type: z.enum(['video', 'messaging']),
  packages: z.array(pricePackageSchema).min(1, "En az bir paket eklemelisiniz"),
}).refine((data) => {
  return data.packages.every(pkg => {
    const duration = parseInt(pkg.duration);
    const price = parseFloat(pkg.price);
    return !isNaN(duration) && duration > 0 && duration <= 480 &&
           !isNaN(price) && price > 0 && price <= 10000;
  });
}, {
  message: "Süre 1-480 dakika, fiyat 0-10000 TL arasında olmalıdır",
  path: ["packages"],
});

type ListingFormValues = z.infer<typeof listingFormSchema>;

export default function MyListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category_id: '',
      subcategory_id: '',
      is_active: true,
      cover_url: '',
      consultation_type: 'video',
      packages: [{ duration: '30', price: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  const consultationType = form.watch('consultation_type');

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

      if (data && data.length > 0) {
        const listingIds = data.map(l => l.id);
        const { data: allPrices } = await supabase
          .from('listing_prices')
          .select('*')
          .in('listing_id', listingIds);

        const pricesMap: Record<string, any[]> = {};
        (allPrices || []).forEach(price => {
          if (!pricesMap[price.listing_id]) {
            pricesMap[price.listing_id] = [];
          }
          pricesMap[price.listing_id].push(price);
        });

        const listingsWithPrices = data.map(listing => ({
          ...listing,
          prices: pricesMap[listing.id] || [],
        }));

        setListings(listingsWithPrices as any);
      } else {
        setListings([]);
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

    const parentCategory = categories.find(c => c.id === listing.category.parent_id);
    
    // Convert existing prices to package format
    const packages = listing.prices.map(p => ({
      duration: p.duration_minutes.toString(),
      price: p.price.toString(),
    }));

    form.reset({
      title: listing.title,
      description: listing.description || '',
      category_id: parentCategory ? listing.category.parent_id! : listing.category_id,
      subcategory_id: parentCategory ? listing.category_id : '',
      is_active: listing.is_active,
      cover_url: listing.cover_url || '',
      consultation_type: listing.consultation_type || 'video',
      packages: packages.length > 0 ? packages : [{ duration: '30', price: '' }],
    });

    setOpen(true);
  };

  const handleSubmit = async (values: ListingFormValues) => {
    if (!user) return;
    setSubmitting(true);

    try {
      if (subcategories.length > 0 && !values.subcategory_id) {
        toast({
          title: 'Alt kategori gerekli',
          description: 'Lütfen bir alt kategori seçin.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const finalCategoryId = values.subcategory_id || values.category_id;

      const listingData = {
        title: values.title,
        description: values.description,
        category_id: finalCategoryId,
        is_active: values.is_active,
        cover_url: values.cover_url || null,
        teacher_id: user.id,
        consultation_type: values.consultation_type,
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
        const { error: deleteError } = await supabase
          .from('listing_prices')
          .delete()
          .eq('listing_id', listingId);

        if (deleteError) {
          console.error('Price deletion error:', deleteError);
          throw deleteError;
        }

        const prices = values.packages.map(pkg => ({
          listing_id: listingId,
          duration_minutes: parseInt(pkg.duration),
          price: parseFloat(pkg.price),
        }));

        if (prices.length > 0) {
          const { error: insertError } = await supabase
            .from('listing_prices')
            .insert(prices);

          if (insertError) {
            console.error('Price insertion error:', insertError);
            throw insertError;
          }
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
      console.error('Listing creation/update error:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'İlan kaydedilirken bir hata oluştu.',
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
      consultation_type: 'video',
      packages: [{ duration: '30', price: '' }],
    });
  };

  const formatDurationLabel = (minutes: number, type: ConsultationType) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return type === 'video' 
          ? `${hours} saat görüntülü görüşme`
          : `${hours} saat mesajlaşma`;
      }
      return type === 'video'
        ? `${hours} saat ${remainingMinutes} dk görüntülü görüşme`
        : `${hours} saat ${remainingMinutes} dk mesajlaşma`;
    }
    return type === 'video'
      ? `${minutes} dakika görüntülü görüşme`
      : `${minutes} dakika mesajlaşma`;
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
      {/* Breadcrumb Navigation - Desktop only */}
      <div className="mb-4 hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Ana Sayfa
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/profile">Öğretmen</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>İlanlarım</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Back Button - Mobile only */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4 md:hidden"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>

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

                  {/* Consultation Type */}
                  <FormField
                    control={form.control}
                    name="consultation_type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Görüşme Türü *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <div 
                              className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                field.value === 'video' 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => field.onChange('video')}
                            >
                              <RadioGroupItem value="video" id="video" />
                              <Label htmlFor="video" className="cursor-pointer flex items-center gap-2">
                                <Video className="h-5 w-5 text-primary" />
                                <span className="font-medium">Görüntülü Görüşme</span>
                              </Label>
                            </div>
                            <div 
                              className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                field.value === 'messaging' 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => field.onChange('messaging')}
                            >
                              <RadioGroupItem value="messaging" id="messaging" />
                              <Label htmlFor="messaging" className="cursor-pointer flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                <span className="font-medium">Mesajlaşma</span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  {/* Image Upload */}
                  <FormField
                    control={form.control}
                    name="cover_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İlan Görseli</FormLabel>
                        <FormControl>
                          <ImageUpload
                            currentImageUrl={field.value}
                            listingId={editingId || `temp-${Date.now()}`}
                            onUploadComplete={field.onChange}
                            onRemove={() => field.onChange('')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dynamic Pricing Packages */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">Paketler *</h3>
                        <p className="text-sm text-muted-foreground">
                          {consultationType === 'video' 
                            ? 'Görüntülü görüşme paketlerini belirleyin' 
                            : 'Mesajlaşma paketlerini belirleyin'}
                        </p>
                      </div>
                      {fields.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ duration: '', price: '' })}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Paket Ekle
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div 
                          key={field.id} 
                          className="grid grid-cols-[1fr,1fr,auto] gap-3 p-4 border rounded-xl bg-muted/30"
                        >
                          <FormField
                            control={form.control}
                            name={`packages.${index}.duration`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  Süre (dakika)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="480"
                                    placeholder="30"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`packages.${index}.price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Fiyat (TL)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    max="10000"
                                    placeholder="100"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex items-end pb-2">
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {form.formState.errors.packages && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.packages.message}
                      </p>
                    )}
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
          
          <div className="flex flex-wrap gap-2">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[180px]">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery || filterStatus !== 'all' || filterCategory !== 'all' 
              ? 'Sonuç bulunamadı' 
              : 'Henüz ilan yok'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
              ? 'Farklı filtreler deneyin'
              : 'İlk ilanınızı oluşturarak başlayın'}
          </p>
          {!searchQuery && filterStatus === 'all' && filterCategory === 'all' && (
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni İlan Oluştur
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden group">
              <div className="relative h-48 bg-muted">
                {listing.cover_url ? (
                  <img
                    src={listing.cover_url}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {listing.is_active ? (
                    <Badge className="bg-green-500">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Pasif</Badge>
                  )}
                  {listing.consultation_type === 'messaging' ? (
                    <Badge variant="outline" className="bg-background/80">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Mesaj
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-background/80">
                      <Video className="h-3 w-3 mr-1" />
                      Video
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-1">{listing.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {listing.description}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {listing.prices.slice(0, 3).map((price, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {formatDurationLabel(price.duration_minutes, listing.consultation_type || 'video').split(' ').slice(0, 2).join(' ')} - {price.price} TL
                    </Badge>
                  ))}
                  {listing.prices.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{listing.prices.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(listing)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Düzenle
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
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

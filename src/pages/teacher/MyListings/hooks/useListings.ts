import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { ListingWithPrices, ListingFormValues } from "../types";

export function useListings(userId: string | undefined) {
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('listings')
        .select('*, category:categories(*)')
        .eq('teacher_id', userId)
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
  }, [userId, toast]);

  const createOrUpdateListing = useCallback(async (
    values: ListingFormValues,
    editingId: string | null,
    subcategoriesExist: boolean
  ) => {
    if (!userId) return false;
    setSubmitting(true);

    try {
      if (subcategoriesExist && !values.subcategory_id) {
        toast({
          title: 'Alt kategori gerekli',
          description: 'Lütfen bir alt kategori seçin.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return false;
      }

      const finalCategoryId = values.subcategory_id || values.category_id;

      const listingData = {
        title: values.title,
        description: values.description,
        category_id: finalCategoryId,
        is_active: values.is_active,
        cover_url: values.cover_url || null,
        teacher_id: userId,
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

        let prices: { listing_id: string; duration_minutes: number; price: number }[] = [];
        
        if (values.consultation_type === 'product') {
          if (values.unit_price) {
            prices.push({
              listing_id: listingId,
              duration_minutes: 1,
              price: parseFloat(values.unit_price),
            });
          }
          if (values.product_packages && values.product_packages.length > 0) {
            values.product_packages.forEach(pkg => {
              prices.push({
                listing_id: listingId,
                duration_minutes: parseInt(pkg.quantity),
                price: parseFloat(pkg.price),
              });
            });
          }
        } else {
          prices = (values.packages || []).map(pkg => ({
            listing_id: listingId!,
            duration_minutes: parseInt(pkg.duration),
            price: parseFloat(pkg.price),
          }));
        }

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

      return true;
    } catch (error) {
      console.error('Listing creation/update error:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'İlan kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [userId, toast]);

  const deleteListing = useCallback(async (id: string) => {
    const { error } = await supabase.from('listings').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Hata',
        description: 'İlan silinemedi.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Başarılı',
      description: 'İlan silindi.',
    });

    return true;
  }, [toast]);

  return {
    listings,
    loading,
    submitting,
    fetchListings,
    createOrUpdateListing,
    deleteListing,
  };
}

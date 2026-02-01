import * as z from "zod";
import { Category, Listing, ListingPrice, ConsultationType } from "@/lib/supabase";

export type ListingWithPrices = Listing & {
  prices: ListingPrice[];
  category: Category;
};

export const pricePackageSchema = z.object({
  duration: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 480;
  }, { message: "Süre 1-480 dakika arasında olmalıdır" }),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 1 && num <= 10000;
  }, { message: "Fiyat 1-10000 TL arasında olmalıdır" }),
});

export const productPackageSchema = z.object({
  quantity: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 1000;
  }, { message: "Adet 1-1000 arasında olmalıdır" }),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 1 && num <= 100000;
  }, { message: "Fiyat 1-100000 TL arasında olmalıdır" }),
});

export const listingFormSchema = z.object({
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
  consultation_type: z.enum(['video', 'messaging', 'product']),
  packages: z.array(pricePackageSchema).optional(),
  unit_price: z.string().optional(),
  product_packages: z.array(productPackageSchema).optional(),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export type FilterStatus = 'all' | 'active' | 'inactive';

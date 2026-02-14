
# Tum Ilanlar Sayfasi ve Ana Sayfa Siralama Degisikligi

## Ozet
1. Tum aktif ilanlari listeleyen yeni bir `/listings` sayfasi olusturulacak
2. Ana sayfadaki bolum siralama degistirilecek: Kategoriler -> Tum Ilanlar -> Merak Konulari -> Uzmanlarimiz

## Degisiklikler

### 1. Yeni Query Hook: `useAllListings`
**Dosya:** `src/lib/queries/listingQueries.ts`

Tum aktif ilanlari ceken yeni bir React Query hook'u. Mevcut `useSubCategoryListings` ile ayni veri yapisini kullanacak (profil bilgisi, minimum fiyat dahil).

### 2. Query Export
**Dosya:** `src/lib/queries/index.ts`

`useAllListings` export'u eklenecek.

### 3. Yeni Sayfa: Tum Ilanlar
**Dosya:** `src/pages/AllListings.tsx`

- `SubCategoryDetail.tsx` ile ayni kart tasarimi (kapak gorseli, ogretmen avatari/ismi, baslik, aciklama, fiyat)
- Responsive grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Breadcrumb, baslik ve ilan sayisi
- Skeleton loading durumu
- Bos durum mesaji

### 4. Route Tanimi
**Dosya:** `src/routes/routeConfig.ts`

`/listings` path'i icin public route eklenecek. Lazy load ile `AllListings` sayfasi tanimlanacak.

### 5. Ana Sayfa Siralama Degisikligi
**Dosya:** `src/pages/Index.tsx`

Mevcut siralama:
```text
Hero -> Merak Konulari -> Kategoriler -> Uzmanlarimiz
```

Yeni siralama:
```text
Hero -> Kategoriler -> Tum Ilanlar (onizleme) -> Merak Konulari -> Uzmanlarimiz
```

Ana sayfada "Tum Ilanlar" bolumunde ilk 8 ilan gosterilecek ve "Tumunu Gor" butonu `/listings` sayfasina yonlendirecek. Ayni kart tasarimi kullanilacak.

### 6. Home Query Genisletme
**Dosya:** `src/lib/queries/homeQueries.ts`

Ana sayfa icin ilk 8 ilani da cekecek sekilde genisletilecek (profil ve fiyat bilgileriyle birlikte).

## Teknik Detaylar

| Dosya | Islem |
|-------|-------|
| `src/lib/queries/listingQueries.ts` | `useAllListings` hook ekle |
| `src/lib/queries/index.ts` | Export ekle |
| `src/pages/AllListings.tsx` | Yeni sayfa olustur |
| `src/routes/routeConfig.ts` | Route ve lazy import ekle |
| `src/pages/Index.tsx` | Bolum siralamasini degistir, Tum Ilanlar onizleme bolumu ekle |
| `src/lib/queries/homeQueries.ts` | Listings preview verisi ekle |

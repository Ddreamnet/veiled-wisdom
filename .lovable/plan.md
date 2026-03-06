

# Typography Dengeleme ve Ayarlar Sekme Seçici Yeniden Tasarımı

## 1. Global Typography Değişikliği (`src/index.css`)

**Mevcut:** `h1, h2, h3, h4, h5, h6 { font-family: Cinzel }` — tüm heading'ler otomatik Cinzel alıyor.

**Yeni:** Global kuralı `h1, h2` ile sınırla. `h3-h6` varsayılan sans-serif (Inter) kalacak. Büyük dekoratif başlıklarda zaten `font-serif` class'ı explicit olarak var, dolayısıyla onlar etkilenmez. Ama `CardTitle` (`h3`) gibi küçük utility başlıklar artık hafif ve okunaklı olacak.

```css
h1, h2 {
  font-family: 'Cinzel', serif;
  font-weight: 600;
  letter-spacing: 0.02em;
}
```

## 2. Ayarlar Sekme Seçici (`src/pages/Settings.tsx`)

Mevcut düz `bg-primary` active state yerine daha sofistike bir segmented control:
- Active state: `bg-primary/15` arka plan + `border border-primary/40` + `text-primary` ikon ve metin rengi + `shadow-sm`
- Geçiş: `transition-all duration-200`
- Mobilde label'lar her zaman gösterilsin (`hidden sm:inline` kaldırılacak) — küçük font ile
- İkon + label dikey hizalama (mobilde `flex-col`, desktop'ta `flex-row`)

## 3. Başlık Boyutu Dengeleme Haritası

| Dosya | Mevcut | Yeni |
|---|---|---|
| `Index.tsx` hero "LEYL" | `text-4xl md:text-6xl lg:text-7xl` | `text-3xl md:text-5xl lg:text-6xl` |
| `Index.tsx` "GİZLİ İLİMLER" | `text-2xl md:text-3xl lg:text-4xl` | `text-xl md:text-2xl lg:text-3xl` |
| `Index.tsx` section titles (KATEGORİLER, TÜM İLANLAR, MERAK KONULARI) | `text-3xl md:text-4xl` | `text-2xl md:text-3xl` |
| `Explore.tsx` "KATEGORİLERİ KEŞFET" | `text-3xl md:text-4xl` | `text-2xl md:text-3xl` |
| `Experts.tsx` "Uzmanlarımız" | `text-3xl sm:text-4xl lg:text-5xl` | `text-2xl sm:text-3xl lg:text-4xl` |
| `AllListings.tsx` "TÜM İLANLAR" | `text-3xl md:text-4xl` | `text-2xl md:text-3xl` |
| `CategoryDetail.tsx` kategori adı | `text-3xl md:text-4xl` | `text-2xl md:text-3xl` |
| `SubCategoryDetail.tsx` | `text-3xl md:text-4xl` | `text-2xl md:text-3xl` |
| `DesktopProfile.tsx` "HESAP AYARLARI" | `text-3xl md:text-4xl` | `text-2xl md:text-3xl` |
| `PublicProfile.tsx` uzman adı | `text-3xl sm:text-4xl lg:text-5xl` | `text-2xl sm:text-3xl lg:text-4xl` |
| `PublicProfile.tsx` section h2'ler | `text-2xl sm:text-3xl` | `text-xl sm:text-2xl` |
| `ExpertsCarousel.tsx` "UZMANLARIMIZ" | `text-3xl md:text-4xl` | `text-2xl md:text-3xl` |
| `Footer.tsx` "LEYL" | `text-3xl` | `text-2xl` |
| `SignUp.tsx` "KAYIT OL" | `text-3xl` | `text-2xl` |
| `SignIn.tsx` "GİRİŞ YAP" | `text-2xl md:text-3xl` | `text-xl md:text-2xl` |
| `StaticPageLayout.tsx` | `text-2xl md:text-3xl lg:text-4xl` | `text-xl md:text-2xl lg:text-3xl` |
| `Settings.tsx` "Ayarlar" | `text-3xl` | `text-2xl` |

## 4. Ayarlar Sekme İçerik Dağılımı

Mevcut dağılım mantıklı — değişiklik yapılmayacak. Sadece Gizlilik ve Destek sekmelerindeki link kartlarına hafif stil iyileştirmesi (daha dolgun `rounded-xl` ve `border` ile).

## 5. Dokunulacak Dosyalar (15 dosya)

`index.css`, `Settings.tsx`, `Index.tsx`, `Explore.tsx`, `Experts.tsx`, `AllListings.tsx`, `CategoryDetail.tsx`, `SubCategoryDetail.tsx`, `DesktopProfile.tsx`, `PublicProfile.tsx`, `ExpertsCarousel.tsx`, `Footer.tsx`, `SignUp.tsx`, `SignIn.tsx`, `StaticPageLayout.tsx`


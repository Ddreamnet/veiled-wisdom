
# Video Call Sayfasında MobileHeader Şeffaf Yapma

## Sorunun Kaynağı

`App.tsx` satır 112-115'te MobileHeader tüm sayfalarda gösteriliyor:
```typescript
<Routes>
  <Route path="/messages" element={null} />
  <Route path="*" element={<MobileHeader />} />
</Routes>
```

Bu, `/call/*` sayfalarında da MobileHeader'ın görünmesine neden oluyor. MobileHeader'ın mevcut stili:
- `backdrop-blur-xl bg-background/95` - opak arka plan
- `border-b border-silver/10` - alt kenarlık

## Çözüm Stratejisi

Video call sayfasında sadece geri butonunun görünmesi, arka planın tamamen şeffaf olması için:

### Seçenek 1: MobileHeader'a Şeffaf Mod Ekle (Önerilen)

`MobileHeader.tsx`'e video call route'u için özel stil ekle:

```typescript
const MobileHeaderComponent = ({ title, showBackButton, className }: MobileHeaderProps) => {
  const location = useLocation();
  
  // Video call sayfası kontrolü
  const isVideoCallPage = location.pathname.startsWith('/call/');
  
  // Video call sayfasında: sadece geri butonu, şeffaf arka plan
  if (isVideoCallPage) {
    return (
      <header 
        className="fixed top-0 left-0 z-50 md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
        </div>
      </header>
    );
  }
  
  // Normal header (mevcut kod)
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full md:hidden",
      "backdrop-blur-xl bg-background/95 border-b border-silver/10",
      ...
    )}>
      ...
    </header>
  );
};
```

### Seçenek 2: App.tsx'te Video Call İçin Header Gizle

```typescript
<Routes>
  <Route path="/messages" element={null} />
  <Route path="/call/*" element={null} />  // Video call'da header yok
  <Route path="*" element={<MobileHeader />} />
</Routes>
```

Sonra CallUI'da kendi geri butonunu ekle.

---

## Önerilen Çözüm: Seçenek 1

MobileHeader'ı değiştirmek daha temiz çünkü:
- Tek bir yerde değişiklik
- Geri butonu mantığı zaten MobileHeader'da mevcut
- Video call sayfasına özel şeffaf stil

## Teknik Değişiklikler

### Dosya: `src/components/mobile/MobileHeader.tsx`

```typescript
import { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  className?: string;
}

const ROOT_TAB_PATHS = [
  "/",
  "/explore",
  "/messages",
  "/appointments",
  "/profile",
  "/admin/dashboard",
  "/admin/earnings",
];

const MobileHeaderComponent = ({ title, showBackButton, className }: MobileHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // VIDEO CALL PAGE: Şeffaf arka plan, sadece geri butonu
  // ═══════════════════════════════════════════════════════════════════════════════
  const isVideoCallPage = location.pathname.startsWith('/call/');
  
  if (isVideoCallPage) {
    return (
      <header 
        className="fixed top-0 left-0 z-50 md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm border-0 shadow-lg"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
        </div>
      </header>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NORMAL PAGES: Standart header
  // ═══════════════════════════════════════════════════════════════════════════════
  const isRootTab = ROOT_TAB_PATHS.some(path => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path;
  });

  const shouldShowBack = showBackButton ?? !isRootTab;

  const getDefaultTitle = (): string | undefined => {
    const path = location.pathname;
    if (isRootTab) return undefined;
    if (path.startsWith("/experts")) return "Uzman Profili";
    if (path.startsWith("/listing/")) return "İlan Detayı";
    if (path.startsWith("/category/")) return "Kategori";
    if (path.startsWith("/subcategory/")) return "Alt Kategori";
    if (path.startsWith("/settings")) return "Ayarlar";
    if (path.startsWith("/teacher/my-listings")) return "İlanlarım";
    if (path.startsWith("/teacher/earnings")) return "Gelirlerim";
    if (path.startsWith("/auth")) return "Giriş";
    return undefined;
  };

  const displayTitle = title ?? getDefaultTitle();

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 w-full md:hidden",
        "backdrop-blur-xl bg-background/95 border-b border-silver/10",
        "h-14",
        className
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3 min-w-[80px]">
          {shouldShowBack ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="h-10 w-10 rounded-full hover:bg-secondary/50"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
          ) : (
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logo} alt="Leyl" className="h-8 w-8 transition-transform duration-200 group-hover:scale-105" />
              <span className="font-serif font-bold text-lg text-gradient-silver uppercase">LEYL</span>
            </Link>
          )}
        </div>

        {displayTitle && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-foreground truncate max-w-[50%]">
            {displayTitle}
          </h1>
        )}

        <div className="min-w-[80px]" />
      </div>
    </header>
  );
};

export const MobileHeader = memo(MobileHeaderComponent);
```

## Sonuç

| Durum | Görünüm |
|-------|---------|
| Video Call Sayfası | Sadece şeffaf geri butonu (sol üst, bg-black/40) |
| Normal Sayfalar | Standart header (backdrop-blur, border) |

## Test Kriterleri

1. Video call sayfasına git → Sadece şeffaf geri butonu görünmeli
2. Geri butonuna tıkla → Önceki sayfaya dön
3. Diğer sayfalarda → Normal header görünmeli
4. Header arka planı video üzerinde şeffaf olmalı

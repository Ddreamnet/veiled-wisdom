
## TeacherInfoCard: "Devamını Oku" Özelliği Ekleme

**Amaç:** TeacherInfoCard bileşeninde `teacher.bio` alanına ListingDescriptionCard ile aynı expand/collapse mantığını uygulamak.

**Yapılacak:**

1. **TeacherInfoCard.tsx güncellemesi:**
   - `useState(false)` ekle → `expanded` state
   - `teacher.bio` varsa ve 300 karakterden uzunsa `isLong = true` belirle
   - CardHeader gradient'ini güncelle: `bg-muted/20` → `bg-gradient-to-r from-primary/3 to-primary/6`
   - bio alanını ListingDescriptionCard ile aynı şekilde render et:
     - `line-clamp-4` conditional (expanded false iken)
     - `whitespace-pre-line` ekle
   - `isLong` true ise toggle button ekle:
     - "Devamını oku" / "Daha az göster" metni
     - ChevronDown / ChevronUp ikonları
     - Styling: `mt-2 h-7 px-2 text-xs text-primary hover:text-primary/80`, `variant="ghost"`

2. **İmport eklemeleri:**
   - `useState` (React)
   - `ChevronDown, ChevronUp` (lucide-react)

3. **Sonuç:**
   - Uzman açıklaması (bio) aynı tasarım ve davranışla expand/collapse olacak
   - 300 karakter altı açıklamalar hiç button göstermeyecek
   - Açılı/kapalı durumlar tutarlı olacak

**Dosya değişecek:**
- `src/pages/ListingDetail/components/TeacherInfoCard.tsx`


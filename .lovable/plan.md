

# Listing Detail Sayfa Yeniden Tasarımı

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `ListingDetailPage.tsx` | Layout yeniden yapılandırma, takvim bug fix, card header inceltme, booking kartını sidebar'a taşıma, CTA azaltma |
| `ListingDescriptionCard.tsx` | Devamını oku/kapat toggle, kompakt header |
| `TeacherInfoCard.tsx` | Butonları kaldır, tıklanabilir avatar/isim, kompakt yapı |
| `ReviewsSection.tsx` | Kompakt header, boş durum sadeleştirme |

## 1. Desktop Layout Değişikliği

Mevcut: Sol kolon = içerik + booking, Sağ sticky sidebar = açıklama + uzman kartı

Yeni:
```text
Sol Kolon (lg:col-span-2)          Sağ Kolon (lg:col-span-1, sticky)
├── Breadcrumb                     ├── Booking / Product kartı
├── Başlık + Görsel                
├── Açıklama kartı                 
├── Uzman kartı                    
├── Yorumlar                       
```

Booking kartı desktop'ta sağ sticky sidebar'a taşınacak. Mobilde mevcut sıralama korunacak (başlık → görsel → açıklama → uzman → booking → yorumlar).

## 2. Card Header İnceltme (Tüm Kartlar)

Tüm listing detail kartlarında:
- `CardHeader` padding: `p-6` → `px-4 py-3` (veya `px-5 py-3`)
- Başlık font: `text-xl md:text-2xl` → `text-base md:text-lg`
- Icon boyutu: `h-5 w-5 md:h-6 md:w-6` → `h-4 w-4`
- Gradient header: daha ince, `from-primary/3 to-primary/5` gibi daha hafif
- Kartlarda `border-2` → `border`, `shadow-md/shadow-lg` → hafif shadow override

## 3. Açıklama Kartı — Devamını Oku

- `line-clamp-4` ile ilk 4 satır gösterilecek
- "Devamını oku" / "Daha az göster" toggle butonu
- `useState` ile `expanded` kontrolü

## 4. Uzman Kartı — Güven Kartı

- "Mesaj Gönder" ve "Profili Görüntüle" butonları kaldırılacak
- Avatar + isim alanı `Link to={/profile/${teacherId}}` ile sarılacak, hover efekti eklenecek
- Daha kompakt: gereksiz `border-b` ve padding azaltılacak

## 5. Booking Kartı İyileştirme

- Uyarı kutusu: amber tonları yerine tema uyumlu `bg-primary/5 border-primary/20` tarzı rafine info box
- İç spacing: `space-y-5 md:space-y-6` → `space-y-4`
- Mesaj Gönder butonu: `variant="ghost"` veya `variant="outline"` ile daha küçük, ikincil CTA
- Paket seçenekleri: `p-4` → `p-3`, daha kompakt
- Toplam tutar: korunacak ama padding azaltılacak
- CTA buton: korunacak

## 6. Takvim Bug Fix

```tsx
const [calendarOpen, setCalendarOpen] = useState(false);

<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
  ...
  <Calendar
    className="p-3 pointer-events-auto"
    onSelect={(date) => {
      setSelectedDate(date);
      setCalendarOpen(false);
    }}
  />
</Popover>
```

## 7. Yorumlar Bölümü

- Boş durum: `py-6 md:py-8` → `py-3`
- Header kompaktlaştırma (diğer kartlarla aynı pattern)

## 8. Genel Hafifletme

Listing detail sayfasındaki kartlara özel override:
- `rounded-xl` (2xl yerine)
- Daha hafif shadow (shadow-elegant yerine `shadow-sm` veya özel)
- Kartlar arası boşluk: `space-y-6 md:space-y-8` → `space-y-4 md:space-y-6`
- Görsel yüksekliği mobilde: `h-64` → `h-48 sm:h-64`

## 9. Mobil Optimizasyon

- Görsel yüksekliği azaltma
- `pb-24` veya safe-area padding ekleme (bottom nav overlap önleme)
- Kartlar arası boşluk azaltma
- Product kartındaki ikinci "Mesaj Gönder" butonunu kaldırma


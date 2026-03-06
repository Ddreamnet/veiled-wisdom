

# Sorun: Eski Odalar Aktif Görünüyor + Çift Banner

## Kök Neden

`useActiveCall` hook'undaki **legacy fallback** (`video_room_*` alanları) sorunun kaynağı. Eski aramalar bittiğinde `active_call_ended_at` hiç set edilmemiş (çünkü o zamanki edge function bu alanı kullanmıyordu). Legacy fallback sadece `!row?.active_call_ended_at` kontrol ediyor ama bu alan eski aramalarda zaten hiç yazılmadığı için hep `null` -- yani "aktif" gibi görünüyor.

Sonuç: Aylar önce yapılmış, çoktan bitmiş bir görüşme bile "aktif arama var" olarak algılanıyor.

## Çözüm

### 1. Legacy fallback'i kaldır (`src/hooks/useActiveCall.ts`)
- `video_room_*` alanlarına dayanan fallback bloğunu tamamen sil
- Sadece `active_call_*` alanlarını kullan
- Edge function artık deploy edildiğine göre (REV8+) legacy desteğe gerek yok
- Ek güvenlik: `active_call_started_at` son 4 saatten eskiyse de null dön (stale call koruması)

### 2. Üstteki banner'ı kaldır (`src/components/chat/ChatWindow.tsx`)
- `{/* Active Call Banner */}` bloğunu (satır 96-134) tamamen sil
- Kullanıcının istediği gibi sadece sağ üstteki "Konuşmaya Katıl" butonu kalsın

### Değişecek Dosyalar
| Dosya | Değişiklik |
|---|---|
| `src/hooks/useActiveCall.ts` | Legacy fallback kaldır, stale call guard ekle |
| `src/components/chat/ChatWindow.tsx` | Banner bloğunu sil |


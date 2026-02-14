
# Mesajlasmada Anlik Mesaj Goruntulenme Sorunu - Duzeltme Plani

## Sorunun Temel Nedeni

Konsol loglari sorunu acikca gosteriyor:

```
Setting up realtime subscription for conversation: 44cbe63a-...
Setting up realtime subscription for conversation: 44cbe63a-...
Realtime subscription status: CLOSED
Realtime subscription status: CHANNEL_ERROR
```

**Iki sorun var:**

1. **CHANNEL_ERROR**: Supabase Realtime aboneligi basarisiz oluyor. Bu genellikle `messages` tablosunda Realtime'in etkin olmamasindan veya RLS politikalarinin Realtime erisimini engellemesinden kaynaklanir.
2. **Cift abone olma**: React Strict Mode (veya useEffect bagimliliklari) nedeniyle subscription iki kez kuruluyor ve ilk temizleme ikincisini etkiliyor.
3. **Fallback yok**: Realtime basarisiz oldugunda mesajlari almak icin hicbir yedek mekanizma (polling) bulunmuyor.

## Cozum

### 1. Realtime Subscription Duzeltmesi + Fallback Polling
**Dosya:** `src/hooks/useMessages.ts`

- Subscription kurulumunu saglam hale getir (cift abone olmayi onle)
- Realtime basarisiz oldugunda otomatik polling baslat (2s-30s arasi exponential backoff)
- Her iki mekanizmada da duplicate mesaj kontrolu yap
- Baglanti durumunu takip et

Degisiklikler:
- `setupRealtimeSubscription` fonksiyonunda kanal adina benzersiz timestamp ekle (cakismayi onle)
- `CHANNEL_ERROR` veya `CLOSED` durumunda otomatik polling baslat
- Polling: son mesajin `created_at` degerinden sonraki mesajlari cek
- Basarili Realtime geldiginde polling'i durdur
- Cleanup'ta hem channel hem polling timer'i temizle

### 2. Supabase Realtime Yapilandirma Kontrolu

Kullaniciya Supabase Dashboard'da su adimin yapildigini dogrulatmak gerekebilir:
- `messages` tablosunda Realtime'in aktif edilmis olmasi (Database > Replication > `messages` tablosu tikli olmali)

Bu adim kod disinda oldugundan, kullaniciya bilgi verilecek.

## Teknik Detaylar

| Degisiklik | Aciklama |
|-----------|----------|
| Benzersiz kanal adi | `messages:${conversationId}:${Date.now()}` ile cakismayi onle |
| Polling fallback | Realtime basarisiz olunca 2s aralikla yeni mesajlari kontrol et |
| Exponential backoff | Degisiklik yoksa polling araligini 1.5x artir (maks 30s) |
| Duplicate kontrolu | Hem Realtime hem polling'den gelen mesajlarda ID bazli kontrol |
| Temizlik | Unmount'ta channel + polling timer temizlenir |

Sadece `src/hooks/useMessages.ts` dosyasi degisecek.

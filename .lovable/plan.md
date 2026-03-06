

# "Konusmaya Katil" Butonunun Gorunmeme Sorunu -- Analiz ve Duzeltme Plani

## Tespit Edilen Sorun

Kod mantigi dogru gorunuyor ama iki potansiyel problem var:

### 1. `active_call_ended_at === null` strict equality problemi
`useActiveCall.ts` satirlari 57 ve 116'da `row?.active_call_ended_at === null` kullaniliyor. Supabase Realtime payload'larinda, deger set edilmemis bir kolon `null` yerine `undefined` donebilir. `undefined === null` ise `false` verir -- yani aktif arama varken bile `setActiveCall(null)` calisir.

### 2. Debug eksikligi
Hook'ta hicbir state degisikligi loglanmiyor, bu yuzden arama basladiginda diger tarafin gercekten realtime event alip almadigini dogrulamak mumkun degil.

## Duzeltme Plani

### Dosya: `src/hooks/useActiveCall.ts`
- `=== null` kontrollerini `!row?.active_call_ended_at` ile degistir (hem `null` hem `undefined` kapsar)
- Realtime callback'e ve fetch sonucuna debug log ekle

### Dosya: `src/components/chat/ChatWindow.tsx`
- UI mantigi zaten dogru, degisiklik yok
- Sadece `activeCall` state'inin degerini gormek icin kucuk bir devLog ekle

## Dokunulacak dosyalar
- `src/hooks/useActiveCall.ts` (null check fix + debug logs)
- `src/components/chat/ChatWindow.tsx` (debug log)


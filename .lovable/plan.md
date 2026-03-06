

# Kök Neden: Edge Function Deploy Edilmemiş

## Tespit

Konsoldan gelen log:
```
[VideoCall] function_version: create-daily-room@2026-01-29-REV3
```

Koddaki versiyon:
```
create-daily-room@2026-02-13-REV7-PARALLEL-AUTH
```

**Sunucuda çalışan edge function eski versiyon (REV3).** Yani DB update'i `await` eden düzeltme hiçbir zaman production'a ulaşmadı. Eski fonksiyon fire-and-forget yapıyor, Realtime event güvenilir şekilde tetiklenmiyor, dolayısıyla karşı tarafın chat'inde `activeCall` hiç dolmuyor.

## Neden Bu Sorun Tekrar Etti

Supabase Edge Function'lar **backend değişiklikleri** olarak otomatik deploy edilmeli. Ancak bu durumda deploy gerçekleşmemiş. Muhtemel sebepler:
- Deploy sırasında sessiz hata oluşmuş olabilir
- Fonksiyon dosyasındaki değişiklik deploy pipeline'ına yansımamış olabilir

## Çözüm Planı

1. **Edge function'ı yeniden deploy et** -- Fonksiyon dosyasına küçük bir değişiklik yaparak (versiyon string'ini bump ederek) deploy'u tetikle. Versiyon: `REV8-FORCE-DEPLOY`

2. **Deploy doğrulaması ekle** -- ChatWindow'a veya useActiveCall'a, edge function warm-up response'undan dönen `function_version`'ı logla. Böylece deploy'un gerçekleşip gerçekleşmediği konsoldan görülebilir.

## Değişecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| `supabase/functions/create-daily-room/index.ts` | Version bump → `REV8-FORCE-DEPLOY` (deploy tetikleme) |
| `src/hooks/useActiveCall.ts` | Warm-up response'tan `function_version` logla |

## Beklenen Sonuç

Deploy sonrası:
- Edge function DB update'i await edecek
- Realtime event güvenilir şekilde tetiklenecek
- Karşı tarafın chat'inde `activeCall` state dolacak
- "Konuşmaya Katıl" butonu otomatik görünecek


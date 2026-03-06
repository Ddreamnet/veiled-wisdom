

## Kök Neden Bulundu

**Problem:** `.or()` filter içindeki ISO timestamp string'i PostgREST parser'ı bozuyor.

Satır 24:
```typescript
.or(`status.eq.pending,end_ts.gte.${now}`)
```

`now` değeri `2026-03-06T12:23:33.330Z` gibi bir ISO string. PostgREST `.or()` filtresi `.` karakterini ayırıcı (delimiter) olarak kullanır. Bu yüzden `end_ts.gte.2026-03-06T12:23:33.330Z` parse edilirken `.330Z` kısmındaki nokta yeni bir operatör/alan olarak yorumlanıyor ve **query sessizce başarısız oluyor veya boş sonuç dönüyor**.

Bu, `.eq('status', 'pending')` gibi ayrı filter çağrılarında sorun olmaz çünkü Supabase client değeri encode eder. Ama `.or()` içinde raw string olarak gider.

## Çözüm

ISO timestamp'i `.or()` içinde çift tırnak ile sarmalayarak PostgREST'in doğru parse etmesini sağlamak:

```typescript
.or(`status.eq.pending,end_ts.gte."${now}"`)
```

### Değişecek dosya
- `src/lib/queries/appointmentQueries.ts` — satır 24: `now` değerine tırnak eklenmesi

Bu tek karakter değişikliği ile pending randevular danışan ekranında görünür hale gelecek.


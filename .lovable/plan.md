

# Randevu Görünürlük Akışı Güncellemesi

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `appointmentQueries.ts` | Teacher pending query'den `neq('status', 'pending')` kaldır; customer pending query'ye `cancelled` dahil et; completed query'de customer/teacher ayrımı |
| `Appointments.tsx` | Status label'larını role bazlı güncelle; cancelled olanları customer'da "Reddedildi" olarak göster |

## Query Değişiklikleri

**Pending (Bekleyen) sekmesi — `end_ts >= now`:**
- **Customer:** `pending`, `confirmed`, `cancelled` hepsi görünsün
- **Teacher:** `pending`, `confirmed` görünsün; `cancelled` görünmesin

Mevcut kodda satır 24'teki `.neq('status', 'cancelled')` customer için kaldırılmalı, teacher için korunmalı. Satır 28-30'daki `.neq('status', 'pending')` tamamen kaldırılmalı.

**Completed (Tamamlanan) sekmesi — `end_ts < now`:**
- Her iki tarafta da `cancelled` görünmesin (mevcut davranış korunur).

## Status Label Değişiklikleri

`Appointments.tsx` satır 51-53'teki mapping role-aware olacak:

| Status | Customer Label | Teacher Label |
|--------|---------------|---------------|
| `pending` | "Ödeme Kontrol Ediliyor" | "Ödeme Kontrol Ediliyor" |
| `confirmed` | "Onaylandı" | "Onaylandı" |
| `cancelled` | "Reddedildi" | *(görünmez)* |
| `completed` | "Tamamlandı" | "Tamamlandı" |

Badge variant: `cancelled` → `destructive` (mevcut, korunuyor).

## Uygulama Detayı

1. `appointmentQueries.ts`: Pending query'yi role bazlı filtrele — teacher için sadece `cancelled` hariç, customer için filtre yok (hepsi gelsin)
2. `Appointments.tsx`: Label mapping'i role-aware yap, `cancelled` olan customer kartlarında "Reddedildi" göster


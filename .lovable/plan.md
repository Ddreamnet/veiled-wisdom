

# Sorun ve Çözüm

**Sorun:** `CREATE POLICY` ve `CREATE TRIGGER` ifadeleri `IF NOT EXISTS` desteklemez. İlk çalıştırmada oluşturulduklarından, tekrar çalıştırınca "already exists" hatası verir.

**Çözüm:** SQL dosyasını idempotent hale getirmek için policy ve trigger ifadelerini `DROP ... IF EXISTS` ile öncelikle silip yeniden oluşturacağız.

## Değişiklikler (`phase4_push_notifications.sql`)

### Policy (satır 45-50)
```sql
DROP POLICY IF EXISTS "Users manage own devices" ON public.push_devices;
CREATE POLICY "Users manage own devices" ...
```

### Trigger'lar (satır 105-108, 149-152, 193-196)
Her biri için:
```sql
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message ...
```
Aynı pattern `trg_notify_new_payment_request` ve `trg_notify_new_teacher_approval` için de uygulanacak.

---

Bu değişiklikten sonra dosyanın tamamını SQL Editor'da istediğin kadar tekrar çalıştırabilirsin, hata almadan.

**Şu an için:** Zaten tablolar, fonksiyonlar ve trigger'lar oluşmuş durumda. Sadece fonksiyonları güncellemek yeterliydi, o da yapıldı. Yani **şu an bir şey daha çalıştırmana gerek yok** — her şey zaten aktif. Bu düzenleme sadece gelecekte tekrar çalıştırma kolaylığı için.


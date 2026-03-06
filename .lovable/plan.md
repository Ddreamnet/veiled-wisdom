

# Referans Kodu Ön-Gösterim Düzeltmesi

## Problem
Kullanıcı havale yaparken açıklamaya referans kodunu yazması gerekiyor, ama kod ancak "Ödemeyi Yaptım" tıklandıktan sonra RPC tarafından üretiliyor. Tavuk-yumurta problemi.

## Çözüm
Referans kodunu **sayfa yüklendiğinde** ön-üretip ekranda göstermek, sonra bu kodu RPC'ye parametre olarak geçmek.

### 1. Client-side referans kodu üretimi (BankTransferScreen.tsx)
- Component mount'ta `EL-XXXXXX` formatında benzersiz kod üret (`crypto.randomUUID()` veya `Math.random` ile 6 hane hex)
- `CopyableField label="Referans Kodu" value={referenceCode}` olarak IBAN, Alıcı, Tutar'ın altına ekle
- Uyarı metnini güncelle: "Havale açıklamasına yukarıdaki referans kodunu yazmayı unutmayın"

### 2. RPC'yi güncelle (SQL migration)
- `create_payment_request_and_appointment` fonksiyonuna `_reference_code TEXT DEFAULT NULL` parametresi ekle
- Eğer `_reference_code` verilmişse onu kullan, verilmemişse mevcut server-side üretimi devam etsin
- UNIQUE constraint mevcut — çakışma durumunda hata döner (son derece düşük olasılık)

### 3. RPC çağrısını güncelle (BankTransferScreen.tsx)
- `supabase.rpc(...)` çağrısına `_reference_code: referenceCode` parametresi ekle

### Dosya Değişiklikleri
| Dosya | Değişiklik |
|-------|-----------|
| `src/pages/Payment/BankTransferScreen.tsx` | Referans kodu üretimi + CopyableField + RPC'ye parametre geçişi |
| `supabase/migrations_manual/phase3_reference_code.md` | RPC'ye `_reference_code` parametresi ekleme SQL'i |

### Referans Kodu Üretimi
```text
const generateRefCode = () => {
  const hex = crypto.randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase();
  return `EL-${hex}`;
};
```

Bu yaklaşımla:
- Kullanıcı sayfaya geldiğinde referans kodunu hemen görür ve kopyalayabilir
- Havale açıklamasına yazar
- "Ödemeyi Yaptım" dediğinde aynı kod DB'ye kaydedilir
- Admin bu kodla eşleştirme yapabilir


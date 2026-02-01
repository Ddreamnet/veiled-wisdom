
# "Onaylamalar"ı Dashboard Hızlı Erişim Kartına Taşıma Planı

## Özet
"Onaylamalar" bölümü navbar ve mobile navigation'dan tamamen kaldırılacak. Erişim sadece Dashboard sayfasındaki "Hızlı Erişim" bölümüne eklenecek yeni bir kart aracılığıyla sağlanacak.

---

## Değişiklik Listesi

### 1. Desktop Navbar'dan Kaldırma
**Dosya:** `src/components/header/navConfig.ts`

Admin navigation menüsünden "Onaylamalar" linki kaldırılacak:
```text
// ÖNCE (3 item)
[Dashboard, Onaylamalar, Gelirler]

// SONRA (2 item)  
[Dashboard, Gelirler]
```

### 2. Mobile Bottom Navigation'dan Kaldırma
**Dosya:** `src/components/mobile/MobileBottomNav.tsx`

Admin için tanımlı navigation items'dan "Onaylar" tab'ı kaldırılacak:
```text
// ÖNCE (4 item)
[Dashboard, Onaylar, Gelirler, Profil]

// SONRA (3 item)
[Dashboard, Gelirler, Profil]
```

### 3. Mobile Header ROOT_TAB_PATHS Güncelleme
**Dosya:** `src/components/mobile/MobileHeader.tsx`

`/admin/approvals` artık bir root tab olmadığı için listeden çıkarılacak. Bu sayede Approvals sayfasına gidildiğinde geri butonu görünecek.

### 4. Dashboard'a Hızlı Erişim Kartı Ekleme
**Dosya:** `src/pages/admin/Dashboard.tsx`

`adminCards` array'ine "Onaylamalar" kartı eklenecek:
```text
{
  title: "Onaylamalar",
  description: "Uzman başvurularını incele ve onayla",
  icon: UserCheck,
  href: "/admin/approvals",
}
```

Not: `UserCheck` ikonu zaten import edilmiş durumda (statCards'ta kullanılıyor).

---

## Teknik Detaylar

### Dosya Değişiklikleri

| Dosya | Değişiklik | Satır Etkisi |
|-------|-----------|--------------|
| `src/components/header/navConfig.ts` | 1 satır silme | -1 |
| `src/components/mobile/MobileBottomNav.tsx` | 1 nav item silme | -1 |
| `src/components/mobile/MobileHeader.tsx` | 1 path silme | -1 |
| `src/pages/admin/Dashboard.tsx` | 1 kart ekleme | +5 |

### Korunacak Dosyalar (Değişiklik Yok)

| Dosya | Sebep |
|-------|-------|
| `src/routes/routeConfig.ts` | Route tanımı gerekli - sayfa hala erişilebilir |
| `src/components/UnifiedBreadcrumb.tsx` | Breadcrumb label'ı korunmalı |
| `src/pages/admin/Approvals/*` | Sayfa dosyaları aynen kalacak |

---

## Sonuç

Bu değişikliklerden sonra:
- Admin paneli navigasyonu 3'ten 2 linke sadeleşecek (Dashboard, Gelirler)
- Mobile bottom nav 4'ten 3 tab'a düşecek
- "Onaylamalar"a erişim tek bir yerden: Dashboard > Hızlı Erişim > Onaylamalar kartı
- Mevcut istatistik kartı ("Bekleyen Onay") bilgi amaçlı kalacak, yönlendirme yapmayacak
- Tüm eski navigation referansları temizlenmiş olacak

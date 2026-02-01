

# Admin Mobil Navbar Düzeltmeleri

## Sorun Analizi

### Sorun 1: Ana sayfada Dashboard seçili görünüyor
- Admin için navItems'ta Dashboard `matchPrefixes: ["/admin"]` ile tanımlı
- `/` yolundayken hiçbir prefix eşleşmiyor, `activeHref` undefined olmalı
- Ama pill hala gösteriliyor çünkü `pillPosition` bir kere hesaplandıktan sonra sıfırlanmıyor

### Sorun 2: Mesajlar butonu eksik
- Admin navItems'ta Mesajlar yok, Profil altında gizli
- Kullanıcı Gelirler ve Profil arasına "Mesajlar" butonu istiyor

---

## Değişiklikler

**Dosya:** `src/components/mobile/MobileBottomNav.tsx`

### 1. Dashboard matchPrefixes Düzeltmesi

Dashboard sadece `/admin` yollarında aktif olmalı, `/` yolunda değil:

```typescript
// ÖNCE
{ icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard", matchPrefixes: ["/admin"] }

// SONRA - "/" yolunda eşleşmeyecek
{ icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard", matchPrefixes: ["/admin/dashboard", "/admin/users", "/admin/teachers", "/admin/categories", "/admin/curiosities", "/admin/pages"] }
```

### 2. Pill Görünürlük Kontrolü

`activeHref` undefined olduğunda pill tamamen gizlenecek:

```typescript
// activeHref hesaplamasında, eşleşme yoksa undefined döndür
const activeHref = useMemo(() => {
  // ... mevcut kod ...
  if (bestLen === 0) return undefined; // Hiç eşleşme yoksa undefined
  return bestHref;
}, [location.pathname, navItems]);
```

### 3. Mesajlar Butonu Ekleme

Admin navItems'a Mesajlar eklenir (Gelirler ve Profil arasına):

```typescript
if (role === "admin") {
  return [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard", matchPrefixes: [...] },
    { icon: TurkishLiraIcon, label: "Gelirler", href: "/admin/earnings", matchPrefixes: ["/admin/earnings"] },
    { icon: MessageSquare, label: "Mesajlar", href: "/messages", badge: unreadCount, matchPrefixes: messagesMatchPrefixes },
    {
      icon: User,
      label: "Profil",
      href: "/profile",
      matchPrefixes: profileMatchPrefixes, // messagesMatchPrefixes kaldırıldı
    },
  ];
}
```

---

## Sonuç

Bu değişikliklerden sonra:
- Admin "/" yolundayken navbarda hiçbir tab seçili olmayacak
- Navbarda sıra: Dashboard - Gelirler - Mesajlar - Profil
- Mesajlar butonu okunmamış mesaj sayısını (badge) gösterecek
- Profil altından mesajlar çıkarılacak, ayrı buton olarak erişilebilir olacak


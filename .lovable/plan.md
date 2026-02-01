
# Global Scrollbar Styling Planı

## Özet
Sitenin tüm native scrollbar'larını tek bir yerden (CSS değişkenleri + global stiller) yönetecek şekilde yapılandırma. Bu, hem `body` scrollbar'ı hem de tüm overflow elementleri için geçerli olacak.

---

## Renk Eşleştirmesi

Verilen renkler ile mevcut sistem renkleri karşılaştırması:

| Verilen | Hex | En Yakın Sistem Rengi | HSL |
|---------|-----|----------------------|-----|
| Track | `#140821` | `--background` | `270 60% 8%` ≈ `#13021E` |
| Thumb | `#3c1d57` | `--primary-dark` | `270 70% 45%` ≈ `#7B2CBF` |

Thumb için `--primary-dark` biraz açık kalıyor. Daha uyumlu bir renk için yeni bir CSS değişkeni tanımlanabilir veya mevcut `--primary-subtle` (`#3C1053`) kullanılabilir - bu renk `#3c1d57`'ye çok yakın.

---

## Uygulama Planı

### Adım 1: CSS Değişkenleri Ekleme
`src/index.css` dosyasındaki `:root` bloğuna scrollbar için özel değişkenler eklenecek:

```text
--scrollbar-track: 270 60% 8%;      /* background ile aynı */
--scrollbar-thumb: 270 45% 22%;     /* #3c1d57'ye yakın */
--scrollbar-thumb-hover: 270 60% 35%; /* hover için biraz açık */
--scrollbar-size: 6px;
```

### Adım 2: Global Scrollbar Stilleri
`src/index.css` dosyasına global scrollbar CSS kuralları eklenecek:

```text
/* === GLOBAL SCROLLBAR === */
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--scrollbar-thumb)) hsl(var(--scrollbar-track));
}

*::-webkit-scrollbar {
  width: var(--scrollbar-size);
  height: var(--scrollbar-size);
}

*::-webkit-scrollbar-track {
  background: hsl(var(--scrollbar-track));
  border-radius: 50px;
}

*::-webkit-scrollbar-thumb {
  background: hsl(var(--scrollbar-thumb));
  border-radius: 50px;
}

*::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--scrollbar-thumb-hover));
}
```

### Adım 3: ScrollArea Bileşeni Güncelleme
`src/components/ui/scroll-area.tsx` dosyasındaki thumb rengi, yeni CSS değişkenlerini kullanacak şekilde güncellenecek:

```text
// Mevcut: bg-primary/50
// Yeni: bg-[hsl(var(--scrollbar-thumb))] veya Tailwind utility
```

### Adım 4: MessageInput Temizliği
`src/components/chat/MessageInput.tsx` dosyasındaki inline scrollbar stilleri kaldırılacak çünkü artık global stil devralınacak. Sadece özel davranışlar (auto-hide, thin) korunacak.

---

## Teknik Detaylar

### Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `src/index.css` | +15 satır (değişkenler + global kurallar) |
| `src/components/ui/scroll-area.tsx` | Thumb rengi güncelleme (~1 satır) |
| `src/components/chat/MessageInput.tsx` | Gereksiz scrollbar renk stilleri kaldırma |

### Desteklenen Tarayıcılar
- Chrome, Edge, Safari: `-webkit-scrollbar` pseudo-elements
- Firefox: `scrollbar-color` ve `scrollbar-width` properties

### Avantajlar
1. Tek kaynak: Tüm scrollbar stilleri CSS değişkenlerinden yönetilir
2. Kod tekrarı yok: Her bileşende ayrı scrollbar stili tanımlamaya gerek kalmaz
3. Kolay güncelleme: Renk değişikliği sadece `:root` bloğunda yapılır
4. Tutarlı görünüm: Tüm site genelinde aynı scrollbar tasarımı

---

## Sonuç

Bu plan uygulandığında:
- Site genelinde tutarlı 6px genişliğinde rounded scrollbar
- Mevcut dark purple tema ile uyumlu renk paleti
- Hem Webkit hem Firefox desteği
- Merkezi yönetim ile kolay bakım

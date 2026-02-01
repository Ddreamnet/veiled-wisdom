

# Görüntülü Arama - Kamera Ayna Görüntüsü Düzeltmesi

## Mevcut Durum

`VideoTile.tsx` dosyasında (satır 54-66):

```typescript
<DailyVideo
  sessionId={sessionId}
  type="video"
  automirror={isLocal}  // ← Yerel video için otomatik aynalama açık
  fit="cover"
  style={{
    width: '100%',
    height: '100%',
    opacity: isVideoOff ? 0 : 1,
    transition: 'opacity 200ms ease-in-out',
  }}
  muted={isLocal}
/>
```

## Çözüm

`automirror` özelliğini kaldırarak veya `false` yaparak ayna görüntüsünü devre dışı bırakacağız.

**Dosya:** `src/pages/VideoCall/components/VideoTile.tsx`

### Değişiklik

```typescript
// ÖNCE
automirror={isLocal}

// SONRA
automirror={false}
```

Bu değişiklik ile:
- Yerel kullanıcı kendisini gerçek yönde görecek (ayna değil)
- Uzak kullanıcılar da karşı tarafı doğru yönde görecek

## Not

Eğer kullanıcı tam tersini istiyorsa (aynayı açmak), o zaman `automirror={true}` yapılabilir. Ancak mevcut durumda `automirror={isLocal}` zaten yerel video için aynalama yapıyor, kullanıcı bunun kapatılmasını istiyor gibi görünüyor.


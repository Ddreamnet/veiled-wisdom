

# Güncellenmiş Plan: Image Picker / Photo Access İzinleri

Mevcut video call izin planına ek bölüm. Aşağıdaki değişiklikler önceki plana entegre edilecek.

---

## iOS Değişiklikleri

### Info.plist Key'leri

| Key | Amaç | Durum |
|---|---|---|
| `NSCameraUsageDescription` | Kamera ile yeni fotoğraf çekme seçeneği için gerekli (video call + picker kamera seçeneği) | Eklenecek (video call planında zaten var) |
| `NSPhotoLibraryUsageDescription` | Galeriden mevcut görsel seçme akışı için eklenir | Eklenecek |
| `NSPhotoLibraryAddUsageDescription` | Sadece galeriye geri kayıt varsa gerekli; uygulama galeri yazma yapmıyor | **Eklenmeyecek** |

### iOS Davranış Notu (Yumuşatılmış)

- Mevcut HTML `<input type="file" accept="image/*">` akışı korunacak
- iOS'ta `NSPhotoLibraryUsageDescription` eklenmesi, özellikle native kapsayıcı (Capacitor WKWebView) içinde fotoğraf seçme akışında uyumluluk ve net izin açıklaması açısından güvenli bir adımdır
- Ancak WKWebView fotoğraf ve dosya yüklemeyi, uygulamanın tüm fotoğraf kitaplığına tam erişimi olmadan da destekleyebilir; bu yüzden bu key'in eksikliği her durumda aynı şekilde davranmak zorunda değildir
- Gerçek davranış cihaz üzerinde test edilerek doğrulanmalı

---

## Android Değişiklikleri

**Ek manifest izni eklenmeyecek.**

- Sistem picker / `ACTION_GET_CONTENT` / Photo Picker akışı kullanıldığı sürece `READ_MEDIA_IMAGES` veya geniş storage izni eklenmeyecek
- Sadece ileride custom gallery tarama veya doğrudan medya kütüphanesi erişimi yapılırsa yeniden değerlendirilecek
- Video call planındaki `CAMERA` izni, picker'daki kamera seçeneği için de yeterli

---

## Platform Picker Davranışı Notu

Kamera seçeneğinin görünmesi tamamen mevcut `<input>` davranışı ve platform picker sunumuna bağlıdır; bu seçenek her cihazda birebir aynı UI ile görünmeyebilir.

Hedeflenen davranış:
- Kullanıcı galeriden mevcut görsel seçebilsin
- Mümkünse yeni fotoğraf da çekebilsin (platform picker'ın sunduğu kamera seçeneği ile)

---

## Test Matrisi

### iOS

| Senaryo | Akış | Doğrulanacak |
|---|---|---|
| Profil fotoğrafı → galeriden seç | Avatar Yükle → picker → galeri | Görsel yükleniyor mu |
| Profil fotoğrafı → kameradan çek | Avatar Yükle → picker → kamera | Fotoğraf çekilip yükleniyor mu |
| İlan görseli → galeriden seç | Görsel Yükle → picker → galeri | Görsel yükleniyor mu |
| İlan görseli → kameradan çek | Görsel Yükle → picker → kamera | Fotoğraf çekilip yükleniyor mu |
| İlk kurulum | App yeni yüklenmiş, hiç izin verilmemiş | İzin diyaloğu Türkçe açıklama ile çıkıyor mu |
| İzin daha önce reddedilmiş | Kullanıcı izni reddetmiş durumda | Picker nasıl davranıyor, hata mesajı var mı |

### Android

| Senaryo | Akış | Doğrulanacak |
|---|---|---|
| Profil fotoğrafı → galeriden seç | Avatar Yükle → picker → galeri | Görsel yükleniyor mu |
| Profil fotoğrafı → kameradan çek | Avatar Yükle → picker → kamera | Fotoğraf çekilip yükleniyor mu |
| İlan görseli → galeriden seç | Görsel Yükle → picker → galeri | Görsel yükleniyor mu |
| İlan görseli → kameradan çek | Görsel Yükle → picker → kamera | Fotoğraf çekilip yükleniyor mu |
| Storage izni kontrolü | Tüm akışlar | Ek storage izni istenmeden akış çalışıyor mu |

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| `ios/App/App/Info.plist` | `NSPhotoLibraryUsageDescription` ekle |
| `.lovable/plan.md` | Bu bölümü ekle |

`NSCameraUsageDescription` ve Android `CAMERA` izni video call planında zaten kapsanıyor. Bu plan sadece `NSPhotoLibraryUsageDescription` ekler.


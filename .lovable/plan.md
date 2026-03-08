# Android & iOS Video Call + Image Picker Permission Fix

## Kök Neden Analizi

### Android
`AndroidManifest.xml` dosyasında `CAMERA` ve `RECORD_AUDIO` izinleri eksikti. WebView'da `getUserMedia` sessizce başarısız oluyordu.

### iOS
`Info.plist` dosyasında `NSCameraUsageDescription` ve `NSMicrophoneUsageDescription` eksikti. iOS, WKWebView'dan gelen medya isteklerini izin açıklaması olmadan engelliyor — bu da Daily.co'nun "WebRTC not supported or suppressed" hatasına neden oluyordu.

---

## Uygulanan Değişiklikler

### 1. Android Manifest İzinleri
`android/app/src/main/AndroidManifest.xml` dosyasına eklendi:
- `android.permission.CAMERA`
- `android.permission.RECORD_AUDIO`
- `android.permission.MODIFY_AUDIO_SETTINGS`

### 2. iOS Info.plist
`ios/App/App/Info.plist` dosyasına eklendi:

| Key | Amaç |
|---|---|
| `NSCameraUsageDescription` | Kamera ile yeni fotoğraf çekme + görüntülü arama |
| `NSMicrophoneUsageDescription` | Görüntülü arama sırasında ses iletimi |
| `NSPhotoLibraryUsageDescription` | Galeriden mevcut görsel seçme (profil fotoğrafı, ilan görseli) |

**Eklenmedi:** `NSPhotoLibraryAddUsageDescription` — uygulama galeriye görsel kaydetmiyor.

### 3. Media Permissions Utility (`src/lib/mediaPermissions.ts`)
- `diagnoseMedia()`: `isSecureContext`, `navigator.mediaDevices`, Permissions API kontrolü
- `requestMediaAccess()`: `getUserMedia` ile gerçek izin isteği + diagnostic sonuç
- `prefetchMedia()`: Sessiz ön yükleme (hover/focus)
- `isMediaBlocked()` + `getMediaErrorMessage()`: UI için durum kontrolü

### 4. VideoCallPage Permission Gate
- `initializeCall()` içinde `Daily.createCallObject()` öncesinde `requestMediaAccess()` çağrılıyor
- İzin reddedilmişse veya WebRTC desteklenmiyorsa Daily nesnesi oluşturulmuyor
- Özel hata UI'ı: "İzin Gerekli" başlığı + Settings ikonu

### 5. ChatWindow Prefetch
- `prefetchMediaPermissions` artık paylaşılan `prefetchMedia()` fonksiyonunu kullanıyor

---

## Image Picker / Photo Access Bölümü

### Mevcut Akış
Tüm görsel yükleme (`AvatarUpload`, `ImageUpload`, `CategoryImageUpload`) standart HTML `<input type="file" accept="image/*">` kullanıyor. Capacitor Camera eklentisi projede yok.

### Yaklaşım
Mevcut `<input type="file" accept="image/*">` akışı korunuyor — en dar ve güvenli izin modeli:
- iOS'ta sistem Photo Picker tetiklenir (limited photo access destekli)
- Android'de sistem Intent picker tetiklenir (ACTION_GET_CONTENT)

### iOS İzin Ayrımı
- `NSCameraUsageDescription`: Kamera ile yeni fotoğraf çekme seçeneği için
- `NSPhotoLibraryUsageDescription`: Galeriden mevcut görsel seçme akışı için
- `NSPhotoLibraryAddUsageDescription`: Sadece galeriye geri kayıt varsa gerekli; şu an **eklenmeyecek**

### iOS Davranış Notu
- iOS'ta `NSPhotoLibraryUsageDescription` eklenmesi, native kapsayıcı içinde fotoğraf seçme akışında uyumluluk ve net izin açıklaması açısından güvenli bir adımdır
- Ancak WKWebView fotoğraf ve dosya yüklemeyi, uygulamanın tüm fotoğraf kitaplığına tam erişimi olmadan da destekleyebilir; bu key'in eksikliği her durumda aynı şekilde davranmak zorunda değildir
- Gerçek davranış cihaz üzerinde test edilerek doğrulanmalı

### Android İzin Notu
- Sistem picker / `ACTION_GET_CONTENT` / Photo Picker akışı kullanıldığı sürece `READ_MEDIA_IMAGES` veya geniş storage izni eklenmeyecek
- Sadece ileride custom gallery tarama veya doğrudan medya kütüphanesi erişimi yapılırsa yeniden değerlendirilecek

### Platform Picker Davranışı
Kamera seçeneğinin görünmesi tamamen `<input>` davranışı ve platform picker sunumuna bağlıdır; her cihazda birebir aynı UI ile görünmeyebilir.

Hedef:
- Kullanıcı galeriden mevcut görsel seçebilsin
- Mümkünse yeni fotoğraf da çekebilsin

---

## Değişen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `android/app/src/main/AndroidManifest.xml` | CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS izinleri eklendi |
| `ios/App/App/Info.plist` | NSCameraUsageDescription, NSMicrophoneUsageDescription, NSPhotoLibraryUsageDescription eklendi |
| `src/lib/mediaPermissions.ts` | **Yeni** — izin kontrolü + getUserMedia diagnostic utility |
| `src/pages/VideoCall/VideoCallPage.tsx` | Permission gate + izin reddedildiğinde özel hata UI |
| `src/components/chat/ChatWindow.tsx` | Paylaşılan prefetchMedia kullanımı |
| `.lovable/plan.md` | Güncel plan |

---

## Manuel Adımlar (Gerekli)

```bash
npx cap sync android
npx cap sync ios
```
Ardından her iki platformda clean build yapılmalı.

---

## Test Matrisi

### iOS — Video Call
| Senaryo | Doğrulanacak |
|---|---|
| İlk kurulum → arama başlat | İzin diyaloğu Türkçe açıklama ile çıkıyor mu |
| İzin ver → arama | Kamera + mikrofon aktif |
| İzin reddet | "İzin Gerekli" hata ekranı |

### iOS — Image Picker
| Senaryo | Doğrulanacak |
|---|---|
| Profil fotoğrafı → galeriden seç | Görsel yükleniyor mu |
| Profil fotoğrafı → kameradan çek | Fotoğraf çekilip yükleniyor mu |
| İlan görseli → galeriden seç | Görsel yükleniyor mu |
| İlan görseli → kameradan çek | Fotoğraf çekilip yükleniyor mu |
| İlk kurulum | İzin diyaloğu Türkçe açıklama ile çıkıyor mu |
| İzin daha önce reddedilmiş | Picker nasıl davranıyor |

### Android — Video Call
| Senaryo | Doğrulanacak |
|---|---|
| İlk kurulum → arama başlat | Runtime permission diyaloğu çıkıyor mu |
| İzin ver → arama | Kamera + mikrofon aktif |
| İzin reddet | "İzin Gerekli" hata ekranı |

### Android — Image Picker
| Senaryo | Doğrulanacak |
|---|---|
| Profil fotoğrafı → galeriden seç | Görsel yükleniyor mu |
| Profil fotoğrafı → kameradan çek | Fotoğraf çekilip yükleniyor mu |
| İlan görseli → galeriden seç | Görsel yükleniyor mu |
| İlan görseli → kameradan çek | Fotoğraf çekilip yükleniyor mu |
| Storage izni kontrolü | Ek storage izni istenmeden akış çalışıyor mu |

### Generic File Picker Notu
İleride belge/dosya yükleme gerekirse `accept` attribute değiştirilerek sistem document picker tetiklenebilir. Geniş depolama izni hiçbir senaryoda eklenmemeli.

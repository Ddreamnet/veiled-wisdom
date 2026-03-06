
Durumu netleştirdim: sorun frontend buton kodunda değil, canlı backend sürümü + çağrı akışındaki gereksiz invoke’larda.

1) Kesin kök neden (kanıtlı)
- Ağ logunda `create-daily-room` response:
  - `function_version: create-daily-room@2026-01-29-REV3`
- Repo kodunda edge function:
  - `FUNCTION_VERSION = create-daily-room@2026-03-06-REV8-FORCE-DEPLOY`
- Yani canlıda hala REV3 çalışıyor, yeni düzeltmeler deploy olmamış.
- Aynı anda `conversations` GET sonucu:
  - `active_call_room_name/url/started_at/created_by = null`
- Bu yüzden `useActiveCall` null görüyor, `ChatWindow` “Konuşmaya Katıl” branch’ine hiç geçmiyor.

2) “8 kere çağrı” neden oluyor?
Bu sayı yanıltıcı:
- Supabase Function listesinde genelde her gerçek çağrı için:
  - 1x `OPTIONS` (CORS preflight)
  - 1x `POST` (asıl invoke)
- Ekrandaki 8 kayıt büyük olasılıkla 4 gerçek POST + 4 OPTIONS.
- Ek olarak mevcut mimaride çağrı sayısını artıran iki kaynak var:
  - `useActiveCall` içindeki warmup (`create-daily-room` warmup POST)
  - Kullanıcı CTA görmeyince tekrar normal video butonundan `start` denemesi

3) Neden hala “Katıl” görünmüyor?
- `ChatWindow` koşulu doğru: `activeCall && activeCall.created_by !== user?.id`
- Ama `activeCall` null kalıyor çünkü canlı edge function (REV3) aktif çağrı state’ini frontend’in beklediği alanlarda güvenilir şekilde güncellemiyor / yeni sözleşmeyi döndürmüyor.
- Sonuç: render condition hiç true olmuyor.

4) Uygulama planı (kalıcı çözüm)
A. Deploy doğrulamasını zorunlu hale getirme
- `create-daily-room` canlıda REV8+ olduğuna kod seviyesinde guard ekle:
  - Eğer response `function_version` beklenenden düşükse kullanıcıya “backend outdated” hatası ver.
  - Sessiz devam etmeye izin verme (aksi halde yine gizli arıza olur).

B. Gereksiz invoke’ları azaltma
- `useActiveCall` içindeki warmup invoke’u kaldır veya feature-flag ile kapat.
- Böylece function çağrı sayısı düşer, gözlem netleşir, CORS preflight gürültüsü azalır.

C. Aktif çağrı okunmasında geçiş dönemi uyumluluğu
- `useActiveCall` fetch’inde geçici olarak legacy alanları da okuyup normalize et (REV3/REV8 uyumu).
- Böylece deploy gecikse bile “Katıl” butonu kör kalmaz.
- Bu uyumluluğu “temporary fallback” olarak işaretleyip deploy sonrası sadeleştireceğim.

D. Realtime/polling güvence
- Mevcut `CHANNEL_ERROR/TIMED_OUT` fallback polling korunacak.
- Polling interval/backoff optimize edilip sadece gerekli durumda çalışacak (gereksiz GET azaltımı).

E. Gözlemlenebilirlik
- `VideoCallPage` ve `useActiveCall` loglarına tek satır “version + call state source(active/legacy)” izleme eklenecek.
- Sorun tekrarında 30 sn içinde hangi katmanda koptuğu net görülecek.

5) Sonrasında beklenen davranış
- Aktif arama yok: normal video ikon.
- Karşı taraf aramayı başlatınca (refreshsiz): otomatik yeşil “Konuşmaya Katıl”.
- Arama bitince: otomatik normal video ikona dönüş.
- Function çağrı sayısı: warmup kapatılırsa belirgin şekilde azalır; dashboard’daki OPTIONS kayıtları ayrıca gerçek invoke gibi sayılmayacak.

6) Neden önceki denemeler çözmedi?
- UI tarafı doğruya getirilmişti ama canlı backend hala REV3 kaldığı için tetikleyen data hiç gelmedi.
- Yani render düzeltildi, state kaynağı düzelmedi.

# Boğaz Drive — Google Play'e yükleme rehberi

Bu klasördeki her şey Play Console'a yüklemek için hazır:

| Dosya | Nereye yüklenecek |
|---|---|
| `gorseller/play-simge-512.png` | Uygulama simgesi (512×512) |
| `gorseller/ozellikli-gorsel-1024x500.png` | Öne çıkan görsel (1024×500) |
| `ekran-goruntuleri/*.jpg` (8 adet, 1920×1080) | Telefon, 7 inç tablet ve 10 inç tablet ekran görüntüleri |
| `video/bogaz-drive-tanitim.mp4` | Önce YouTube'a yüklenir, Play'e YouTube bağlantısı yazılır |
| `magaza-metinleri.md` | Başlık, kısa açıklama, tam açıklama |
| `gizlilik-politikasi.html` | İnternette yayınlanıp adresi Play'e yazılır |

---

## 1. Oyun dosyasını (.aab) hazırla — Android Studio

1. Android Studio'da `android` klasörünü aç.
2. Üst menü: **Build → Generate Signed App Bundle / APK…**
3. **Android App Bundle** seç → **Next**.
4. **Key store path** → **Create new…** (ilk sefer):
   - Dosyayı güvenli bir yere kaydet (ör. `Belgeler\bogaz-drive-anahtar.jks`).
   - Şifre belirle, **Alias**: `bogazdrive`, ad-soyad gir → **OK**.
   - ⚠ **Bu anahtar dosyasını ve şifresini asla kaybetme.** Kaybedersen oyunu bir daha güncelleyemezsin. USB belleğe ve e-postana da yedekle.
5. **Next** → **release** seç → **Create**.
6. Bitince sağ altta **locate** bağlantısı çıkar: dosya `android\app\release\app-release.aab`.

## 2. Play Console'da uygulamayı oluştur

1. https://play.google.com/console adresine gir → **Uygulama oluştur**.
2. Uygulama adı: **Boğaz Drive: İstanbul Sürüş** — Varsayılan dil: **Türkçe**.
3. **Oyun** seç, **Ücretsiz** seç, beyanları işaretle → **Uygulama oluştur**.

## 3. Dahili test sürümü yükle (önce kendin dene)

1. Sol menü: **Test et ve yayınla → Test → Dahili test** → **Yeni sürüm oluştur**.
2. `app-release.aab` dosyasını sürükle bırak.
3. Sürüm notu: `İlk sürüm`.
4. **Test kullanıcıları** sekmesinde kendi Gmail adresini ekle.
5. **Kaydet → İncele → Yayınla**. Birkaç dakika sonra test bağlantısıyla telefona yükleyip dene.

## 4. Satın alma ürünlerini oluştur

(.aab yüklendikten sonra açılır.) Sol menü: **Para kazanma → Ürünler → Uygulama içi ürünler**

| Ürün kimliği (birebir aynı yaz) | Ad | Tür | Önerilen fiyat |
|---|---|---|---|
| `vip_pack` | Premium Paket | Tek seferlik | ~100 TL |
| `gold_5500` | 5500 Altın | Tüketilebilir (tekrar alınabilir) | ~49,99 TL |

Her ürün için açıklama yaz, fiyat gir → **Kaydet → Etkinleştir**.

## 5. Mağaza sayfası

Sol menü: **Büyüme → Mağaza varlığı → Ana mağaza girişi**

- **Uygulama adı / Kısa açıklama / Tam açıklama**: `magaza-metinleri.md` dosyasından kopyala.
- İngilizce de eklemek için: **Çeviri ekle → İngilizce** → aynı dosyadaki English bölümünü kopyala.
- **Uygulama simgesi**: `gorseller/play-simge-512.png`
- **Öne çıkan görsel**: `gorseller/ozellikli-gorsel-1024x500.png`
- **Telefon ekran görüntüleri**: `ekran-goruntuleri` klasöründeki 8 resmin hepsi (sırayla 1'den 8'e).
- **7 inç tablet ekran görüntüleri**: aynı 8 resim.
- **10 inç tablet ekran görüntüleri**: aynı 8 resim.
- **Video**: önce YouTube'a yükle (aşağıda), bağlantıyı buraya yapıştır.

### Videoyu YouTube'a yükleme
1. https://studio.youtube.com → **Oluştur → Video yükle** → `video/bogaz-drive-tanitim.mp4`.
2. Başlık: `Boğaz Drive – İstanbul Sürüş Oyunu`.
3. "Çocuklar için yapılmadı" seç.
4. Görünürlük: **Herkese açık** ya da **Liste dışı** (Play için ikisi de olur; **Gizli olmaz**).
5. Bağlantıyı kopyala (ör. `https://www.youtube.com/watch?v=...`) → Play Console'daki **Video** alanına yapıştır.

## 6. Uygulama içeriği formları

Sol menü: **Politika → Uygulama içeriği** — hepsini doldur:

- **Gizlilik politikası**: `gizlilik-politikasi.html` dosyasını bir web adresinde yayınla (ör. GitHub Pages ya da Google Sites) ve adresini yaz.
- **Reklamlar**: **Hayır, reklam içermiyor** (bu sürümde reklam kapalı).
- **Uygulama erişimi**: Tüm özellikler kısıtlamasız.
- **İçerik derecelendirmesi**: Anketi doldur (şiddet yok, kumar yok, sohbet yok) → genelde **3+ / PEGI 3** çıkar.
- **Hedef kitle**: 13 yaş ve üzeri önerilir (satın alma olduğu için).
- **Veri güvenliği**: Bu sürümde kişisel veri toplanmıyor → "Veri toplamıyor / paylaşmıyor". Satın almalar Google Play üzerinden.
- **Kategori**: Oyun → **Yarış**.

## 7. Yayına çıkar

Dahili testte her şey yolundaysa: **Test et ve yayınla → Üretim → Yeni sürüm oluştur** → aynı `.aab` → **İncele → Yayınla**.
Google incelemesi ilk seferde genelde **birkaç gün** sürer.

## Sonraki güncellemelerde

- `android/app/build.gradle` içindeki `versionCode` her yüklemede 1 artmalı (1 → 2 → 3 …). Bunu bana söylemen yeterli.
- AdMob hesabı açınca kodları bana ver: reklamları açarım, o zaman "Reklam içeriyor = Evet" yapılır.

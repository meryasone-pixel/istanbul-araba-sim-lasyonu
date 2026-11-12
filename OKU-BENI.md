# Boğaz Drive – Google Play paketi

## Kurulum (bir kez)
1. Bu klasörü `C:\Users\user\Documents\GitHub\araba-simulasyon` içine kopyala (ya da yeni klasör olarak kullan).
   Zaten GitHub'daki yerel three.js ve font sürümün varsa, `www\index.html` dosyasını onunla değiştir.
2. Node.js (LTS) ve Android Studio kurulu olmalı.
3. `kur.bat` dosyasına çift tıkla. Script: three.js'i indirir, Capacitor'u kurar, Android projesini oluşturur, yatay mod + tam ekran + ekran açık kalma ayarlarını yapar ve Android Studio'yu açar.

## Test
Android Studio'da telefonu USB ile bağla ve ▶ Run'a bas.

## Yayın dosyası
Android Studio: Build → Generate Signed App Bundle → Android App Bundle → yeni keystore oluştur (YEDEKLE!) → release → `.aab`.

## Play Console
- `yayin\magaza-metinleri.md`: mağaza metinleri ve form cevapları
- `yayin\gizlilik-politikasi.html`: e-posta adresini yaz, GitHub Pages'e koy, linki Play Console'a gir
- Yeni kişisel hesapta: önce 12 test kullanıcısıyla 14 gün kapalı test, sonra üretim başvurusu
- Ekran görüntüsü, 512x512 simge ve 1024x500 görsel gerekir

## Tamir dükkanı (geçici olarak kapalı)
`www/index.html` içinde `REPAIR_SHOP=false`. Dükkanı geri açmak için `true` yap. Tamir şu an her yerde ücretsiz (`repFree=()=>true`); ücretli yapmak için `false` döndür. Tamir Mağaza ve Garaj panelindeki butondan yapılır.

## Google Play ürün kimlikleri (uygulama içi ürünler)
Tek para birimi altın. Play Console > Ürünler bölümünde şunları oluştur:
- Tüketilebilir: `gold_1000`, `gold_5500`, `gold_12000`
- Tüketilemez: `vip_pack` (+%50 kazanç, 5000 altın, VIP ürünler), `remove_ads`
- Tüketilemez: `starter_pack` (tek seferlik Başlangıç Paketi: 3000 altın + Gün Batımı kaplaması ve neonu)

## Reklamlar (AdMob)
- `kur.bat` `@capacitor-community/admob` eklentisini kurar ve AndroidManifest'e **Google'ın TEST uygulama kimliğini** yazar.
- Test: tarayıcıda denemek için `index.html` sonundaki `IST_CONFIG`'e `ads:{mock:true}` yaz (sahte onay penceresi çıkar).
- **Yayından önce:** AdMob hesabında uygulama + 2 reklam birimi (ödüllü, ara) oluştur. (1) `index.html` → `ads:{testing:false, ids:{rewarded:'ca-app-pub-.../...', interstitial:'ca-app-pub-.../...'}}`. (2) AndroidManifest'teki `APPLICATION_ID` değerini kendi AdMob **uygulama** kimliğinle değiştir. (3) Play Console'da "Reklam içeriyor = Evet" ve Veri güvenliği formunu güncelle. (4) Gizlilik politikasını (güncel `yayin/gizlilik-politikasi.html`) yayınla.
- Eklenti API adları (olay isimleri vb.) sürüme göre değişebilir; sorun olursa eklentinin README'sine bak.
- Özellikler: Menüde "📺 Bedava altın" (günde 5 hak, 3 dk bekleme, 100 altın), görev bitince "reklam izle → ödül ikiye katlansın", oyun bitince ara reklam (en fazla 5 dakikada bir, oturumun ilk 2 dk'sında yok, Reklam Kaldırma alınmışsa yok). Eklenti yoksa bu özellikler görünmez.

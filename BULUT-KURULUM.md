# Bulut kaydı kurulumu (Firebase)

Oyunun bulut kaydı kodu hazır (`www/modules/cloud.js`). Çalışması için Firebase'de bir proje açıp
iki bilgiyi (`apiKey` ve `projectId`) oyuna yazmak yeterli. Ek paket veya `google-services.json` gerekmez.
Ayar boşken bulut kaydı kapalıdır ve "☁ Bulut kaydı" düğmesi görünmez — oyun normal çalışır.

## 1. Firebase projesi
1. https://console.firebase.google.com → **Proje ekle** → bir ad ver (ör. `bogaz-drive`). Google Analytics gerekmez.
2. Proje açılınca **Proje ayarları (⚙) → Genel → Uygulamalarınız → Web (`</>`)** simgesine bas, bir ad ver, "Firebase Hosting" işaretleme.
3. Çıkan kodda şu iki değeri not al:
   - `apiKey: "AIza..."`
   - `projectId: "bogaz-drive-xxxx"`

## 2. İsimsiz giriş
**Build → Authentication → Başlayın → Sign-in method → Anonim (Anonymous) → Etkinleştir → Kaydet.**

## 3. Veritabanı
1. **Build → Firestore Database → Veritabanı oluştur** → konum olarak `eur3 (europe-west)` → **üretim modunda başlat**.
2. **Kurallar** sekmesine bu klasördeki `firestore.rules` dosyasının içeriğini yapıştır → **Yayınla**.

## 4. Oyuna yaz
`www/index.html` dosyasının sonundaki ayar satırında:

```
cloud:{apiKey:"",projectId:""}
```

kısmını kendi değerlerinle doldur, örneğin:

```
cloud:{apiKey:"AIza...",projectId:"bogaz-drive-xxxx"}
```

Sonra `npx cap copy android` ve uygulamayı yeniden yükle.

## 5. Dene
Ana menüde **☁ Bulut kaydı** → "Şimdi yedekle" → "✅ Son yedek: …" görünmeli.
Firebase konsolunda **Firestore → Data → saves** altında bir belge oluşmalı.

## Notlar
- `apiKey` gizli bir şifre değildir; Firebase'de güvenliği yukarıdaki kurallar sağlar. Yine de
  Google Cloud konsolunda bu anahtarı yalnızca *Identity Toolkit API*, *Token Service API* ve
  *Cloud Firestore API* ile sınırlayabilirsin. (Web sitesi/HTTP kısıtı koyma — uygulama içinden çalışmaz.)
- Ücret: küçük ve orta boy oyunlarda Firebase'in ücretsiz katmanı genellikle yeter.
- Play Console → **Veri güvenliği** formunda "Uygulama etkinliği / oyun ilerlemesi" verisinin
  toplandığını ve şifrelenerek aktarıldığını beyan et (bkz. `yayin/magaza-metinleri.md`).

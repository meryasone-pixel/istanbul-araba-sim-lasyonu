/* İngilizce sözlük (i18n.js kullanır). Soldaki Türkçe yazı ekranda nerede geçerse geçsin sağdakiyle değiştirilir; uzun olanlar önce.
   Yeni bir Türkçe yazı eklenirse buraya da İngilizcesini ekle. */
(function () {
  var W = [
    /* başlangıç ekranı */
    ['İSTANBUL SÜRÜŞ', 'ISTANBUL DRIVE'],
    ['Trafik ışıklarına uy, yayalara dikkat et, diğer araçlara çarpma. Ağır çarpmalar arabanı parçalar.', 'Obey traffic lights, watch out for pedestrians and don\'t hit other cars. Heavy crashes break your car apart.'],
    ['Sürmeye başla', 'Start driving'], ['Yeniden oyna', 'Play again'], ['Oyun bitti', 'Game over'],
    ['🚗 Serbest sürüş', '🚗 Free drive'], ['Serbest sürüş', 'Free drive'], ['Araba rengi', 'Car color'], ['Özel renk', 'Custom color'],
    ['Düğme boyutu', 'Button size'], ['Düğme şeffaflığı', 'Button transparency'], ['Sol/sağ düğmeleri yer değiştir', 'Swap left/right buttons'],
    ['Bilgisayarda da göster', 'Show on computer too'], ['♻ Oyunu sıfırla', '♻ Reset game'], ['Kapatmak için dokun', 'Tap to close'],
    ['Emin misin?', 'Are you sure?'], ['Para, aldığın araçlar ve parçalar, gezdiğin sokaklar silinecek. Bu işlem geri alınamaz.', 'Your gold, cars, parts and explored streets will be deleted. This cannot be undone.'],
    ['Evet, sıfırla', 'Yes, reset'], ['Vazgeç', 'Cancel'], ['Hazırlanıyor...', 'Loading...'],
    ['🟢 Az', '🟢 Light'], ['🟡 Orta', '🟡 Medium'], ['🔴 Çok', '🔴 Heavy'],
    /* sürüş ekranı */
    ['Sürüş puanı', 'Driving score'], ['km/sa', 'km/h'], ['🔧 Garaj / Mağaza', '🔧 Garage / Shop'], ['🔑 Motoru durdur', '🔑 Stop engine'],
    ['🔑 Arabayı çalıştır', '🔑 Start engine'], ['Motor çalıştı', 'Engine started'], ['Motor kapatıldı', 'Engine stopped'],
    ['Motor kapalı — ☰ menüden 🔑 ile çalıştır', 'Engine off — start it with 🔑 in the ☰ menu'],
    ['📢 Korna (H)', '📢 Horn (H)'], ['💡 Far (L)', '💡 Lights (L)'], ['🕐 Gün saati', '🕐 Time of day'], ['📷 Kamera (C)', '📷 Camera (C)'],
    ['📸 Fotoğraf', '📸 Photo'], ['⏹ Oyunu bitir', '⏹ End game'], ['🗺 Harita', '🗺 Map'], ['Haritayı göster', 'Show map'],
    ['Yeşil: gezdiğin sokaklar', 'Green: streets you explored'],
    ['Parmağınla sürükleyerek kamerayı çevir', 'Drag with your finger to turn the camera'], ['📸 Kaydet', '📸 Save'], ['✕ Çık', '✕ Exit'],
    ['Fotoğrafı kaydet veya paylaş', 'Save or share the photo'], ['Paylaşıldı ✓', 'Shared ✓'], ['Paylaşım iptal edildi', 'Sharing cancelled'],
    ['Paylaşılamadı — ekran görüntüsü alabilirsin', 'Could not share — you can take a screenshot'], ['Fotoğraf indirildi ✓', 'Photo downloaded ✓'],
    ['Kaydetmek için telefonunun ekran görüntüsü tuşlarını kullan', 'Use your phone\'s screenshot buttons to save'],
    ['Kaydedilemedi — ekran görüntüsü alabilirsin', 'Could not save — you can take a screenshot'],
    
    ['Gezdiğin her yeni sokak küçük haritada kırmızı olur ve', 'Every new street you explore turns red on the mini map and gives'],
    ['altın kazandırır ve haritada yeşil işaretlenir.', 'gold and is marked green on the map.'],
    ['altın kazandırır', 'gold'], ['Altın topla, görevleri yap', 'Collect gold, complete missions'],
    ['Yayaya çarptın', 'You hit a pedestrian'], ['Kırmızıda geçtin', 'You ran a red light'], ['Çarptın', 'You crashed'],
    
    ['🚚 Çekici geldi', '🚚 Tow truck came'], ['altın borç yazıldı, kazancından düşülecek', 'gold added as debt, it will be taken from your earnings'],
    ['🚚 Çekici borcu', '🚚 Tow debt'], ['Puanın:', 'Score:'], ['Kazanç:', 'Earned:'],
    ['⛴ Tekneye bin', '⛴ Board the boat'], ['🚗 Karaya çık', '🚗 Go ashore'], ['Tekneden çık', 'Leave the boat'],
    ['Önce oyuna başla', 'Start the game first'],
    /* tamir */
    ['🔧 Tamir et —', '🔧 Repair —'], ['ÜCRETSİZ', 'FREE'], ['📺 Reklam izle → ücretsiz tamir', '📺 Watch ad → free repair'],
    ['Araba sağlam ✓', 'Car is fine ✓'], ['🔧 Araba sağlam ✓', '🔧 Car is fine ✓'], ['Reklam tamamlanmadı, tamir yapılmadı', 'Ad not finished, no repair'],
    ['Araba zaten sağlam', 'Car is already fine'], ['reklam izleyerek ücretsiz tamir edebilirsin', 'you can repair for free by watching an ad'],
    ['Araba yenilendi', 'Car repaired'], ['🔧 Arabayı yenile', '🔧 Repair car'], ['📺 reklamla ücretsiz', '📺 free with ad'], 
    /* garaj */
    ['Arabayı döndürmek için sol tarafı parmağınla sürükle', 'Drag the left side to rotate the car'],
    ['🛒 Mağaza: kaplama, korna', '🛒 Shop: wraps, horns'], ['önce Yarış görevini bitir', 'finish the Race mission first'],
    ['daha az hasar alır', 'less damage'], ['çarpışmada', 'in crashes:'], ['Azami hız', 'Top speed'], ['azami', 'top speed'], ['⚙ Yükselt', '⚙ Upgrade'],
    ['En üst seviye ✓', 'Max level ✓'], ['Garajı kapatmak için ekranda boş bir yere dokun', 'Tap an empty spot on the screen to close the garage'],
    ['Motor yükseltildi', 'Engine upgraded'], ['Önce Yarış görevini tamamla (her arabayla oynanır)', 'Finish the Race mission first (any car can play it)'],
    ['Görev sırasında garaj açılmaz', 'Garage can\'t be opened during a mission'],
    ['Yarış arabası', 'Race car'], ['Spor coupe', 'Sports coupe'], ['Minibüs', 'Minibus'], ['Motosiklet', 'Motorcycle'], ['Taksi', 'Taxi'],
    ['Gümüş', 'Silver'], ['Kırmızı', 'Red'], ['Siyah', 'Black'], ['Mavi', 'Blue'],
    /* görevler */
    ['📦 Paket teslimi', '📦 Package delivery'], ['Yeşil ışığa 90 sn içinde ulaş', 'Reach the green light within 90 s'],
    ['🧼 Temiz sürüş', '🧼 Clean driving'], ['2 km yeni hasar almadan sür (puan 90+)', 'Drive 2 km without new damage (score 90+)'],
    ['🪙 Para avı', '🪙 Coin hunt'], ['90 sn içinde 8 altın topla', 'Collect 8 coins within 90 s'],
    ['🏁 Yarış görevi', '🏁 Race mission'], ['Hangi arabadaysan onunla: 120 sn içinde 3 kontrol noktasından geç', 'With any car: pass 3 checkpoints within 120 s'],
    ['ilk seferde: yarış arabası kilidi açılır', 'first time: unlocks the race car'],
    ['Yolcuyu al, 120 sn içinde hedefe bırak (yavaşla, dur)', 'Pick up the passenger and drop them off within 120 s (slow down, stop)'],
    ['🅿 Park et', '🅿 Park'], ['60 sn içinde işaretli yerde dur', 'Stop at the marked spot within 60 s'],
    ['🗺 Şehir turu', '🗺 City tour'], ['Her seferinde farklı 3 durağı 150 sn içinde gez', 'Visit 3 different stops within 150 s, new ones each time'],
    ['3 farklı pist', '3 different tracks'], ['🎯 Görevler', '🎯 Missions'], ['🔒 Görevler', '🔒 Missions'], ['🎯 Görevi başlat', '🎯 Start mission'],
    ['🔒 Görevleri açmak için serbest sürüşte şehrin üçte birini gez', '🔒 To unlock missions, explore a third of the city in free drive'],
    ['Gezdiğin her yeni sokak', 'Every new street you explore gives'],
    ['Şehri yeterince gezdin! Görevler açıldı 🎉', 'You explored enough of the city! Missions unlocked 🎉'],
    ['🏁 Yarış arabası kilidi açıldı!', '🏁 Race car unlocked!'], ['Görev tamam!', 'Mission complete!'], ['🏆 Yeni rekor', '🏆 New record'],
    ['rekoru:', 'record:'], ['rekor', 'record'], ['❌ Görev başarısız', '❌ Mission failed'], ['Görev başarısız', 'Mission failed'],
    ['Kontrol noktası', 'Checkpoint'], ['🧍 Yolcu bindi! Hedefe götür', '🧍 Passenger on board! Take them to the target'],
    ['🚕 Yolcuyu bırak', '🚕 Drop off passenger'], ['🚕 Yolcuyu al', '🚕 Pick up passenger'], ['yavaşla ve dur', 'slow down and stop'],
    ['📦 Teslimat', '📦 Delivery'], ['dur!', 'stop!'], ['🎯 Hedef', '🎯 Target'], ['Hedef', 'Target'],
    ['Sahil Pisti', 'Coast Track'], ['Merkez Pisti', 'Center Track'], ['Tarihi Yarımada Pisti', 'Historic Peninsula Track'],
    ['Galata Kulesi', 'Galata Tower'], ['Kuzey Sahil', 'North Coast'], ['Beyoğlu Caddesi', 'Beyoğlu Avenue'], ['İskele', 'Pier'],
    /* günlük hedefler */
    ['🎯 Günlük hedefler', '🎯 Daily goals'], ['her biri', 'each'], ['hepsi', 'all'], ['Görev tamamla', 'Complete missions'], ['Km sür', 'Drive km'],
    ['Yıldız topla', 'Collect stars'], ['🎯 Günlük hedef tamam:', '🎯 Daily goal done:'], ['🏆 Bugünkü tüm hedefler tamam!', '🏆 All of today\'s goals done!'],
    /* günlük giriş ödülü */
    ['🎁 Günlük Ödül', '🎁 Daily Reward'], ['🎁 Günlük', '🎁 Daily'], ['🔥 Seri:', '🔥 Streak:'], ['7. günde özel korna seni bekliyor', 'a special horn awaits you on day 7'],
    ['Yeni bir seri başlıyor 🙂 1. günden devam.', 'A new streak begins 🙂 back to day 1.'], ['🎵 Özel korna: Melodi', '🎵 Special horn: Melody'],
    ['🎁 7. gün hediyesi: Melodi kornası! (Mağaza → Korna)', '🎁 Day 7 gift: Melody horn! (Shop → Horn)'], ['Ödül eklenemedi', 'Could not add reward'],
    ['🎁 Günlük ödül', '🎁 Daily reward'], ['🎁 Günlük ödülün hazır! Ana ekranda ☰ Menü → 🎁 Günlük', '🎁 Your daily reward is ready! On the main screen: 🎁 Daily'],
    ['Premium bonus', 'Premium bonus'],
    /* mağaza */
    ['🛒 Mağaza', '🛒 Shop'], ['💰 Altın & Premium', '💰 Gold & Premium'], ['🎨 Kaplama', '🎨 Wraps'], ['📯 Korna', '📯 Horns'],
    ['⭐ Premium Paket', '⭐ Premium Pack'], ['Reklamsız oyun', 'No ads'], ['Tüm kazançlara +%50 altın', '+50% gold on all earnings'], ['Premium kaplamalar ve korna', 'Premium wraps and horn'],
    ['Not: Google Play ödemesi bu cihazda hazır değil (eklenti/ürünler eksik).', 'Note: Google Play billing isn\'t ready on this device.'],
    ['Sahipsin ✓', 'Owned ✓'], ['Satın alımları geri yükle', 'Restore purchases'], ['Satın al', 'Buy'], ['Geri yükleme istendi', 'Restore requested'],
    ['Takılı', 'Equipped'], ['Çıkar', 'Remove'], ['Premium gerekli', 'Premium required'], ['Başlangıç Paketi gerekli', 'Starter Pack required'],
    ['🔥 Günün fırsatı:', '🔥 Deal of the day:'], ['🔥 İndirimde', '🔥 On sale'], ['Normal fiyat', 'Normal price'], ['normal fiyat', 'normal price'], ['bugün geçerli', 'today only'], ['normal', 'normally'],
    ['satın alınsın mı? (gerçek ödeme yok)', 'buy? (no real payment)'], ['İptal edildi', 'Cancelled'], ['Ürün bulunamadı', 'Product not found'],
    ['Satın alma tamamlanmadı', 'Purchase not completed'], ['Satın alma başarısız', 'Purchase failed'], ['Altın eklenemedi, tekrar dene', 'Could not add gold, try again'],
    ['etkinleştirildi', 'activated'], ['geri yüklendi', 'restored'], ['Mağaza bu cihazda bağlı değil', 'Shop is not connected on this device'],
    ['Bu ürün Premium Paket gerektirir', 'This item requires the Premium Pack'], ['Bu ürün Başlangıç Paketi gerektirir', 'This item requires the Starter Pack'],
    ['Yetersiz altın — altın paketlerine bak', 'Not enough gold — check the gold packs'], ['Yetersiz altın', 'Not enough gold'],
    ['⭐ Premium Paket Mağaza\'da seni bekliyor', '⭐ The Premium Pack is waiting for you in the Shop'],
    ['Yarış Şeritleri', 'Racing Stripes'], ['Damalı Bayrak', 'Checkered Flag'], ['Kamuflaj', 'Camouflage'], ['Alev', 'Flames'], ['VIP Altın', 'VIP Gold'],
    ['Boğaz Gün Batımı', 'Bosphorus Sunset'], ['Vapur Düdüğü', 'Ferry Horn'], ['Taksi Bip-Bip', 'Taxi Beep-Beep'], ['Spor Korna', 'Sport Horn'],
    ['VIP Korna', 'VIP Horn'], ['Melodi', 'Melody'],
    /* reklam */
    ['📺 Bedava Altın', '📺 Free Gold'], ['📺 Bedava altın', '📺 Free gold'], ['📺 Reklam izle', '📺 Watch ad'], ['altın daha', 'more gold'],
    ['📺 Reklam ödülü', '📺 Ad reward'], ['Reklam tamamlanmadı, ödül yok', 'Ad not finished, no reward'], ['Reklam izle,', 'Watch an ad, get'],
    ['altın kazan. Bugün kalan hak:', 'gold. Left today:'], ['Bugünlük bitti', 'Done for today'], ['Bekle', 'Wait'],
    ['[TEST] Reklam izlendi sayılsın mı?', '[TEST] Count the ad as watched?'],
    /* bulut kaydı */
    ['☁ Bulut kaydı', '☁ Cloud save'], ['Şimdi yedekle', 'Back up now'], ['Kurtarma kodun — bir yere not al, kimseyle paylaşma:', 'Your recovery code — write it down, don\'t share it:'],
    ['İlerlemen (altın, arabalar, parçalar, bölgeler, görevler) otomatik olarak internete yedeklenir. Telefon değiştirirsen ya da oyunu silip yeniden kurarsan aşağıdaki kodla geri yükleyebilirsin', 'Your progress (gold, cars, parts, districts, missions) is backed up online automatically. If you change phones or reinstall the game, you can restore it with the code below'],
    ['✅ Son yedek:', '✅ Last backup:'], ['⏳ Henüz yedeklenmedi', '⏳ Not backed up yet'], ['Kod kopyalandı', 'Code copied'],
    ['Kodu basılı tutup kopyalayabilirsin', 'Press and hold the code to copy it'],
    ['Başka telefondaki ilerlemeni buraya getirmek için o telefondaki kodu gir:', 'To bring progress from another phone, enter that phone\'s code:'],
    ['Kurtarma kodu', 'Recovery code'], ['Geri yükle', 'Restore'], ['Bu zaten bu telefonun kodu', 'This is already this phone\'s code'], ['Eminim, yükle', 'I\'m sure, restore'],
    ['Dikkat: bu telefondaki ilerleme, koddaki ilerlemeyle değiştirilecek', 'Warning: this phone\'s progress will be replaced with the code\'s progress'],
    ['Kaydedilemedi — internet bağlantısını kontrol et', 'Could not save — check your internet connection'], ['Kod 20 karakter olmalı', 'The code must be 20 characters'],
    ['Bu koda ait kayıt bulunamadı', 'No save found for this code'], ['İlerleme geri yüklendi, oyun yeniden başlıyor…', 'Progress restored, restarting the game…'],
    ['Geri yüklenemedi — internet bağlantısını kontrol et', 'Could not restore — check your internet connection'], ['Geri yüklenemedi', 'Could not restore'],
    ['☁ Yedeklendi', '☁ Backed up'], ['Yedeklenemedi', 'Could not back up'], ['Kaydediliyor…', 'Saving…'],
    /* bölgeler */
    ['🏙 Bölgeler', '🏙 Districts'], ['🎯 Bölge görevi', '🎯 District mission'], ['Boğaziçi Köprüsü', 'Bosphorus Bridge'], ['Anadolu Yakası', 'Asian Side'],
    ['Caddebostan Sahil Yolu', 'Caddebostan Coastal Road'], ['🌉 Köprü turu', '🌉 Bridge tour'], ['🏖 Sahil turu', '🏖 Coast tour'],
    ['Boğaziçi Köprüsü dahil 3 kontrol noktasından geç', 'Pass 3 checkpoints, including the Bosphorus Bridge'], 
    ['Sahil yolu boyunca 3 kontrol noktasından geç', 'Pass 3 checkpoints along the coastal road'], ['Önce görevi bitir', 'Finish the mission first'],
    ['Görev başlatılamadı', 'Could not start the mission'], ['⏱ Süre doldu — tekrar dene', '⏱ Time\'s up — try again'], ['🚗 Deneme sürüşü', '🚗 Test drive'],
    ['Deneme bitti!', 'Test drive over!'], ['bölgesini açmak için 🏙 Bölgeler menüsüne bak', ': unlock it in the 🏙 Districts menu'], ['Bu bölge kilitli', 'This district is locked'],
    ['Yeni bölgeler altınla açılır', 'New districts are unlocked with gold'], ['Altının:', 'Your gold:'], ['📍 Şu an:', '📍 Now:'],
    ['↩ Fatih\'e dön', '↩ Back to Fatih'], ['Fatih\'e dön', 'Back to Fatih'], ['Deneme sürüşünde görev yapılamaz', 'No missions during a test drive'],
    ['Devam ediyor', 'In progress'], ['Görev devam ediyor', 'Mission in progress'], ['Başlat', 'Start'], ['Buradasın', 'You are here'], ['Açık', 'Unlocked'], ['Git', 'Go'],
    /* tek kelimeler (en sona; yalnızca tam kelime olarak) */
    ['Ayarlar', 'Settings'], ['⚙ Ayarlar', '⚙ Settings'], ['Menü', 'Menu'], ['Mod', 'Mode'], ['Zaman', 'Time'], ['Gündüz', 'Day'], ['Akşam', 'Evening'], ['Gece', 'Night'],
    ['Hava', 'Weather'], ['Trafik', 'Traffic'], ['Renk', 'Color'], ['Sol', 'Left'], ['Sağ', 'Right'],
    ['Korna', 'Horn'], ['Fren', 'Brake'], ['Gaz', 'Gas'], ['Kapat', 'Close'], ['🔧 Garaj', '🔧 Garage'], ['Garaj', 'Garage'],
    ['Model', 'Model'], ['Motor', 'Engine'], ['Seviye', 'Level'], ['Jant', 'Rims'], ['Boya', 'Paint'], ['Başla', 'Start'], ['Hasar:', 'Damage:'], ['Yol:', 'Distance:'],
    ['Çarpışma', 'Crash'], ['tamir', 'repair'], ['bonus', 'bonus'], ['altın', 'gold'], ['Altın', 'Gold'], ['sn', 's'], ['Bölge', 'District'], 
  ];
  var L = 'A-Za-zÇĞİÖŞÜçğıöşü', esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  W.sort(function (a, b) { return b[0].length - a[0].length; });
  window.IST_EN = {}; W.forEach(function (p) { window.IST_EN[p[0]] = p[1]; });
  window.IST_EN_W = W.map(function (p) {
    var s = esc(p[0]);
    if (/^[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p[0])) s = '(?<![' + L + '])' + s;
    if (/[A-Za-zÇĞİÖŞÜçğıöşü]$/.test(p[0])) s = s + '(?![' + L + '])';
    return [new RegExp(s, 'g'), p[1].replace(/\$/g, '$$$$')];
  }).concat([[/%(\d+)/g, '$1%'], [/(\d+)\. gün/g, 'day $1'], [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])gün(?![A-Za-zÇĞİÖŞÜçğıöşü])/g, 'days'], [/(?<![A-Za-zÇĞİÖŞÜçğıöşü])seri(?![A-Za-zÇĞİÖŞÜçğıöşü])/g, 'streak']]);
  var tw = function (s) { return window.IST && IST.t ? IST.t(s) : s; };
  /* sözcük sırası farklı olan cümleler (tamamı eşleşmeli) */
  window.IST_EN_RX = [
    [/^(\d+) altınla aç$/, 'Unlock for $1 gold'],
    [/^🔒 (\d+) altınla açılır$/, '🔒 Unlock for $1 gold'],
    [/^(\d+) sn dene$/, 'Try for $1 s'],
    [/^🚗 (\d+) sn dene$/, '🚗 Try for $1 s'],
    [/^(🔒 )?Önce (.+) bölgesini aç$/, function (m, a, n) { return (a || '') + 'Unlock ' + tw(n) + ' first'; }],
    [/^(.+) açıldı(!?)$/, function (m, n, e) { return tw(n) + ' unlocked' + e; }],
    [/^(.+) başladı!$/, function (m, n) { return tw(n) + ' started!'; }],
    [/^✅ (.+) tamam! \+(\d+) altın$/, function (m, n, g) { return '✅ ' + tw(n) + ' complete! +' + g + ' gold'; }],
    [/^Deneme bitti! (.+) bölgesini açmak için 🏙 Bölgeler menüsüne bak$/, function (m, n) { return 'Test drive over! Unlock ' + tw(n) + ' in the 🏙 Districts menu'; }],
    [/^🏁 Yarış arabası kilidi açıldı! Garajdan (\d+) altına alabilirsin$/, '🏁 Race car unlocked! Buy it in the Garage for $1 gold'],
    [/^(.+) çarpışmada %(\d+) daha az hasar alır$/, function (m, n, p) { return tw(n) + ' takes ' + p + '% less crash damage'; }],
    [/^(\d+)\. gün( 🎉)?$/, 'Day $1$2']
  ];
})();

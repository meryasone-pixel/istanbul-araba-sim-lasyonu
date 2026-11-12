@echo off
setlocal
REM === Istanbul Surus - Android projesi kurulumu ===
REM Paket adini degistirmek istersen hem burayi hem capacitor.config.json ve template\MainActivity.java dosyalarini ayni sekilde guncelle.
set APPID=com.istanbulsurus.oyun
set APPPATH=com\istanbulsurus\oyun

where node >nul 2>nul || (echo Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kur. & pause & exit /b 1)
where curl >nul 2>nul || (echo curl bulunamadi. Windows 10 veya uzeri gerekli. & pause & exit /b 1)

if not exist www\three.min.js (
  echo three.js indiriliyor...
  curl -L -o www\three.min.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js || (echo Indirme basarisiz. & pause & exit /b 1)
)

echo Capacitor kuruluyor...
call npm install @capacitor/core @capacitor/android || goto :hata
call npm install -D @capacitor/cli || goto :hata
call npm install @capacitor-community/admob || goto :hata

if not exist android (
  call npx cap add android || goto :hata
)

echo Uygulama simgesi ekleniyor...
xcopy /E /Y /I template\res android\app\src\main\res >nul
echo Yatay mod ve tam ekran ayarlari uygulaniyor...
copy /Y template\MainActivity.java android\app\src\main\java\%APPPATH%\MainActivity.java >nul || goto :hata
powershell -NoProfile -Command "$f='android\app\src\main\AndroidManifest.xml'; $t=Get-Content $f -Raw; if($t -notmatch 'screenOrientation'){ $t=$t -replace '<activity','<activity android:screenOrientation=\"sensorLandscape\"'; Set-Content $f $t -NoNewline }"
powershell -NoProfile -Command "$f='android\app\src\main\AndroidManifest.xml'; $t=Get-Content $f -Raw; if($t -notmatch 'gms.ads.APPLICATION_ID'){ $t=$t -replace '</application>','<meta-data android:name=\"com.google.android.gms.ads.APPLICATION_ID\" android:value=\"ca-app-pub-3940256099942544~3347511713\"/></application>'; Set-Content $f $t -NoNewline }"

call npx cap sync android || goto :hata
echo.
echo Hazir. Android Studio aciliyor...
call npx cap open android
exit /b 0

:hata
echo Bir hata olustu. Yukaridaki mesaji kontrol et.
pause
exit /b 1

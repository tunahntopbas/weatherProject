# Weather UI Redesign — Design

## Amaç

Mevcut frontend tek bir statik kart (`weather-search`) — sade, animasyonsuz, sadece
serbest metinle sehir aranabiliyor (81 il'in tamami degil, Turkce karakter/case
sorunlarina acik). Bu tasarim iki seyi birlikte cozer:

1. **Gorsel yenileme**: secilen sehrin hava durumuna ve gunun saatine gore degisen,
   animasyonlu, sinematik bir arayuz (referans: kullanicinin verdigi iki hava durumu
   uygulamasi ekran goruntusu — koyu, atmosferik arka plan + yari-saydam "glass" kartlar
   + buyuk baslik tipografisi + haftalik tahmin seridi).
2. **Sehir secimi/dogruluk**: 81 ilin tamaminin aranabilir olmasi ve Turkce karakter
   (İ/I, ğ, ş, ç, ö, ü) kaynakli arama hatalarinin ortadan kalkmasi.

## Kapsam disi (YAGNI)

- Kullanici hesabi / kisisellestirme (localStorage disinda kalici veri yok)
- Saatlik (24 saat) tahmin — sadece su anki durum + 7 gunluk gunluk ozet
- Harita gorunumu, cok dilli arayuz, birim degistirme (°C/°F)
- Gercek fotograf/CDN gorsel kullanimi (bkz. "Neden CSS-generative" asagida)

## Backend degisikligi

`backend/src/WeatherProject.Infrastructure/ExternalApis/OpenMeteoProvider.cs`:

- Forecast cagrisina eklenecek parametreler: `current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=7&timezone=auto`
- `WeatherForecast` modeli (`backend/src/WeatherProject.Domain/Entities/WeatherForecast.cs` + frontend `weather-forecast.model.ts`) genisletilir:

```
cityName: string
date: string
temperatureCelsius: number
description: string
weatherCode: number        // YENI — WMO kodu, tema eslestirme icin
isDay: boolean             // YENI — Open-Meteo current.is_day (0/1)
windSpeedKmh: number       // YENI
humidityPercent: number    // YENI
daily: DailyForecast[]     // YENI — 7 gun
```

```
DailyForecast:
  date: string
  weatherCode: number
  tempMaxCelsius: number
  tempMinCelsius: number
```

- **Turkce arama guvenlik agi**: `GeocodeAsync`, ilk denemede sonuc bulamazsa
  (`results` bos), sorguyu basit bir Turkce→ASCII sadelestirmeden (İ/ı/I/i→i, ğ→g,
  ş→s, ç→c, ö→o, ü→u, tamami kucuk harf) gecirip **bir kez daha** dener. Bu, birincil
  savunma degil (birincil savunma: asagidaki kapali liste/autocomplete) — API'nin
  dogrudan cagrilma ihtimaline karsi ikincil bir guvenlik agi.

## Frontend bilesen yapisi

`frontend/src/app/features/weather-search/` altindaki tek bilesen, `weather-dashboard`
adiyla yeniden yapilandirilir, alt bilesenlere bolunur:

```
weather-dashboard/               (orkestrasyon: forecast signal, arama/secim akisi)
  weather-dashboard.component.ts/.html/.scss
components/
  animated-background/           (tema girdisine gore sahne cizer)
  city-autocomplete/              (81 il, filtreli oneri listesi)
  weather-hero/                  (buyuk sicaklik + baslik + ruzgar/nem etiketleri)
  forecast-strip/                (7 gunluk mini kart + baglayici cizgi)
core/
  data/turkish-provinces.ts      (81 il'in sabit listesi)
  services/weather-theme.service.ts  (weatherCode + isDay -> tema nesnesi, SAF fonksiyon)
```

### `weather-theme.service.ts` — tema eslestirme (saf fonksiyon, kolay test edilir)

WMO kodlari 7 kategoriye indirgenir (mevcut backend `WeatherCodeDescriptions`
sozlugundeki gruplamayla birebir tutarli):

| Kategori | WMO kodlari |
|---|---|
| `clear` | 0, 1 |
| `cloudy` | 2, 3 |
| `fog` | 45, 48 |
| `drizzle` | 51, 53, 55 |
| `rain` | 61, 63, 65, 80, 81, 82 |
| `snow` | 71, 73, 75 |
| `storm` | 95, 96, 99 |

`isDay`, tum kategoriler icin genel bir "aydinlik/karanlik" modifier'i olarak
uygulanir (gradient tonu koyulasir); `clear` kategorisinde ayrica gorsel eleman
degisir (gunes diski ↔ ay/yildizlar).

Cikti: `{ category, isDay, skyGradient: string[], particle: 'rain'|'snow'|'clouds'|'sun-rays'|'fog-bands'|'lightning'|null, headline: string }`

### `animated-background` — CSS-generative sahne (dis gorsel/CDN yok)

Neden CSS-generative (gercek fotograf degil): bu makinede/oturumda kurumsal ag
tekrar tekrar dis kaynaklara erisimi kesintiye ugratti (bkz. proje hafizasi); harici
bir stok-foto CDN'ine bagimli bir arka plan, gercek kullanimda kirilgan olurdu.
CSS/SVG ile uretilen sahneler hicbir agi/CDN'i gerektirmez, garanti calisir.

3 katman (`position: absolute`, ust uste):
1. **Gokyuzu**: `linear-gradient`, tema kategorisine ve `isDay`'e gore renk durakları
   (CSS custom property olarak component'ten set edilir, `transition` ile yumusak gecis)
2. **Hareket**: kategoriye gore secilen tek bir parcacik/hareket deseni —
   `rain`: asagi kayan, hafif egik, bulanik cizgiler (`repeating-linear-gradient` + `translateY` animasyonu)
   `snow`: rastgele boyut/gecikmeyle dusen kucuk daireler (surukleme icin `translateX` sallanmasi)
   `clouds`: buyuk, bulanik (`filter: blur()`), yatay yavas kayan elips seklller
   `sun-rays`: merkezden disariya donen/nabiz atan konik gradient isinlari
   `fog-bands`: yatay kayan, dusuk opakliktaki genis seritler
   `lightning`: rastgele araliklarla kisa parlama (opacity keyframe) + rain deseni
3. **Icerik**: ust katmanlardaki glass kartlar (`backdrop-filter: blur()`, yari-saydam beyaz/koyu zemin)

`@media (prefers-reduced-motion: reduce)`: tum `animation`/`transition` sureleri
`0.01ms`'ye dusurulur (mevcut `styles.scss`'teki genel kural zaten bunu kapsiyor,
yeni eklenen animasyonlar da bu kurala tabi olacak sekilde yazilacak).

### `city-autocomplete`

- `turkish-provinces.ts`: 81 ilin dogru Turkce yaziliminda sabit dizisi (derleme
  zamaninda gomulu, agdan cekilmiyor)
- Kullanici yazdikca (`ngModel` + `computed`/`signal` ile) baslangic-eslesen iller
  filtrelenip acilir bir liste (`listbox`, ok tuslariyla gezilebilir, `Enter` ile
  secilir — WAI-ARIA combobox pattern'i) gosterilir
- Secim yapilmadan `Ara` butonuna basilirsa: yazilan metin listede **birebir**
  eslesiyorsa o deger kullanilir, eslesmiyorsa kullanicidan listeden secim yapmasi
  istenir (serbest metin backend'e gonderilmez) — bu, Turkce karakter bug'inin
  kok cozumu

### `weather-hero`

Buyuk sicaklik (`font-size` referanslardaki gibi buyuk, `var(--font-display)`),
altinda durum basligi (orn. "Firtinali, hafif yagmurlu" — `description` Turkceye
kucuk bir sozlukle cevrilir, cunku Open-Meteo Ingilizce donuyor), ruzgar (km/h) ve
nem (%) icin iki kucuk etiket.

### `forecast-strip`

7 gunluk mini kart (gun adi kisaltmasi + kucuk CSS-ikon + yuksek/dusuk sicaklik).
Kartlarin ustunde, gunluk yuksek sicakliklari birlestiren ince bir SVG `path`
cizgisi — sayfa yuklendiginde `stroke-dasharray`/`stroke-dashoffset` ile "cizilerek"
beliren bir animasyon (referans gorsellerdeki dalga grafiginden esinlenilen, editoryal
imza dokunusu).

## Hata durumlari

- Secilen il icin backend 404/500 donerse: notr/bulutlu bir arka plan sahnesiyle
  birlikte acik bir hata mesaji gosterilir (mevcut `station__error` mantiginin
  gelismis hali) — animasyon katmani cokmez, sadece notr temaya duser.
- Ag hatasi (backend'e hic ulasilamazsa): ayni notr sahne + "Sunucuya ulasilamadi"
  mesaji.

## Test plani

- **Frontend birim testleri**: `weather-theme.service.spec.ts` (her WMO kod
  kategorisi + isDay kombinasyonu icin dogru tema dondugunu dogrular — saf
  fonksiyon oldugu icin kolay), `city-autocomplete` filtre mantigi icin birkac
  senaryo (kismi eslesme, Turkce karakter iceren sorgu, eslesme yok)
- **Backend testleri**: `OpenMeteoProviderTests.cs` genisletilir — `daily` dizisinin
  dogru parse edildigini, `is_day`/`wind_speed_10m`/`relative_humidity_2m`
  alanlarinin modele dogru aktarildigini, ve geocoding "sonuc yok → sadelestirilmis
  sorguyla tekrar dene" davranisini dogrulayan yeni test case'leri

## Acik sorular / varsayimlar

- Open-Meteo'nun `description` alani (Ingilizce, orn. "clear sky") frontend'de
  kucuk sabit bir sozlukle (23 giris, mevcut backend sozlugu kadar) Turkceye
  cevrilecek — backend'i degistirmeye gerek yok, ceviri sadece goruntuleme katmaninda.
- 7 günlük tahminde gunun tarihine gore gun adi (Pazartesi, Sali, ...) frontend'de
  `Intl.DateTimeFormat('tr-TR', { weekday: 'short' })` ile hesaplanacak, backend
  sadece ISO tarih doner.

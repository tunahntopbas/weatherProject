# Weather UI v2 — Gelismis Arayuz — Design

## Amac

[[2026-08-12-weather-ui-redesign]] ile CSS-generative, tek sayfalik bir dashboard
kuruldu. Kullanici referans olarak iki gercek hava durumu uygulamasi ekran goruntusu
verdi (koyu fotografik arka plan + glass kartlar + buyuk tipografi + haftalik dalga
grafigi) ve mevcut sonucu "cok basit" buldu. Bu spec, ayni temeli (weather-theme,
forecast-strip, city-autocomplete) koruyarak uygulamayi 4 sayfali, foto-arka-planli,
kendine ozgu bir gorsel kimlige sahip bir urune donusturuyor.

**v1'den sapma:** v1 spec'i "gercek fotograf/CDN gorsel kullanimi" konusunu kurumsal
ag guvenilirligi yuzunden kapsam disi birakmisti (bkz. [[project-corporate-network-blocks-openweathermap]]).
Bu karar burada tersine cevriliyor — ama CDN'den degil, **derleme zamaninda repo'ya
gomulen statik dosyalardan**. Calisma zamaninda hicbir dis istek yok, bu yuzden
kurumsal ag kisitlamasi bu ozelligi etkilemiyor.

## Kapsam disi (YAGNI)

- Kullanici hesabi/girisi (favoriler dahil her sey localStorage'da kalir)
- Saatlik (24 saat) tahmin — hala sadece su anki durum + 7 gunluk ozet
- Birim degistirme (°C/°F), coklu dil
- Ayarlar sayfasi (kullanici bu turda istemedi)
- Harita disinda baska bir gorsellestirme (grafik kutuphanesi eklenmiyor, mevcut el-yapimi SVG yaklasimlari yeterli)

## Gorsel kimlik (token sistemi)

**Renk** — foto/glass ustunde calisan chrome paleti (marka rengi degil):

| Token | Deger | Kullanim |
|---|---|---|
| `--ink` | `#0B0F14` | glass panel taban tonu |
| `--paper` | `#F7F8FA` | metin (notr beyaz, sicak krem degil) |
| `--stamp` | `#C6672E` | aksiyon/imza vurgusu (plaka rozeti, aktif nav) |
| `--cold` | `#5B8FA8` | sicaklik skalasi soguk uc (harita, karsilastirma) |
| `--warm` | `#D98B3F` | sicaklik skalasi sicak uc |
| `--glass-border` | `rgba(255,255,255,.14)` | glass kart kenarligi |

**Tipografi** (ucu de self-host, `frontend/public/fonts/` — Google Fonts CDN'e
bagimliligi tekrar etmemek icin, bkz. [[project-frontend-google-fonts-dependency]]):

- Display (baslik, buyuk sicaklik): **Fraunces**
- UI/body: **Manrope**
- Utility/mono (plaka rozeti, sayisal veriler): **IBM Plex Mono**

**Imza ogesi — Il plaka rozeti:** Sehir adinin yaninda, mono fontlu, hafif donuk,
ince kenarlikli plaka-kodu rozeti (orn. "34", "06" — `TurkishProvinceCoordinates`
verisinden turetilir). Hero'da, favori/son-aranan kartlarinda ve harita renk
skalasinda tekrar eden tek gorsel imza. Yeni sehir secilince ~200ms "damga vurma"
animasyonuyla (scale+rotate, settle) sahneye girer.

**Hareket:**
- Sehir degisince: arka plan foto crossfade (~600ms) + rozet damga animasyonu + baslik fade-up
- Haftalik grafik: `stroke-dashoffset` ile cizilerek beliren cizgi (v1'den korunuyor)
- Kart hover: hafif kalkma + glass parlaklasma
- `prefers-reduced-motion: reduce`: tum yeni animasyonlar da mevcut global kurala tabi (`0.01ms`'ye duser)

## Arka plan fotograflari

`frontend/public/images/weather/{category}.jpg` — 7 kategori (clear, cloudy, fog,
drizzle, rain, snow, storm), her biri hem gunduz hem gece icin tek foto + gece icin
`weather-theme.service.ts`'nin urettigi karartma gradient overlay'i uzerine biner
(ayri gece fotografi gerekmez). Unsplash/Pexels'in ucretsiz-atifsiz lisansli
gorsellerinden secilecek, implementasyon asamasinda indirilip repo'ya commit'lenecek.

`weather-theme.service.ts`'e eklenen alan:

```
backgroundImageUrl: string   // YENI — /images/weather/{category}.jpg
```

`animated-background` component'i: mevcut 3 katmanli yapi (gokyuzu gradient +
parcacik + icerik) korunur, gokyuzu katmaninin **altina** foto katmani eklenir;
gradient artik duz renk degil, fotonun okunabilirligi icin karartma
(`linear-gradient(rgba(11,15,20,.3), rgba(11,15,20,.75))`) olarak foto uzerine biner.

## Routing ve app shell

Angular Router (paket zaten mevcut, hic route tanimli degildi) devreye alinir.

```
app.routes.ts:
  ''            -> WeatherDashboardComponent  (Anasayfa)
  'favoriler'   -> FavoritesPageComponent
  'karsilastir' -> ComparePageComponent
  'harita'      -> MapPageComponent
```

`app.ts`/`app.html` yeni bir **app-shell** haline gelir:

```
app-shell/
  sidebar/            (logo + 4 gercek nav linki, routerLink+routerLinkActive)
  top-bar/             (city-autocomplete buraya tasinir, her sayfada erisilebilir)
  <router-outlet>
```

Sidebar linkleri gercek sayfalara gider — islevsiz dekoratif ikon yok.

## Frontend bilesen/servis yapisi (yeni/degisen)

```
core/services/
  favorites.service.ts        (YENI — localStorage CRUD, signal-based, recent'tan bagimsiz)
  multi-city-weather.service.ts (YENI — sehir listesi verilip her biri icin
                                  getCurrentWeather paralel cagrilir, {cityName, temp,
                                  weatherCode, plateCode} listesi doner; favoriler VE
                                  son-aranan panel bunu ortak kullanir)
components/
  province-badge/              (YENI — plaka rozeti, tum sayfalarda tekrar kullanilir)
  city-weather-card/            (YENI — ikon+sicaklik+rozet kucuk kart; favoriler,
                                  son-aranan panel, karsilastirma sayfasinda ortak)
  app-shell/sidebar/            (YENI)
  app-shell/top-bar/            (YENI)
features/
  weather-dashboard/            (DEGISIYOR — sag panelde son-aranan artik
                                  multi-city-weather.service ile gercek sicaklik
                                  gosterir; hero'ya favori ekle/cikar kalp butonu eklenir)
  favorites/                    (YENI — favori sehirlerin city-weather-card grid'i)
  compare/                      (YENI — 2-3 sehir secimi + yan yana karsilastirma kartlari)
  map/                          (YENI — Turkiye SVG haritasi)
```

### Favoriler sayfasi

`favorites.service.ts`: `toggle(cityName)`, `isFavorite(cityName)`, `list(): Signal<string[]>`,
localStorage anahtari `weather-favorite-cities`. Hero'da kalp/yildiz butonu bu servisi
cagirir. Favoriler sayfasi, `favorites.list()`'i `multi-city-weather.service`'e verip
donen sonucu `city-weather-card` grid'inde gosterir. Bos durum: "Henuz favori sehir
eklenmedi, bir sehri arayip kalp ikonuna tiklayin" mesaji.

### Karsilastirma sayfasi

Kullanici city-autocomplete ile 2-3 sehir secer (`compare.component.ts` icinde yerel
signal dizi, max 3). Her sehir icin `weatherService.getCurrentWeather` ayri ayri
cagrilir (backend degisikligi yok). Sonuclar yan yana kart: sicaklik, ruzgar, nem,
7 gunluk max/min ozet tablosu. Bir sehir kaldirilabilir, yerine yenisi eklenebilir.

### Harita sayfasi

Turkiye'nin 81 ilini gosteren acik lisansli statik SVG (implementasyon asamasinda
bulunup `frontend/public/images/turkey-provinces.svg` olarak gomulur), her `<path>`
`id` ile `TURKISH_PROVINCES` listesindeki isme eslestirilir (implementasyon plani bu
eslestirme tablosunu cikaracak). Sayfa acildiginda, gorunur/varsayilan bir il seti
icin (ya da sadece tiklanan il icin — tek tek 81 istek atmamak icin **tiklanan ilin
verisi tiklandiginda cekilir**, harita varsayilan olarak notr renkte acilir) veri
cekilir; il tiklaninca o ilin guncel sicakligina gore path'i `--cold`→`--warm` skalasinda
renklendirir ve dashboard'a o sehri yukler (`router.navigate(['/'])` + secili sehir).

## Backend degisikligi

**Yok.** Tum yeni ozellikler mevcut `GET /api/weather/{cityName}` endpoint'inin
frontend'de coklu/farkli sekillerde cagrilmasiyla calisir.

## Hata durumlari

- `multi-city-weather.service`: bir sehir icin istek basarisiz olursa, o kart
  "Yuklenemedi" durumunda gosterilir, digerlerini engellemez (`forkJoin` degil,
  bagimsiz `catchError` ile her istek kendi hatasini yutar).
- Harita: tiklanan il icin istek basarisiz olursa, path rengi degismez + kucuk bir
  toast/hata mesaji gorunur, harita cokmez.
- Karsilastirma: bir sehir yuklenemezse o kart "Yuklenemedi" gosterir, digerleri kalir.

## Test plani

- `favorites.service.spec.ts`: toggle/list/persist localStorage davranisi
- `multi-city-weather.service.spec.ts`: paralel cagri + kismi hata senaryosu (bir sehir
  basarisiz, digerleri basarili donuyor mu)
- `province-badge.component.spec.ts`, `city-weather-card.component.spec.ts`: render testleri
- `app.routes` icin navigation smoke test (4 route'un da yukleniyor olmasi)
- Mevcut `weather-theme.service.spec.ts`, `forecast-strip`, `city-autocomplete` testleri
  korunur, `backgroundImageUrl` alani icin tema testine bir assertion eklenir

## Acik sorular / varsayimlar

- Foto ve harita SVG dosyalarinin tam kaynagi/lisans metni implementasyon sirasinda
  netlesecek (Unsplash/Pexels ucretsiz lisans; Turkiye il haritasi icin acik lisansli
  bir kaynak — implementasyon plani bunu arastirma adimi olarak icerecek).
  Reason: sistem bu sohbette gorsel bir stok foto arama/indirme kanalina sahip degil.
- Harita sayfasinda "tiklanana kadar veri cekilmez" varsayimini yaptim (81 istek
  performans/UX icin mantiksiz); istenirse implementasyon planinda gozden gecirilebilir.

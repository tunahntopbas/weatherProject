# Weather UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend'e 7 gunluk tahmin + hava durumu kodu/gunduz-gece/ruzgar/nem eklemek; frontend'i, secilen sehrin hava durumuna ve saatine gore animasyonlu bir sahne gosteren, 81 ilin tamaminin dogru yazimla aranabildigi (autocomplete) bir arayuze donusturmek.

**Architecture:** Backend'de `WeatherForecast` domain entity'si yeni (opsiyonel, geriye donuk uyumlu) alanlarla genisler; `OpenMeteoProvider` tek forecast cagrisina `daily`/`current` parametreleri ekler. Frontend'de mevcut tek `weather-search` bileseni, saf-fonksiyon bir tema servisi + 4 sunum bileseni (autocomplete, animasyonlu arka plan, hero, haftalik serit) + bunlari birlestiren bir `weather-dashboard` bilesenine bolunur. Dis gorsel/CDN kullanilmaz — tum animasyonlar CSS/SVG ile uretilir.

**Tech Stack:** ASP.NET Core / C# 10 (backend), Angular 20 standalone components + signals (frontend), xUnit + Moq (backend test), Angular/Vitest (frontend test).

## Global Constraints

- Backend API contract degisikligi **geriye donuk uyumlu** olmali — `WeatherForecast` constructor'ina eklenen yeni parametreler **opsiyonel** (varsayilan degerli) olacak, mevcut 4-parametreli cagrilar (test dosyalari dahil) degismeden derlenmeye devam edecek
- Dis gorsel/CDN/stok-foto kullanilmayacak — tum arka plan sahneleri CSS/SVG ile uretilecek (bkz. spec: `docs/superpowers/specs/2026-08-12-weather-ui-redesign-design.md`)
- 81 il, sabit bir TypeScript listesinden gelecek; sehir secimi **sadece** bu listeden yapilabilecek (serbest metin backend'e gonderilmeyecek)
- `prefers-reduced-motion: reduce` durumunda tum yeni animasyonlar devre disi kalacak

---

### Task 1: Backend — `DailyForecast` entity'si ve `WeatherForecast` genisletmesi

**Files:**
- Create: `backend/src/WeatherProject.Domain/Entities/DailyForecast.cs`
- Modify: `backend/src/WeatherProject.Domain/Entities/WeatherForecast.cs`
- Modify: `backend/tests/WeatherProject.Domain.Tests/WeatherForecastTests.cs`

**Interfaces:**
- Consumes: yok (Domain katmaninin en alt seviyesi)
- Produces: `DailyForecast(DateTime date, int weatherCode, double tempMaxCelsius, double tempMinCelsius)`; `WeatherForecast` constructor'ina eklenen opsiyonel parametreler: `int weatherCode = 0, bool isDay = true, double windSpeedKmh = 0, double humidityPercent = 0, IReadOnlyList<DailyForecast>? daily = null`; yeni salt-okunur property'ler: `WeatherCode`, `IsDay`, `WindSpeedKmh`, `HumidityPercent`, `Daily` (`IReadOnlyList<DailyForecast>`, `daily` null ise bos liste). Task 2 (Infrastructure) bu constructor'i ve tipleri kullanacak.

- [ ] **Step 1: `DailyForecast` icin basarisiz testi yaz**

`backend/tests/WeatherProject.Domain.Tests/WeatherForecastTests.cs` dosyasinin **en ustune**, mevcut `using` satirlarindan sonra, mevcut testlerin **altina** ekle:

```csharp
[Fact]
public void Constructor_WithExtendedData_SetsNewProperties()
{
    var daily = new List<DailyForecast>
    {
        new DailyForecast(new DateTime(2026, 8, 13), 1, 30.0, 20.0)
    };

    var forecast = new WeatherForecast(
        "Istanbul", DateTime.Today, 28.5, "Clear",
        weatherCode: 0, isDay: true, windSpeedKmh: 12.5, humidityPercent: 55, daily: daily);

    Assert.Equal(0, forecast.WeatherCode);
    Assert.True(forecast.IsDay);
    Assert.Equal(12.5, forecast.WindSpeedKmh);
    Assert.Equal(55, forecast.HumidityPercent);
    Assert.Single(forecast.Daily);
    Assert.Equal(1, forecast.Daily[0].WeatherCode);
    Assert.Equal(30.0, forecast.Daily[0].TempMaxCelsius);
    Assert.Equal(20.0, forecast.Daily[0].TempMinCelsius);
}

[Fact]
public void Constructor_WithoutOptionalParams_DefaultsToEmptyDailyAndSensibleDefaults()
{
    var forecast = new WeatherForecast("Istanbul", DateTime.Today, 28.5, "Clear");

    Assert.Empty(forecast.Daily);
    Assert.Equal(0, forecast.WeatherCode);
    Assert.True(forecast.IsDay);
}
```

- [ ] **Step 2: Testin derlenmedigini (basarisiz oldugunu) dogrula**

Run: `dotnet test backend/tests/WeatherProject.Domain.Tests --filter Constructor_WithExtendedData_SetsNewProperties`
Expected: derleme hatasi — `DailyForecast` turu bulunamiyor, `WeatherForecast` yeni parametreleri kabul etmiyor.

- [ ] **Step 3: `DailyForecast` entity'sini olustur**

```csharp
// backend/src/WeatherProject.Domain/Entities/DailyForecast.cs
namespace WeatherProject.Domain.Entities;

public class DailyForecast
{
    public DateTime Date { get; }
    public int WeatherCode { get; }
    public double TempMaxCelsius { get; }
    public double TempMinCelsius { get; }

    public DailyForecast(DateTime date, int weatherCode, double tempMaxCelsius, double tempMinCelsius)
    {
        Date = date;
        WeatherCode = weatherCode;
        TempMaxCelsius = tempMaxCelsius;
        TempMinCelsius = tempMinCelsius;
    }
}
```

- [ ] **Step 4: `WeatherForecast`'i genislet**

`backend/src/WeatherProject.Domain/Entities/WeatherForecast.cs` dosyasinin tamamini degistir:

```csharp
namespace WeatherProject.Domain.Entities;

public class WeatherForecast
{
    public string CityName { get; }
    public DateTime Date { get; }
    public double TemperatureCelsius { get; }
    public string Description { get; }
    public int WeatherCode { get; }
    public bool IsDay { get; }
    public double WindSpeedKmh { get; }
    public double HumidityPercent { get; }
    public IReadOnlyList<DailyForecast> Daily { get; }

    public WeatherForecast(
        string cityName,
        DateTime date,
        double temperatureCelsius,
        string description,
        int weatherCode = 0,
        bool isDay = true,
        double windSpeedKmh = 0,
        double humidityPercent = 0,
        IReadOnlyList<DailyForecast>? daily = null)
    {
        if (string.IsNullOrWhiteSpace(cityName))
            throw new ArgumentException("City name cannot be empty.", nameof(cityName));

        CityName = cityName;
        Date = date;
        TemperatureCelsius = temperatureCelsius;
        Description = description ?? string.Empty;
        WeatherCode = weatherCode;
        IsDay = isDay;
        WindSpeedKmh = windSpeedKmh;
        HumidityPercent = humidityPercent;
        Daily = daily ?? Array.Empty<DailyForecast>();
    }
}
```

- [ ] **Step 5: Testleri calistir, gecmesini dogrula**

Run: `dotnet test backend/tests/WeatherProject.Domain.Tests`
Expected: tum testler (yeni ikisi dahil, eski `Constructor_WithValidData_SetsAllProperties` ve `Constructor_WithInvalidCityName_ThrowsArgumentException` dahil) PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/WeatherProject.Domain/Entities/DailyForecast.cs backend/src/WeatherProject.Domain/Entities/WeatherForecast.cs backend/tests/WeatherProject.Domain.Tests/WeatherForecastTests.cs
git commit -m "feat(domain): WeatherForecast'e gunluk tahmin/ruzgar/nem/gunduz-gece alanlari ekle"
```

---

### Task 2: Backend — Cache DTO, `OpenMeteoProvider` genisletmesi ve Turkce arama guvenlik agi

**Files:**
- Modify: `backend/src/WeatherProject.Infrastructure/Caching/WeatherForecastDto.cs`
- Modify: `backend/tests/WeatherProject.Infrastructure.Tests/RedisWeatherCacheRepositoryTests.cs`
- Modify: `backend/src/WeatherProject.Infrastructure/ExternalApis/OpenMeteoProvider.cs`
- Modify: `backend/tests/WeatherProject.Infrastructure.Tests/OpenMeteoProviderTests.cs`

**Interfaces:**
- Consumes: `WeatherForecast`/`DailyForecast` (Task 1)
- Produces: `OpenMeteoProvider.GetCurrentWeatherAsync` artik doldurulmus `WeatherCode`/`IsDay`/`WindSpeedKmh`/`HumidityPercent`/`Daily` alanlariyla donuyor; geocoding basarisiz olursa Turkce karakterleri sadelestirip bir kez daha deniyor. Task 9'daki manuel dogrulama bu davranisi kullanacak.

- [ ] **Step 1: Cache round-trip icin basarisiz testi yaz**

`backend/tests/WeatherProject.Infrastructure.Tests/RedisWeatherCacheRepositoryTests.cs` dosyasindaki mevcut testlerin altina ekle:

```csharp
[Fact]
public async Task SetAsync_ThenGetAsync_PreservesExtendedFields()
{
    var cache = CreateInMemoryDistributedCache();
    var repository = new RedisWeatherCacheRepository(cache);
    var daily = new List<DailyForecast> { new DailyForecast(new DateTime(2026, 8, 13), 1, 30.0, 20.0) };
    var forecast = new WeatherForecast(
        "Izmir", new DateTime(2026, 7, 28), 27.0, "Sunny",
        weatherCode: 0, isDay: true, windSpeedKmh: 15.0, humidityPercent: 40, daily: daily);

    await repository.SetAsync("Izmir", forecast, TimeSpan.FromMinutes(5), CancellationToken.None);
    var result = await repository.GetAsync("Izmir", CancellationToken.None);

    Assert.NotNull(result);
    Assert.Equal(0, result!.WeatherCode);
    Assert.True(result.IsDay);
    Assert.Equal(15.0, result.WindSpeedKmh);
    Assert.Equal(40, result.HumidityPercent);
    Assert.Single(result.Daily);
    Assert.Equal(30.0, result.Daily[0].TempMaxCelsius);
}
```

- [ ] **Step 2: Testin basarisiz oldugunu dogrula**

Run: `dotnet test backend/tests/WeatherProject.Infrastructure.Tests --filter SetAsync_ThenGetAsync_PreservesExtendedFields`
Expected: FAIL — `result.WeatherCode` her zaman `0` cikar ama asil sebep `result.Daily` bos donuyor olmasi (DTO yeni alanlari tasimiyor), assertion `Assert.Single(result.Daily)` basarisiz olur.

- [ ] **Step 3: `WeatherForecastDto`'yu genislet**

`backend/src/WeatherProject.Infrastructure/Caching/WeatherForecastDto.cs` dosyasinin tamamini degistir:

```csharp
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Caching;

internal class WeatherForecastDto
{
    public string CityName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double TemperatureCelsius { get; set; }
    public string Description { get; set; } = string.Empty;
    public int WeatherCode { get; set; }
    public bool IsDay { get; set; }
    public double WindSpeedKmh { get; set; }
    public double HumidityPercent { get; set; }
    public List<DailyForecast> Daily { get; set; } = new();

    public static WeatherForecastDto FromDomain(WeatherForecast forecast) => new()
    {
        CityName = forecast.CityName,
        Date = forecast.Date,
        TemperatureCelsius = forecast.TemperatureCelsius,
        Description = forecast.Description,
        WeatherCode = forecast.WeatherCode,
        IsDay = forecast.IsDay,
        WindSpeedKmh = forecast.WindSpeedKmh,
        HumidityPercent = forecast.HumidityPercent,
        Daily = forecast.Daily.ToList()
    };

    public WeatherForecast ToDomain() => new(
        CityName, Date, TemperatureCelsius, Description,
        WeatherCode, IsDay, WindSpeedKmh, HumidityPercent, Daily);
}
```

- [ ] **Step 4: Cache testini calistir, gectigini dogrula**

Run: `dotnet test backend/tests/WeatherProject.Infrastructure.Tests --filter SetAsync_ThenGetAsync_PreservesExtendedFields`
Expected: PASS.

- [ ] **Step 5: `OpenMeteoProvider` icin basarisiz testleri yaz**

`backend/tests/WeatherProject.Infrastructure.Tests/OpenMeteoProviderTests.cs` dosyasinin tamamini degistir:

```csharp
using System.Net;
using Microsoft.Extensions.Options;
using WeatherProject.Infrastructure.ExternalApis;
using Xunit;

namespace WeatherProject.Infrastructure.Tests;

public class OpenMeteoProviderTests
{
    private const string GeocodingResponseJson = """
    {
      "results": [ { "name": "Istanbul", "latitude": 41.0138, "longitude": 28.9497 } ]
    }
    """;

    private const string EmptyGeocodingResponseJson = """
    { "results": [] }
    """;

    private const string ForecastResponseJson = """
    {
      "current": {
        "temperature_2m": 24.7,
        "weather_code": 0,
        "is_day": 1,
        "wind_speed_10m": 12.5,
        "relative_humidity_2m": 55
      },
      "daily": {
        "time": ["2026-08-12", "2026-08-13"],
        "weather_code": [0, 61],
        "temperature_2m_max": [30.1, 26.4],
        "temperature_2m_min": [20.2, 19.8]
      }
    }
    """;

    [Fact]
    public async Task GetCurrentWeatherAsync_WithValidCity_MapsToWeatherForecast()
    {
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, GeocodingResponseJson),
            (HttpStatusCode.OK, ForecastResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Istanbul", CancellationToken.None);

        Assert.Equal("Istanbul", forecast.CityName);
        Assert.Equal(24.7, forecast.TemperatureCelsius);
        Assert.Equal("clear sky", forecast.Description);
        Assert.Equal(0, forecast.WeatherCode);
        Assert.True(forecast.IsDay);
        Assert.Equal(12.5, forecast.WindSpeedKmh);
        Assert.Equal(55, forecast.HumidityPercent);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithValidCity_MapsDailyForecasts()
    {
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, GeocodingResponseJson),
            (HttpStatusCode.OK, ForecastResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Istanbul", CancellationToken.None);

        Assert.Equal(2, forecast.Daily.Count);
        Assert.Equal(61, forecast.Daily[1].WeatherCode);
        Assert.Equal(26.4, forecast.Daily[1].TempMaxCelsius);
        Assert.Equal(19.8, forecast.Daily[1].TempMinCelsius);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithUnknownCity_ThrowsHttpRequestException()
    {
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, EmptyGeocodingResponseJson),
            (HttpStatusCode.OK, EmptyGeocodingResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        await Assert.ThrowsAsync<HttpRequestException>(
            () => provider.GetCurrentWeatherAsync("UnknownCity", CancellationToken.None));
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WhenFirstGeocodeEmpty_RetriesWithNormalizedTurkishCharacters()
    {
        // Ilk deneme ("İstanbul", noktali buyuk İ ile) bos donuyor,
        // ikinci deneme (sadelestirilmis "Istanbul") basariyla eslesiyor.
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, EmptyGeocodingResponseJson),
            (HttpStatusCode.OK, GeocodingResponseJson),
            (HttpStatusCode.OK, ForecastResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("İstanbul", CancellationToken.None);

        Assert.Equal("İstanbul", forecast.CityName);
    }
}
```

- [ ] **Step 6: Testlerin derlenmedigini/basarisiz oldugunu dogrula**

Run: `dotnet test backend/tests/WeatherProject.Infrastructure.Tests --filter OpenMeteoProviderTests`
Expected: FAIL — `forecast.WeatherCode`, `forecast.IsDay`, `forecast.Daily` gibi alanlar henuz doldurulmuyor; "retries with normalized" testi 3 istek beklerken provider sadece 2 (ya da hic) istek atiyor, `SequentialFakeHttpMessageHandler` kuyrugu bosalir ve `InvalidOperationException` (Dequeue on empty queue) firlatir.

- [ ] **Step 7: `OpenMeteoProvider`'i genislet**

`backend/src/WeatherProject.Infrastructure/ExternalApis/OpenMeteoProvider.cs` dosyasinin tamamini degistir:

```csharp
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.ExternalApis;

public class OpenMeteoProvider : IWeatherProvider
{
    // WMO weather interpretation codes: https://open-meteo.com/en/docs
    private static readonly Dictionary<int, string> WeatherCodeDescriptions = new()
    {
        [0] = "clear sky",
        [1] = "mainly clear",
        [2] = "partly cloudy",
        [3] = "overcast",
        [45] = "fog",
        [48] = "depositing rime fog",
        [51] = "light drizzle",
        [53] = "moderate drizzle",
        [55] = "dense drizzle",
        [61] = "slight rain",
        [63] = "moderate rain",
        [65] = "heavy rain",
        [71] = "slight snow fall",
        [73] = "moderate snow fall",
        [75] = "heavy snow fall",
        [80] = "slight rain showers",
        [81] = "moderate rain showers",
        [82] = "violent rain showers",
        [95] = "thunderstorm",
        [96] = "thunderstorm with slight hail",
        [99] = "thunderstorm with heavy hail",
    };

    private static readonly Dictionary<char, char> TurkishToAsciiMap = new()
    {
        ['İ'] = 'I', ['ı'] = 'i', ['Ğ'] = 'G', ['ğ'] = 'g',
        ['Ş'] = 'S', ['ş'] = 's', ['Ç'] = 'C', ['ç'] = 'c',
        ['Ö'] = 'O', ['ö'] = 'o', ['Ü'] = 'U', ['ü'] = 'u',
    };

    private readonly HttpClient _httpClient;
    private readonly OpenMeteoOptions _options;

    public OpenMeteoProvider(HttpClient httpClient, IOptions<OpenMeteoOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<WeatherForecast> GetCurrentWeatherAsync(string cityName, CancellationToken cancellationToken)
    {
        var (latitude, longitude) = await GeocodeAsync(cityName, cancellationToken);

        var forecastUri =
            $"{_options.ForecastBaseUrl}/v1/forecast?latitude={latitude}&longitude={longitude}" +
            "&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m" +
            "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
            "&forecast_days=7&timezone=auto";
        var response = await _httpClient.GetAsync(forecastUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var current = root.GetProperty("current");

        var temperature = current.GetProperty("temperature_2m").GetDouble();
        var weatherCode = current.GetProperty("weather_code").GetInt32();
        var isDay = current.GetProperty("is_day").GetInt32() == 1;
        var windSpeed = current.GetProperty("wind_speed_10m").GetDouble();
        var humidity = current.GetProperty("relative_humidity_2m").GetDouble();
        var description = WeatherCodeDescriptions.GetValueOrDefault(weatherCode, "unknown");
        var daily = ParseDailyForecasts(root.GetProperty("daily"));

        return new WeatherForecast(
            cityName, DateTime.UtcNow, temperature, description,
            weatherCode, isDay, windSpeed, humidity, daily);
    }

    private static List<DailyForecast> ParseDailyForecasts(JsonElement daily)
    {
        var dates = daily.GetProperty("time");
        var codes = daily.GetProperty("weather_code");
        var maxTemps = daily.GetProperty("temperature_2m_max");
        var minTemps = daily.GetProperty("temperature_2m_min");

        var result = new List<DailyForecast>();
        for (var i = 0; i < dates.GetArrayLength(); i++)
        {
            result.Add(new DailyForecast(
                DateTime.Parse(dates[i].GetString()!),
                codes[i].GetInt32(),
                maxTemps[i].GetDouble(),
                minTemps[i].GetDouble()));
        }
        return result;
    }

    private async Task<(double Latitude, double Longitude)> GeocodeAsync(string cityName, CancellationToken cancellationToken)
    {
        var result = await TryGeocodeAsync(cityName, cancellationToken);
        if (result is not null)
            return result.Value;

        var normalized = NormalizeTurkishCharacters(cityName);
        if (normalized != cityName)
        {
            result = await TryGeocodeAsync(normalized, cancellationToken);
            if (result is not null)
                return result.Value;
        }

        throw new HttpRequestException($"City '{cityName}' not found.", null, HttpStatusCode.NotFound);
    }

    private async Task<(double Latitude, double Longitude)?> TryGeocodeAsync(string cityName, CancellationToken cancellationToken)
    {
        var geocodeUri = $"{_options.GeocodingBaseUrl}/v1/search?name={Uri.EscapeDataString(cityName)}&count=1&format=json";
        var response = await _httpClient.GetAsync(geocodeUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);

        if (!document.RootElement.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
            return null;

        var first = results[0];
        return (first.GetProperty("latitude").GetDouble(), first.GetProperty("longitude").GetDouble());
    }

    private static string NormalizeTurkishCharacters(string input)
    {
        var chars = input.Select(c => TurkishToAsciiMap.TryGetValue(c, out var replacement) ? replacement : c).ToArray();
        return new string(chars);
    }
}
```

- [ ] **Step 8: Testleri calistir, gectigini dogrula**

Run: `dotnet test backend/tests/WeatherProject.Infrastructure.Tests`
Expected: tum testler PASS (yeni 4 test + degismeyen digerleri).

- [ ] **Step 9: Butun backend test suite'ini calistir**

Run: `dotnet test backend/WeatherProject.sln`
Expected: tum projeler (Domain, Application, Infrastructure, Api) PASS — Task 1'deki Domain degisikligi ve bu task'taki Infrastructure/Cache degisikligi hicbir mevcut testi bozmamis olmali.

- [ ] **Step 10: Commit**

```bash
git add backend/src/WeatherProject.Infrastructure/Caching/WeatherForecastDto.cs backend/tests/WeatherProject.Infrastructure.Tests/RedisWeatherCacheRepositoryTests.cs backend/src/WeatherProject.Infrastructure/ExternalApis/OpenMeteoProvider.cs backend/tests/WeatherProject.Infrastructure.Tests/OpenMeteoProviderTests.cs
git commit -m "feat(backend): 7 gunluk tahmin + ruzgar/nem/gunduz-gece + Turkce arama guvenlik agi"
```

---

### Task 3: Frontend — Model genisletmesi ve saf tema eslestirme servisi

**Files:**
- Modify: `frontend/src/app/core/models/weather-forecast.model.ts`
- Create: `frontend/src/app/core/services/weather-theme.service.ts`
- Create: `frontend/src/app/core/services/weather-theme.service.spec.ts`

**Interfaces:**
- Consumes: yok (saf fonksiyon, hicbir servise/HTTP'ye bagimli degil)
- Produces: `WeatherForecast` arayuzune eklenen alanlar (`weatherCode: number`, `isDay: boolean`, `windSpeedKmh: number`, `humidityPercent: number`, `daily: DailyForecast[]`); `DailyForecast` arayuzu; `resolveWeatherTheme(weatherCode: number, isDay: boolean): WeatherTheme` fonksiyonu ve `WeatherTheme`/`WeatherCategory`/`ParticleType` tipleri. Task 4-7'deki tum bilesenler bu fonksiyonu ve tipleri kullanacak.

- [ ] **Step 1: Modeli genislet**

`frontend/src/app/core/models/weather-forecast.model.ts` dosyasinin tamamini degistir:

```typescript
export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMaxCelsius: number;
  tempMinCelsius: number;
}

export interface WeatherForecast {
  cityName: string;
  date: string;
  temperatureCelsius: number;
  description: string;
  weatherCode: number;
  isDay: boolean;
  windSpeedKmh: number;
  humidityPercent: number;
  daily: DailyForecast[];
}
```

- [ ] **Step 2: Tema servisi icin basarisiz testleri yaz**

```typescript
// frontend/src/app/core/services/weather-theme.service.spec.ts
import { resolveWeatherTheme } from './weather-theme.service';

describe('resolveWeatherTheme', () => {
  it('maps clear-sky code (0) with isDay true to clear/day/sun-rays', () => {
    const theme = resolveWeatherTheme(0, true);
    expect(theme.category).toBe('clear');
    expect(theme.particle).toBe('sun-rays');
    expect(theme.headlineTr).toBe('Acik');
  });

  it('maps clear-sky code (1) with isDay false to clear/night/stars', () => {
    const theme = resolveWeatherTheme(1, false);
    expect(theme.category).toBe('clear');
    expect(theme.particle).toBe('stars');
  });

  it('maps all rain codes to the rain category with rain particle', () => {
    for (const code of [61, 63, 65, 80, 81, 82]) {
      const theme = resolveWeatherTheme(code, true);
      expect(theme.category).toBe('rain');
      expect(theme.particle).toBe('rain');
    }
  });

  it('maps snow codes to the snow category with snow particle', () => {
    const theme = resolveWeatherTheme(71, true);
    expect(theme.category).toBe('snow');
    expect(theme.particle).toBe('snow');
  });

  it('maps thunderstorm codes to the storm category with lightning particle', () => {
    for (const code of [95, 96, 99]) {
      const theme = resolveWeatherTheme(code, true);
      expect(theme.category).toBe('storm');
      expect(theme.particle).toBe('lightning');
    }
  });

  it('falls back to cloudy for an unrecognized code', () => {
    expect(resolveWeatherTheme(999, true).category).toBe('cloudy');
  });

  it('produces a different skyGradient for day vs night of the same category', () => {
    const day = resolveWeatherTheme(2, true);
    const night = resolveWeatherTheme(2, false);
    expect(day.skyGradient).not.toBe(night.skyGradient);
  });
});
```

- [ ] **Step 3: Testlerin basarisiz oldugunu dogrula**

Run: `cd frontend && npm test`
Expected: FAIL — `weather-theme.service` modulu bulunamiyor.

- [ ] **Step 4: `weather-theme.service.ts`'i yaz**

```typescript
// frontend/src/app/core/services/weather-theme.service.ts
export type WeatherCategory = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export type ParticleType = 'rain' | 'snow' | 'clouds' | 'sun-rays' | 'stars' | 'fog-bands' | 'lightning';

export interface WeatherTheme {
  category: WeatherCategory;
  isDay: boolean;
  skyGradient: string;
  particle: ParticleType;
  headlineTr: string;
}

const CATEGORY_BY_CODE: Record<number, WeatherCategory> = {
  0: 'clear', 1: 'clear',
  2: 'cloudy', 3: 'cloudy',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 80: 'rain', 81: 'rain', 82: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
};

const HEADLINE_TR: Record<WeatherCategory, string> = {
  clear: 'Acik',
  cloudy: 'Bulutlu',
  fog: 'Sisli',
  drizzle: 'Ciseleyen yagmurlu',
  rain: 'Yagmurlu',
  snow: 'Karli',
  storm: 'Firtinali',
};

const PARTICLE_BY_CATEGORY: Partial<Record<WeatherCategory, ParticleType>> = {
  cloudy: 'clouds',
  fog: 'fog-bands',
  drizzle: 'rain',
  rain: 'rain',
  snow: 'snow',
  storm: 'lightning',
};

const SKY_GRADIENTS: Record<WeatherCategory, { day: string; night: string }> = {
  clear: {
    day: 'linear-gradient(180deg, #4a90d9 0%, #a8d4f0 60%, #e8f4fb 100%)',
    night: 'linear-gradient(180deg, #0b1026 0%, #1a2456 55%, #2c3a6b 100%)',
  },
  cloudy: {
    day: 'linear-gradient(180deg, #7c8a9a 0%, #a7b3bf 55%, #cdd5db 100%)',
    night: 'linear-gradient(180deg, #1c222c 0%, #2c3440 55%, #3a4451 100%)',
  },
  fog: {
    day: 'linear-gradient(180deg, #9aa3a8 0%, #c3cacd 60%, #dfe4e6 100%)',
    night: 'linear-gradient(180deg, #22262a 0%, #383e42 60%, #4c5257 100%)',
  },
  drizzle: {
    day: 'linear-gradient(180deg, #5f7180 0%, #8a9aa6 55%, #b6c2ca 100%)',
    night: 'linear-gradient(180deg, #141a20 0%, #232c34 55%, #333e47 100%)',
  },
  rain: {
    day: 'linear-gradient(180deg, #445566 0%, #6b7d8c 55%, #98a8b3 100%)',
    night: 'linear-gradient(180deg, #0e1318 0%, #1c242c 55%, #2a333c 100%)',
  },
  snow: {
    day: 'linear-gradient(180deg, #93a5b8 0%, #c9d6e0 55%, #eef3f6 100%)',
    night: 'linear-gradient(180deg, #1a2028 0%, #2c3542 55%, #414f5e 100%)',
  },
  storm: {
    day: 'linear-gradient(180deg, #232b34 0%, #3d4a56 55%, #5c6b78 100%)',
    night: 'linear-gradient(180deg, #05070a 0%, #10151c 55%, #1c232c 100%)',
  },
};

export function resolveWeatherTheme(weatherCode: number, isDay: boolean): WeatherTheme {
  const category = CATEGORY_BY_CODE[weatherCode] ?? 'cloudy';
  const particle: ParticleType =
    category === 'clear' ? (isDay ? 'sun-rays' : 'stars') : (PARTICLE_BY_CATEGORY[category] as ParticleType);

  return {
    category,
    isDay,
    skyGradient: isDay ? SKY_GRADIENTS[category].day : SKY_GRADIENTS[category].night,
    particle,
    headlineTr: HEADLINE_TR[category],
  };
}
```

- [ ] **Step 5: Testleri calistir, gectigini dogrula**

Run: `cd frontend && npm test`
Expected: tum `resolveWeatherTheme` testleri PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/models/weather-forecast.model.ts frontend/src/app/core/services/weather-theme.service.ts frontend/src/app/core/services/weather-theme.service.spec.ts
git commit -m "feat(frontend): WeatherForecast modelini genislet, saf tema eslestirme servisi ekle"
```

---

### Task 4: Frontend — 81 il listesi ve `city-autocomplete` bileseni

**Files:**
- Create: `frontend/src/app/core/data/turkish-provinces.ts`
- Create: `frontend/src/app/components/city-autocomplete/city-autocomplete.component.ts`
- Create: `frontend/src/app/components/city-autocomplete/city-autocomplete.component.html`
- Create: `frontend/src/app/components/city-autocomplete/city-autocomplete.component.scss`
- Create: `frontend/src/app/components/city-autocomplete/city-autocomplete.component.spec.ts`

**Interfaces:**
- Consumes: yok
- Produces: `TURKISH_PROVINCES: readonly string[]` (81 eleman); `CityAutocompleteComponent` — `output<string>() citySelected` (secilen il adini birebir yayar). Task 7 (`weather-dashboard`) bu bileseni `(citySelected)` ile dinleyecek.

- [ ] **Step 1: 81 il listesini olustur**

```typescript
// frontend/src/app/core/data/turkish-provinces.ts
export const TURKISH_PROVINCES: readonly string[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara',
  'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman',
  'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne',
  'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun',
  'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir',
  'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri',
  'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya',
  'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun',
  'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat',
  'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
] as const;
```

- [ ] **Step 2: Autocomplete bileseni icin basarisiz testleri yaz**

```typescript
// frontend/src/app/components/city-autocomplete/city-autocomplete.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CityAutocompleteComponent } from './city-autocomplete.component';

describe('CityAutocompleteComponent', () => {
  let fixture: ComponentFixture<CityAutocompleteComponent>;
  let component: CityAutocompleteComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CityAutocompleteComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CityAutocompleteComponent);
    component = fixture.componentInstance;
  });

  it('shows no suggestions for an empty query', () => {
    component.query = '';
    expect(component.suggestions()).toEqual([]);
  });

  it('filters provinces by prefix, case-insensitively', () => {
    component.query = 'ist';
    expect(component.suggestions()).toContain('İstanbul');
  });

  it('matches Turkish dotted capital İ correctly against a plain "i" query', () => {
    component.query = 'izm';
    expect(component.suggestions()).toContain('İzmir');
  });

  it('emits citySelected with the exact province name on select()', () => {
    let selected: string | undefined;
    component.citySelected.subscribe((value) => (selected = value));

    component.select('Ankara');

    expect(selected).toBe('Ankara');
    expect(component.query).toBe('Ankara');
  });

  it('selects the highlighted suggestion when Enter is pressed', () => {
    component.query = 'ada';
    component.onInput();
    component.activeIndex.set(0);
    let selected: string | undefined;
    component.citySelected.subscribe((value) => (selected = value));

    component.onEnter(new KeyboardEvent('keydown'));

    expect(selected).toBe(component.suggestions()[0]);
  });
});
```

- [ ] **Step 3: Testlerin basarisiz oldugunu dogrula**

Run: `cd frontend && npm test`
Expected: FAIL — `city-autocomplete.component` modulu bulunamiyor.

- [ ] **Step 4: Bileseni yaz**

```typescript
// frontend/src/app/components/city-autocomplete/city-autocomplete.component.ts
import { Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TURKISH_PROVINCES } from '../../core/data/turkish-provinces';

@Component({
  selector: 'app-city-autocomplete',
  imports: [FormsModule],
  templateUrl: './city-autocomplete.component.html',
  styleUrl: './city-autocomplete.component.scss',
})
export class CityAutocompleteComponent {
  readonly citySelected = output<string>();

  query = '';
  readonly isOpen = signal(false);
  readonly activeIndex = signal(-1);

  readonly suggestions = computed(() => {
    const q = this.query.trim().toLocaleLowerCase('tr');
    if (!q) return [] as string[];
    return TURKISH_PROVINCES.filter((city) => city.toLocaleLowerCase('tr').startsWith(q)).slice(0, 8);
  });

  onInput(): void {
    this.isOpen.set(true);
    this.activeIndex.set(-1);
  }

  onArrowDown(event: Event): void {
    event.preventDefault();
    const max = this.suggestions().length - 1;
    this.activeIndex.set(Math.min(this.activeIndex() + 1, max));
  }

  onArrowUp(event: Event): void {
    event.preventDefault();
    this.activeIndex.set(Math.max(this.activeIndex() - 1, -1));
  }

  onEnter(event: Event): void {
    const index = this.activeIndex();
    const options = this.suggestions();
    if (index >= 0 && index < options.length) {
      event.preventDefault();
      this.select(options[index]);
      return;
    }

    const exact = TURKISH_PROVINCES.find(
      (city) => city.toLocaleLowerCase('tr') === this.query.trim().toLocaleLowerCase('tr'),
    );
    if (exact) {
      this.select(exact);
    }
  }

  select(city: string): void {
    this.query = city;
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.citySelected.emit(city);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
```

```html
<!-- frontend/src/app/components/city-autocomplete/city-autocomplete.component.html -->
<div class="autocomplete">
  <input
    class="autocomplete__input"
    type="text"
    [(ngModel)]="query"
    (input)="onInput()"
    (keydown.ArrowDown)="onArrowDown($event)"
    (keydown.ArrowUp)="onArrowUp($event)"
    (keydown.Enter)="onEnter($event)"
    (blur)="close()"
    placeholder="Bir il yazin..."
    autocomplete="off"
    role="combobox"
    aria-autocomplete="list"
    [attr.aria-expanded]="isOpen()"
  />
  @if (isOpen() && suggestions().length > 0) {
    <ul class="autocomplete__list" role="listbox">
      @for (city of suggestions(); track city; let i = $index) {
        <li
          class="autocomplete__option"
          [class.autocomplete__option--active]="i === activeIndex()"
          role="option"
          [attr.aria-selected]="i === activeIndex()"
          (mousedown)="select(city)"
        >
          {{ city }}
        </li>
      }
    </ul>
  }
</div>
```

```scss
// frontend/src/app/components/city-autocomplete/city-autocomplete.component.scss
.autocomplete {
  position: relative;
  width: 100%;
}

.autocomplete__input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
  color: #fff;
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 1rem;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.65);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
}

.autocomplete__list {
  position: absolute;
  top: calc(100% + 0.375rem);
  left: 0;
  right: 0;
  margin: 0;
  padding: 0.375rem;
  list-style: none;
  background: rgba(12, 16, 22, 0.9);
  backdrop-filter: blur(14px);
  border-radius: 0.75rem;
  max-height: 16rem;
  overflow-y: auto;
  z-index: 10;
}

.autocomplete__option {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  color: #fff;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  cursor: pointer;

  &--active,
  &:hover {
    background: rgba(255, 255, 255, 0.16);
  }
}
```

- [ ] **Step 5: Testleri calistir, gectigini dogrula**

Run: `cd frontend && npm test`
Expected: tum `CityAutocompleteComponent` testleri PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/data/turkish-provinces.ts frontend/src/app/components/city-autocomplete/
git commit -m "feat(frontend): 81 il autocomplete bileseni"
```

---

### Task 5: Frontend — `animated-background` bileseni (CSS-generative sahneler)

**Files:**
- Create: `frontend/src/app/components/animated-background/animated-background.component.ts`
- Create: `frontend/src/app/components/animated-background/animated-background.component.html`
- Create: `frontend/src/app/components/animated-background/animated-background.component.scss`
- Create: `frontend/src/app/components/animated-background/animated-background.component.spec.ts`

**Interfaces:**
- Consumes: `WeatherTheme` (Task 3)
- Produces: `AnimatedBackgroundComponent` — `input.required<WeatherTheme>() theme`. Task 7 bu bileseni `[theme]` ile besleyecek.

- [ ] **Step 1: Basarisiz testi yaz**

```typescript
// frontend/src/app/components/animated-background/animated-background.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnimatedBackgroundComponent } from './animated-background.component';
import { WeatherTheme } from '../../core/services/weather-theme.service';

describe('AnimatedBackgroundComponent', () => {
  let fixture: ComponentFixture<AnimatedBackgroundComponent>;

  const theme: WeatherTheme = {
    category: 'rain',
    isDay: true,
    skyGradient: 'linear-gradient(180deg, #445566 0%, #6b7d8c 55%, #98a8b3 100%)',
    particle: 'rain',
    headlineTr: 'Yagmurlu',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimatedBackgroundComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AnimatedBackgroundComponent);
    fixture.componentRef.setInput('theme', theme);
    fixture.detectChanges();
  });

  it('renders a particle layer with the matching data-particle attribute', () => {
    const el: HTMLElement = fixture.nativeElement;
    const particleLayer = el.querySelector('[data-particle]');
    expect(particleLayer?.getAttribute('data-particle')).toBe('rain');
  });

  it('applies the theme skyGradient as the scene background', () => {
    const el: HTMLElement = fixture.nativeElement;
    const scene = el.querySelector('.scene') as HTMLElement;
    expect(scene.style.background).toContain('linear-gradient');
  });
});
```

- [ ] **Step 2: Testin basarisiz oldugunu dogrula**

Run: `cd frontend && npm test`
Expected: FAIL — `animated-background.component` modulu bulunamiyor.

- [ ] **Step 3: Bileseni yaz**

```typescript
// frontend/src/app/components/animated-background/animated-background.component.ts
import { Component, computed, input } from '@angular/core';
import { WeatherTheme } from '../../core/services/weather-theme.service';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrl: './animated-background.component.scss',
})
export class AnimatedBackgroundComponent {
  readonly theme = input.required<WeatherTheme>();

  readonly skyStyle = computed(() => ({ background: this.theme().skyGradient }));
}
```

```html
<!-- frontend/src/app/components/animated-background/animated-background.component.html -->
<div class="scene" [style]="skyStyle()">
  <div class="scene__particles" [attr.data-particle]="theme().particle"></div>
</div>
```

```scss
// frontend/src/app/components/animated-background/animated-background.component.scss
.scene {
  position: fixed;
  inset: 0;
  z-index: -1;
  transition: background 1.2s ease;
  overflow: hidden;
}

.scene__particles {
  position: absolute;
  inset: 0;
}

.scene__particles[data-particle='rain'],
.scene__particles[data-particle='lightning'] {
  background-image: repeating-linear-gradient(
    115deg,
    transparent 0 6px,
    rgba(255, 255, 255, 0.28) 6px 7px,
    transparent 7px 40px
  );
  background-size: 100% 200%;
  animation: rain-fall 0.6s linear infinite;
}

.scene__particles[data-particle='lightning'] {
  position: absolute;
  inset: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: #fff;
    opacity: 0;
    animation: lightning-flash 7s ease-in-out infinite;
  }
}

@keyframes rain-fall {
  from { background-position: 0 0; }
  to { background-position: 0 200px; }
}

@keyframes lightning-flash {
  0%, 92%, 100% { opacity: 0; }
  93% { opacity: 0.6; }
  94% { opacity: 0; }
  95% { opacity: 0.4; }
  96% { opacity: 0; }
}

.scene__particles[data-particle='snow'] {
  background-image:
    radial-gradient(circle, #fff 1px, transparent 1.5px),
    radial-gradient(circle, #fff 1px, transparent 1.5px),
    radial-gradient(circle, #fff 1.5px, transparent 2px);
  background-size: 120px 160px, 90px 130px, 160px 220px;
  background-position: 0 0, 40px 20px, 80px 60px;
  opacity: 0.85;
  animation: snow-fall 6s linear infinite;
}

@keyframes snow-fall {
  from { background-position: 0 0, 40px 20px, 80px 60px; }
  to { background-position: 0 400px, 40px 450px, 80px 500px; }
}

.scene__particles[data-particle='clouds'] {
  background-image:
    radial-gradient(ellipse 220px 70px at 20% 30%, rgba(255, 255, 255, 0.35), transparent 70%),
    radial-gradient(ellipse 300px 90px at 70% 55%, rgba(255, 255, 255, 0.25), transparent 70%),
    radial-gradient(ellipse 180px 60px at 45% 75%, rgba(255, 255, 255, 0.3), transparent 70%);
  filter: blur(6px);
  animation: clouds-drift 40s linear infinite;
}

@keyframes clouds-drift {
  from { background-position: 0 0, 0 0, 0 0; }
  to { background-position: 200px 0, -260px 0, 160px 0; }
}

.scene__particles[data-particle='sun-rays'] {
  background: conic-gradient(
    from 0deg at 80% 20%,
    rgba(255, 236, 179, 0.35) 0deg 8deg,
    transparent 8deg 24deg
  );
  animation: sun-spin 60s linear infinite, sun-pulse 4s ease-in-out infinite;
}

@keyframes sun-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes sun-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.scene__particles[data-particle='stars'] {
  background-image:
    radial-gradient(1px 1px at 10% 20%, #fff, transparent),
    radial-gradient(1px 1px at 30% 60%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 55% 15%, #fff, transparent),
    radial-gradient(1px 1px at 70% 80%, #fff, transparent),
    radial-gradient(1.5px 1.5px at 85% 35%, #fff, transparent),
    radial-gradient(1px 1px at 95% 65%, #fff, transparent);
  animation: stars-twinkle 3s ease-in-out infinite alternate;
}

@keyframes stars-twinkle {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

.scene__particles[data-particle='fog-bands'] {
  background-image: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.18) 0 20px,
    transparent 20px 90px
  );
  animation: fog-drift 20s linear infinite;
}

@keyframes fog-drift {
  from { transform: translateX(-10%); }
  to { transform: translateX(10%); }
}

@media (prefers-reduced-motion: reduce) {
  .scene__particles,
  .scene__particles[data-particle='lightning']::after {
    animation: none !important;
  }
}
```

- [ ] **Step 4: Testleri calistir, gectigini dogrula**

Run: `cd frontend && npm test`
Expected: `AnimatedBackgroundComponent` testleri PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/animated-background/
git commit -m "feat(frontend): CSS-generative animasyonlu arka plan bileseni"
```

---

### Task 6: Frontend — `weather-hero` ve `forecast-strip` bilesenleri

**Files:**
- Create: `frontend/src/app/components/weather-hero/weather-hero.component.ts`
- Create: `frontend/src/app/components/weather-hero/weather-hero.component.html`
- Create: `frontend/src/app/components/weather-hero/weather-hero.component.scss`
- Create: `frontend/src/app/components/forecast-strip/forecast-strip.component.ts`
- Create: `frontend/src/app/components/forecast-strip/forecast-strip.component.html`
- Create: `frontend/src/app/components/forecast-strip/forecast-strip.component.scss`
- Create: `frontend/src/app/components/forecast-strip/forecast-strip.component.spec.ts`

**Interfaces:**
- Consumes: `WeatherForecast`, `DailyForecast`, `WeatherTheme` (Task 3)
- Produces: `WeatherHeroComponent` — `input.required<WeatherForecast>() forecast`, `input.required<WeatherTheme>() theme`; `ForecastStripComponent` — `input.required<DailyForecast[]>() days`. Task 7 bu ikisini `weather-dashboard` sablonunda kullanacak.

- [ ] **Step 1: `weather-hero` bilesenini yaz (test gerektirmez — saf sunum, dogrudan input'lari gosterir)**

```typescript
// frontend/src/app/components/weather-hero/weather-hero.component.ts
import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { WeatherTheme } from '../../core/services/weather-theme.service';

@Component({
  selector: 'app-weather-hero',
  imports: [DecimalPipe],
  templateUrl: './weather-hero.component.html',
  styleUrl: './weather-hero.component.scss',
})
export class WeatherHeroComponent {
  readonly forecast = input.required<WeatherForecast>();
  readonly theme = input.required<WeatherTheme>();
}
```

```html
<!-- frontend/src/app/components/weather-hero/weather-hero.component.html -->
<div class="hero">
  <p class="hero__city">{{ forecast().cityName }}</p>
  <p class="hero__temp">{{ forecast().temperatureCelsius | number: '1.0-0' }}°</p>
  <h1 class="hero__headline">{{ theme().headlineTr }}</h1>
  <div class="hero__stats">
    <span class="hero__stat">
      <span class="hero__stat-label">Ruzgar</span>
      {{ forecast().windSpeedKmh | number: '1.0-0' }} km/s
    </span>
    <span class="hero__stat">
      <span class="hero__stat-label">Nem</span>
      %{{ forecast().humidityPercent | number: '1.0-0' }}
    </span>
  </div>
</div>
```

```scss
// frontend/src/app/components/weather-hero/weather-hero.component.scss
.hero {
  background: var(--color-glass-bg);
  backdrop-filter: blur(18px);
  border-radius: 1.25rem;
  padding: 2rem;
  color: var(--color-on-glass);
}

.hero__city {
  margin: 0 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-on-glass-muted);
}

.hero__temp {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 5rem;
  line-height: 1;
}

.hero__headline {
  margin: 0.5rem 0 1.25rem;
  font-family: var(--font-body);
  font-size: 1.5rem;
  font-weight: 600;
}

.hero__stats {
  display: flex;
  gap: 1.5rem;
}

.hero__stat {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--color-on-glass-muted);
}

.hero__stat-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.8;
}
```

- [ ] **Step 2: `forecast-strip` icin basarisiz testleri yaz**

```typescript
// frontend/src/app/components/forecast-strip/forecast-strip.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForecastStripComponent } from './forecast-strip.component';
import { DailyForecast } from '../../core/models/weather-forecast.model';

describe('ForecastStripComponent', () => {
  let fixture: ComponentFixture<ForecastStripComponent>;
  let component: ForecastStripComponent;

  const days: DailyForecast[] = [
    { date: '2026-08-12', weatherCode: 0, tempMaxCelsius: 30, tempMinCelsius: 20 },
    { date: '2026-08-13', weatherCode: 61, tempMaxCelsius: 26, tempMinCelsius: 19 },
    { date: '2026-08-14', weatherCode: 2, tempMaxCelsius: 28, tempMinCelsius: 18 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForecastStripComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ForecastStripComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('days', days);
  });

  it('produces one point per day', () => {
    expect(component.points().length).toBe(3);
  });

  it('gives the hottest day the smallest y (visually highest point)', () => {
    const points = component.points();
    const hottestPoint = points[0]; // 30° is the max
    const coolestPoint = points[1]; // 26° is the min
    expect(hottestPoint.y).toBeLessThan(coolestPoint.y);
  });

  it('builds an SVG path string starting with M and one L per remaining day', () => {
    const path = component.linePath();
    expect(path.startsWith('M ')).toBe(true);
    expect(path.match(/L /g)?.length).toBe(2);
  });

  it('returns an empty path when there are no days', () => {
    fixture.componentRef.setInput('days', []);
    expect(component.linePath()).toBe('');
    expect(component.points()).toEqual([]);
  });
});
```

- [ ] **Step 3: Testlerin basarisiz oldugunu dogrula**

Run: `cd frontend && npm test`
Expected: FAIL — `forecast-strip.component` modulu bulunamiyor.

- [ ] **Step 4: Bileseni yaz**

```typescript
// frontend/src/app/components/forecast-strip/forecast-strip.component.ts
import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DailyForecast } from '../../core/models/weather-forecast.model';

interface DayPoint {
  label: string;
  tempMax: number;
  tempMin: number;
  x: number;
  y: number;
}

const VIEW_WIDTH = 700;
const VIEW_HEIGHT = 60;

@Component({
  selector: 'app-forecast-strip',
  imports: [DecimalPipe],
  templateUrl: './forecast-strip.component.html',
  styleUrl: './forecast-strip.component.scss',
})
export class ForecastStripComponent {
  readonly days = input.required<DailyForecast[]>();

  readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

  readonly points = computed<DayPoint[]>(() => {
    const days = this.days();
    if (days.length === 0) return [];

    const maxes = days.map((d) => d.tempMaxCelsius);
    const highest = Math.max(...maxes);
    const lowest = Math.min(...maxes);
    const range = highest - lowest || 1;

    return days.map((d, i) => {
      const x = days.length === 1 ? 0 : (i / (days.length - 1)) * VIEW_WIDTH;
      const normalized = (d.tempMaxCelsius - lowest) / range;
      const y = VIEW_HEIGHT - normalized * (VIEW_HEIGHT - 10) - 5;
      return {
        label: new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
        tempMax: d.tempMaxCelsius,
        tempMin: d.tempMinCelsius,
        x,
        y,
      };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  });
}
```

```html
<!-- frontend/src/app/components/forecast-strip/forecast-strip.component.html -->
<div class="strip">
  <svg class="strip__line" [attr.viewBox]="viewBox" preserveAspectRatio="none" aria-hidden="true">
    <path [attr.d]="linePath()" class="strip__path" fill="none" />
  </svg>
  <div class="strip__days">
    @for (point of points(); track point.label + $index) {
      <div class="strip__day">
        <span class="strip__day-label">{{ point.label }}</span>
        <span class="strip__day-max">{{ point.tempMax | number: '1.0-0' }}°</span>
        <span class="strip__day-min">{{ point.tempMin | number: '1.0-0' }}°</span>
      </div>
    }
  </div>
</div>
```

```scss
// frontend/src/app/components/forecast-strip/forecast-strip.component.scss
.strip {
  background: var(--color-glass-bg);
  backdrop-filter: blur(18px);
  border-radius: 1.25rem;
  padding: 1.25rem 1.5rem 1.5rem;
}

.strip__line {
  width: 100%;
  height: 3.5rem;
  display: block;
}

.strip__path {
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw-line 1.4s ease-out forwards;
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

.strip__days {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.strip__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-on-glass-muted);
}

.strip__day-label {
  text-transform: capitalize;
}

.strip__day-max {
  font-weight: 600;
  color: var(--color-on-glass);
}

.strip__day-min {
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .strip__path {
    animation: none;
    stroke-dashoffset: 0;
  }
}
```

- [ ] **Step 5: Testleri calistir, gectigini dogrula**

Run: `cd frontend && npm test`
Expected: `ForecastStripComponent` testleri PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/components/weather-hero/ frontend/src/app/components/forecast-strip/
git commit -m "feat(frontend): buyuk sicaklik/baslik hero bileseni ve haftalik tahmin seridi"
```

---

### Task 7: Frontend — `weather-dashboard` orkestrasyon bileseni + "son aranan sehirler"

**Files:**
- Create: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.ts`
- Create: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.html`
- Create: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.scss`
- Create: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.spec.ts`

**Interfaces:**
- Consumes: `WeatherService.getCurrentWeather` (mevcut, degismedi), `CityAutocompleteComponent`, `AnimatedBackgroundComponent`, `WeatherHeroComponent`, `ForecastStripComponent`, `resolveWeatherTheme` (Task 3-6)
- Produces: `WeatherDashboardComponent` (selector: `app-weather-dashboard`). Task 8 bu bileseni `app.html`'de kullanacak.

- [ ] **Step 1: Basarisiz testleri yaz**

```typescript
// frontend/src/app/features/weather-dashboard/weather-dashboard.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WeatherDashboardComponent } from './weather-dashboard.component';
import { environment } from '../../../environments/environment';

describe('WeatherDashboardComponent', () => {
  let fixture: ComponentFixture<WeatherDashboardComponent>;
  let component: WeatherDashboardComponent;
  let httpMock: HttpTestingController;

  const mockForecast = {
    cityName: 'Ankara',
    date: '2026-08-12',
    temperatureCelsius: 30,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [{ date: '2026-08-12', weatherCode: 0, tempMaxCelsius: 32, tempMinCelsius: 20 }],
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [WeatherDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('populates forecast() and derives a theme after a successful city selection', () => {
    component.onCitySelected('Ankara');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    req.flush(mockForecast);

    expect(component.forecast()?.cityName).toBe('Ankara');
    expect(component.theme().category).toBe('clear');
    expect(component.errorMessage()).toBeNull();
  });

  it('sets errorMessage() and clears forecast() when the request fails', () => {
    component.onCitySelected('Ankara');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(component.forecast()).toBeNull();
    expect(component.errorMessage()).toContain('Hava durumu alinamadi');
  });

  it('adds a successfully searched city to recentCities(), most-recent first', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    component.onCitySelected('İzmir');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/%C4%B0zmir`).flush({ ...mockForecast, cityName: 'İzmir' });

    expect(component.recentCities()).toEqual(['İzmir', 'Ankara']);
  });

  it('does not duplicate a city already present in recentCities()', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    expect(component.recentCities()).toEqual(['Ankara']);
  });
});
```

- [ ] **Step 2: Testlerin basarisiz oldugunu dogrula**

Run: `cd frontend && npm test`
Expected: FAIL — `weather-dashboard.component` modulu bulunamiyor.

- [ ] **Step 3: Bileseni yaz**

```typescript
// frontend/src/app/features/weather-dashboard/weather-dashboard.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { resolveWeatherTheme } from '../../core/services/weather-theme.service';
import { CityAutocompleteComponent } from '../../components/city-autocomplete/city-autocomplete.component';
import { AnimatedBackgroundComponent } from '../../components/animated-background/animated-background.component';
import { WeatherHeroComponent } from '../../components/weather-hero/weather-hero.component';
import { ForecastStripComponent } from '../../components/forecast-strip/forecast-strip.component';

const RECENT_CITIES_KEY = 'weather-recent-cities';
const MAX_RECENT_CITIES = 5;

@Component({
  selector: 'app-weather-dashboard',
  imports: [CityAutocompleteComponent, AnimatedBackgroundComponent, WeatherHeroComponent, ForecastStripComponent],
  templateUrl: './weather-dashboard.component.html',
  styleUrl: './weather-dashboard.component.scss',
})
export class WeatherDashboardComponent {
  private readonly weatherService = inject(WeatherService);

  readonly forecast = signal<WeatherForecast | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly recentCities = signal<string[]>(this.loadRecentCities());

  readonly theme = computed(() => {
    const f = this.forecast();
    return resolveWeatherTheme(f?.weatherCode ?? 2, f?.isDay ?? true);
  });

  onCitySelected(city: string): void {
    this.errorMessage.set(null);
    this.weatherService.getCurrentWeather(city).subscribe({
      next: (result) => {
        this.forecast.set(result);
        this.pushRecentCity(city);
      },
      error: () => {
        this.forecast.set(null);
        this.errorMessage.set('Hava durumu alinamadi. Lutfen listeden bir il secin.');
      },
    });
  }

  private loadRecentCities(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_CITIES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private pushRecentCity(city: string): void {
    const updated = [city, ...this.recentCities().filter((c) => c !== city)].slice(0, MAX_RECENT_CITIES);
    this.recentCities.set(updated);
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
  }
}
```

```html
<!-- frontend/src/app/features/weather-dashboard/weather-dashboard.component.html -->
<app-animated-background [theme]="theme()" />

<main class="dashboard">
  <app-city-autocomplete (citySelected)="onCitySelected($event)" />

  @if (recentCities().length > 0) {
    <div class="dashboard__recent">
      @for (city of recentCities(); track city) {
        <button type="button" class="dashboard__recent-chip" (click)="onCitySelected(city)">{{ city }}</button>
      }
    </div>
  }

  @if (forecast(); as f) {
    <app-weather-hero [forecast]="f" [theme]="theme()" />
    <app-forecast-strip [days]="f.daily" />
  }

  @if (!forecast() && !errorMessage()) {
    <p class="dashboard__hint">Bir il secin, anlik hava durumunu ve haftalik tahmini gorun.</p>
  }

  @if (errorMessage(); as msg) {
    <p class="dashboard__error" role="alert">{{ msg }}</p>
  }
</main>
```

```scss
// frontend/src/app/features/weather-dashboard/weather-dashboard.component.scss
.dashboard {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 30rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100dvh;
  justify-content: center;
}

.dashboard__recent {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dashboard__recent-chip {
  border: none;
  border-radius: 999px;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  font-family: var(--font-body);
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  backdrop-filter: blur(8px);
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
}

.dashboard__hint {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.85);
}

.dashboard__error {
  font-family: var(--font-body);
  color: #ffb4a8;
}
```

- [ ] **Step 4: Testleri calistir, gectigini dogrula**

Run: `cd frontend && npm test`
Expected: tum `WeatherDashboardComponent` testleri PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/weather-dashboard/
git commit -m "feat(frontend): weather-dashboard orkestrasyon bileseni + son aranan sehirler"
```

---

### Task 8: Frontend — Kablo baglama, eski `weather-search`'u kaldirma, global tema token'lari

**Files:**
- Modify: `frontend/src/app/app.ts`
- Modify: `frontend/src/app/app.html`
- Modify: `frontend/src/app/app.scss`
- Modify: `frontend/src/styles.scss`
- Delete: `frontend/src/app/features/weather-search/` (tum klasor: `.ts`, `.html`, `.scss`, `.spec.ts`)

**Interfaces:**
- Consumes: `WeatherDashboardComponent` (Task 7)
- Produces: calisan uygulama koku — `App` bileseni artik `WeatherDashboardComponent`'i render ediyor.

- [ ] **Step 1: `styles.scss`'e glass tema token'larini ekle**

`frontend/src/styles.scss` dosyasindaki `:root` blogunun icine, mevcut degiskenlerin **altina** ekle (mevcut degiskenleri silme):

```scss
  --color-glass-bg: rgba(12, 16, 22, 0.38);
  --color-on-glass: #f5f7fa;
  --color-on-glass-muted: rgba(245, 247, 250, 0.72);
```

- [ ] **Step 2: `app.ts`'i guncelle**

```typescript
// frontend/src/app/app.ts
import { Component } from '@angular/core';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';

@Component({
  selector: 'app-root',
  imports: [WeatherDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
```

- [ ] **Step 3: `app.html`'i guncelle**

```html
<!-- frontend/src/app/app.html -->
<app-weather-dashboard />
```

- [ ] **Step 4: `app.scss`'i sadelestir**

```scss
// frontend/src/app/app.scss
:host {
  display: block;
  min-height: 100dvh;
}
```

- [ ] **Step 5: Eski `weather-search` bilesenini sil**

```bash
git rm -r frontend/src/app/features/weather-search
```

- [ ] **Step 6: Tum test suite'ini calistir**

Run: `cd frontend && npm test`
Expected: tum testler PASS — eski `WeatherSearchComponent` testleri artik yok (dosyalar silindi), kalan testlerin hicbiri `WeatherSearchComponent`'i referans almiyor (kontrol icin: `grep -r "WeatherSearchComponent" frontend/src` bos donmeli).

- [ ] **Step 7: Build'in basarili oldugunu dogrula**

Run: `cd frontend && npm run build`
Expected: derleme hatasiz tamamlanir (eski bilesene referans kalmadigi dogrulanir).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/app.ts frontend/src/app/app.html frontend/src/app/app.scss frontend/src/styles.scss
git commit -m "feat(frontend): weather-dashboard'u koke bagla, eski weather-search'u kaldir"
```

---

### Task 9: Manuel dogrulama — tarayicida uctan uca test

**Files:** Yok (kod degisikligi yok, sadece calistirip gozlemleme)

**Interfaces:**
- Consumes: Task 1-8'in tum ciktisi
- Produces: yok — bu, "UI degisikligi tarayicida test edilmeden tamamlandi denemez" kuralinin uygulandigi son adim.

- [ ] **Step 1: Backend'i yerelde baslat**

Run: `cd backend && dotnet run --project src/WeatherProject.Api` (veya mevcut `docker compose up --build -d` akisi kullaniliyorsa onu calistir — Postgres/Redis'in ayakta oldugundan emin ol).

- [ ] **Step 2: Frontend dev server'i baslat**

Run: `cd frontend && npm start`

- [ ] **Step 3: Tarayicida ac ve test et**

`http://localhost:4200` (veya `npm start`'in verdigi port) adresine git:
- Il kutusuna `ist` yaz → `İstanbul` onerisinin ciktigini, ok tuslariyla gezilebildigini, Enter ile secilebildigini dogrula
- `İstanbul` secilince: arka planin gecerli hava durumuna gore animasyonlu bir sahneye (yagmur/kar/gunes-isini/vs.) geçtigini, buyuk sicaklik + Turkce baslik + ruzgar/nem etiketlerinin goruldugunu, 7 gunluk seridin (cizgi animasyonuyla) ciktigini gozlemle
- Farkli kategorilerden birkac il daha dene (orn. `Rize` — genelde yagmurlu/bulutlu, `Antalya` — genelde acik) ve arka plan sahnesinin degistigini dogrula
- "Son aranan sehirler" cip'lerinin goründügünü ve tiklaninca o sehri tekrar getirdigini dogrula
- Var olmayan/eslesmeyen bir metin yazip Ara'ya basmadan sayfadan cikildiginda hata olusmadigini, sadece listeden secim yapinca istegin gittigini dogrula
- Tarayici DevTools'ta "Emulate CSS prefers-reduced-motion: reduce" acip animasyonlarin durdugunu dogrula

- [ ] **Step 4: Sonucu raporla**

Yukaridaki maddelerden hangilerinin beklendigi gibi calistigini, hangilerinde sapma oldugunu (varsa) not al. Sapma varsa, ilgili task'a donup duzelt, bu adimi tekrar et.

# Backend (.NET Clean Architecture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/architecture-overview.md`'de tanımlanan Clean Architecture katmanlarını (Domain, Application, Infrastructure, Api) gerçek bir .NET çözümü olarak hayata geçirmek: hava durumu sorgulama, Redis cache, PostgreSQL'de arama geçmişi.

**Architecture:** 4 katmanlı Clean Architecture. `Domain` hiçbir şeye bağımlı değil. `Application` sadece `Domain`'e ve kendi arayüzlerine bağımlı. `Infrastructure` bu arayüzleri PostgreSQL (EF Core), Redis ve dış hava durumu API'si ile doldurur. `Api` hepsini `Program.cs` içinde DI ile birbirine bağlar.

**Tech Stack:** .NET 10, ASP.NET Core Web API, Entity Framework Core (Npgsql provider), StackExchange.Redis (`Microsoft.Extensions.Caching.StackExchangeRedis`), xUnit, Moq.

## Global Constraints

- Katman isimleri `docs/architecture-overview.md` ile birebir aynı: `WeatherProject.Domain`, `WeatherProject.Application`, `WeatherProject.Infrastructure`, `WeatherProject.Api`
- SOLID: her yeni dış bağımlılık (Redis, PostgreSQL, dış API) `Application` katmanında tanımlı bir arayüz üzerinden kullanılacak, asla doğrudan somut sınıf üzerinden değil
- Bağımlılık yönü: `Api -> Infrastructure -> Application -> Domain`; hiçbir iç katman bir dış katmana proje referansı vermeyecek
- Tüm kod dosyaları `backend/` klasörü altında

---

### Task 1: Solution ve proje iskeletini oluştur

**Files:**
- Create: `backend/WeatherProject.sln`
- Create: `backend/src/WeatherProject.Domain/WeatherProject.Domain.csproj`
- Create: `backend/src/WeatherProject.Application/WeatherProject.Application.csproj`
- Create: `backend/src/WeatherProject.Infrastructure/WeatherProject.Infrastructure.csproj`
- Create: `backend/src/WeatherProject.Api/WeatherProject.Api.csproj`
- Create: `backend/tests/WeatherProject.Domain.Tests/WeatherProject.Domain.Tests.csproj`
- Create: `backend/tests/WeatherProject.Application.Tests/WeatherProject.Application.Tests.csproj`
- Create: `backend/tests/WeatherProject.Infrastructure.Tests/WeatherProject.Infrastructure.Tests.csproj`
- Create: `backend/tests/WeatherProject.Api.Tests/WeatherProject.Api.Tests.csproj`

**Interfaces:**
- Consumes: yok
- Produces: sonraki tüm task'lar bu csproj'lara dosya ekleyecek. Proje referans zinciri: `Api -> Infrastructure -> Application -> Domain`.

- [ ] **Step 1: Solution ve boş projeleri oluştur**

```bash
mkdir -p backend/src backend/tests
cd backend
dotnet new sln -n WeatherProject

dotnet new classlib -n WeatherProject.Domain -o src/WeatherProject.Domain
dotnet new classlib -n WeatherProject.Application -o src/WeatherProject.Application
dotnet new classlib -n WeatherProject.Infrastructure -o src/WeatherProject.Infrastructure
dotnet new webapi -n WeatherProject.Api -o src/WeatherProject.Api --use-controllers

dotnet new xunit -n WeatherProject.Domain.Tests -o tests/WeatherProject.Domain.Tests
dotnet new xunit -n WeatherProject.Application.Tests -o tests/WeatherProject.Application.Tests
dotnet new xunit -n WeatherProject.Infrastructure.Tests -o tests/WeatherProject.Infrastructure.Tests
dotnet new xunit -n WeatherProject.Api.Tests -o tests/WeatherProject.Api.Tests
```

- [ ] **Step 2: Solution'a tüm projeleri ekle**

```bash
dotnet sln add src/WeatherProject.Domain/WeatherProject.Domain.csproj
dotnet sln add src/WeatherProject.Application/WeatherProject.Application.csproj
dotnet sln add src/WeatherProject.Infrastructure/WeatherProject.Infrastructure.csproj
dotnet sln add src/WeatherProject.Api/WeatherProject.Api.csproj
dotnet sln add tests/WeatherProject.Domain.Tests/WeatherProject.Domain.Tests.csproj
dotnet sln add tests/WeatherProject.Application.Tests/WeatherProject.Application.Tests.csproj
dotnet sln add tests/WeatherProject.Infrastructure.Tests/WeatherProject.Infrastructure.Tests.csproj
dotnet sln add tests/WeatherProject.Api.Tests/WeatherProject.Api.Tests.csproj
```

- [ ] **Step 3: Katmanlar arası proje referanslarını kur (bağımlılık yönü kuralı)**

```bash
dotnet add src/WeatherProject.Application reference src/WeatherProject.Domain
dotnet add src/WeatherProject.Infrastructure reference src/WeatherProject.Application
dotnet add src/WeatherProject.Api reference src/WeatherProject.Infrastructure

dotnet add tests/WeatherProject.Domain.Tests reference src/WeatherProject.Domain
dotnet add tests/WeatherProject.Application.Tests reference src/WeatherProject.Application
dotnet add tests/WeatherProject.Infrastructure.Tests reference src/WeatherProject.Infrastructure
dotnet add tests/WeatherProject.Api.Tests reference src/WeatherProject.Api
```

- [ ] **Step 4: Derlemenin geçtiğini doğrula**

```bash
dotnet build
```

Beklenen: `Build succeeded.` (henüz iş mantığı yok, sadece iskelet)

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "chore: backend clean architecture solution iskeleti"
```

---

### Task 2: Domain katmanı — WeatherForecast entity

**Files:**
- Create: `backend/src/WeatherProject.Domain/Entities/WeatherForecast.cs`
- Test: `backend/tests/WeatherProject.Domain.Tests/WeatherForecastTests.cs`

**Interfaces:**
- Consumes: yok
- Produces: `WeatherProject.Domain.Entities.WeatherForecast` — Task 3, 4, 5, 6, 7'de kullanılacak. Constructor: `WeatherForecast(string cityName, DateTime date, double temperatureCelsius, string description)`. Public readonly property'ler: `CityName`, `Date`, `TemperatureCelsius`, `Description`.

- [ ] **Step 1: Başarısız testi yaz**

```csharp
// backend/tests/WeatherProject.Domain.Tests/WeatherForecastTests.cs
using WeatherProject.Domain.Entities;
using Xunit;

namespace WeatherProject.Domain.Tests;

public class WeatherForecastTests
{
    [Fact]
    public void Constructor_WithValidData_SetsAllProperties()
    {
        var date = new DateTime(2026, 7, 28);

        var forecast = new WeatherForecast("Istanbul", date, 28.5, "Clear");

        Assert.Equal("Istanbul", forecast.CityName);
        Assert.Equal(date, forecast.Date);
        Assert.Equal(28.5, forecast.TemperatureCelsius);
        Assert.Equal("Clear", forecast.Description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Constructor_WithInvalidCityName_ThrowsArgumentException(string? cityName)
    {
        Assert.Throws<ArgumentException>(() =>
            new WeatherForecast(cityName!, DateTime.Today, 20.0, "Sunny"));
    }
}
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/WeatherProject.Domain.Tests`
Expected: FAIL — `WeatherForecast` tipi bulunamadı (derleme hatası)

- [ ] **Step 3: Minimal implementasyonu yaz**

```csharp
// backend/src/WeatherProject.Domain/Entities/WeatherForecast.cs
namespace WeatherProject.Domain.Entities;

public class WeatherForecast
{
    public string CityName { get; }
    public DateTime Date { get; }
    public double TemperatureCelsius { get; }
    public string Description { get; }

    public WeatherForecast(string cityName, DateTime date, double temperatureCelsius, string description)
    {
        if (string.IsNullOrWhiteSpace(cityName))
            throw new ArgumentException("City name cannot be empty.", nameof(cityName));

        CityName = cityName;
        Date = date;
        TemperatureCelsius = temperatureCelsius;
        Description = description ?? string.Empty;
    }
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `dotnet test tests/WeatherProject.Domain.Tests`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add backend/src/WeatherProject.Domain/Entities/WeatherForecast.cs backend/tests/WeatherProject.Domain.Tests/WeatherForecastTests.cs
git commit -m "feat(domain): WeatherForecast entity ekle"
```

---

### Task 3: Application katmanı — arayüzler ve GetCurrentWeatherHandler use case

**Files:**
- Create: `backend/src/WeatherProject.Application/Interfaces/IWeatherProvider.cs`
- Create: `backend/src/WeatherProject.Application/Interfaces/IWeatherCacheRepository.cs`
- Create: `backend/src/WeatherProject.Application/Weather/GetCurrentWeatherHandler.cs`
- Test: `backend/tests/WeatherProject.Application.Tests/GetCurrentWeatherHandlerTests.cs`
- Modify: `backend/src/WeatherProject.Application/WeatherProject.Application.csproj` (Moq paketi test projesine eklenecek)

**Interfaces:**
- Consumes: `WeatherProject.Domain.Entities.WeatherForecast` (Task 2)
- Produces: `IWeatherProvider.GetCurrentWeatherAsync(string cityName, CancellationToken ct): Task<WeatherForecast>`, `IWeatherCacheRepository.GetAsync(string cityName, CancellationToken ct): Task<WeatherForecast?>`, `IWeatherCacheRepository.SetAsync(string cityName, WeatherForecast forecast, TimeSpan expiration, CancellationToken ct): Task`, `GetCurrentWeatherHandler.HandleAsync(string cityName, CancellationToken ct): Task<WeatherForecast>`. Task 5 ve 6 bu arayüzleri implemente edecek. Task 7 `GetCurrentWeatherHandler`'ı controller'dan çağıracak.

- [ ] **Step 1: Test projesine Moq paketini ekle**

```bash
cd backend
dotnet add tests/WeatherProject.Application.Tests package Moq
```

- [ ] **Step 2: Başarısız testleri yaz**

```csharp
// backend/tests/WeatherProject.Application.Tests/GetCurrentWeatherHandlerTests.cs
using Moq;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Domain.Entities;
using Xunit;

namespace WeatherProject.Application.Tests;

public class GetCurrentWeatherHandlerTests
{
    [Fact]
    public async Task HandleAsync_WhenCached_ReturnsCachedValueAndNeverCallsProvider()
    {
        var cached = new WeatherForecast("Istanbul", DateTime.Today, 25.0, "Sunny");
        var cacheMock = new Mock<IWeatherCacheRepository>();
        cacheMock.Setup(c => c.GetAsync("Istanbul", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(cached);
        var providerMock = new Mock<IWeatherProvider>();

        var handler = new GetCurrentWeatherHandler(providerMock.Object, cacheMock.Object);
        var result = await handler.HandleAsync("Istanbul", CancellationToken.None);

        Assert.Same(cached, result);
        providerMock.Verify(
            p => p.GetCurrentWeatherAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenNotCached_CallsProviderAndStoresResultInCache()
    {
        var fresh = new WeatherForecast("Ankara", DateTime.Today, 30.0, "Clear");
        var cacheMock = new Mock<IWeatherCacheRepository>();
        cacheMock.Setup(c => c.GetAsync("Ankara", It.IsAny<CancellationToken>()))
                 .ReturnsAsync((WeatherForecast?)null);
        var providerMock = new Mock<IWeatherProvider>();
        providerMock.Setup(p => p.GetCurrentWeatherAsync("Ankara", It.IsAny<CancellationToken>()))
                    .ReturnsAsync(fresh);

        var handler = new GetCurrentWeatherHandler(providerMock.Object, cacheMock.Object);
        var result = await handler.HandleAsync("Ankara", CancellationToken.None);

        Assert.Same(fresh, result);
        cacheMock.Verify(
            c => c.SetAsync("Ankara", fresh, TimeSpan.FromMinutes(10), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/WeatherProject.Application.Tests`
Expected: FAIL — `IWeatherProvider`, `IWeatherCacheRepository`, `GetCurrentWeatherHandler` bulunamadı

- [ ] **Step 4: Arayüzleri ve handler'ı yaz**

```csharp
// backend/src/WeatherProject.Application/Interfaces/IWeatherProvider.cs
using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

public interface IWeatherProvider
{
    Task<WeatherForecast> GetCurrentWeatherAsync(string cityName, CancellationToken cancellationToken);
}
```

```csharp
// backend/src/WeatherProject.Application/Interfaces/IWeatherCacheRepository.cs
using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

public interface IWeatherCacheRepository
{
    Task<WeatherForecast?> GetAsync(string cityName, CancellationToken cancellationToken);

    Task SetAsync(
        string cityName,
        WeatherForecast forecast,
        TimeSpan expiration,
        CancellationToken cancellationToken);
}
```

```csharp
// backend/src/WeatherProject.Application/Weather/GetCurrentWeatherHandler.cs
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Weather;

public class GetCurrentWeatherHandler
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    private readonly IWeatherProvider _weatherProvider;
    private readonly IWeatherCacheRepository _cacheRepository;

    public GetCurrentWeatherHandler(IWeatherProvider weatherProvider, IWeatherCacheRepository cacheRepository)
    {
        _weatherProvider = weatherProvider;
        _cacheRepository = cacheRepository;
    }

    public async Task<WeatherForecast> HandleAsync(string cityName, CancellationToken cancellationToken)
    {
        var cached = await _cacheRepository.GetAsync(cityName, cancellationToken);
        if (cached is not null)
            return cached;

        var forecast = await _weatherProvider.GetCurrentWeatherAsync(cityName, cancellationToken);
        await _cacheRepository.SetAsync(cityName, forecast, CacheDuration, cancellationToken);
        return forecast;
    }
}
```

- [ ] **Step 5: Testin geçtiğini doğrula**

Run: `dotnet test tests/WeatherProject.Application.Tests`
Expected: PASS (2 test)

- [ ] **Step 6: Commit**

```bash
git add backend/src/WeatherProject.Application backend/tests/WeatherProject.Application.Tests
git commit -m "feat(application): GetCurrentWeatherHandler use case ve cache/provider arayuzleri"
```

---

### Task 4: Infrastructure — Redis tabanlı cache implementasyonu

**Files:**
- Create: `backend/src/WeatherProject.Infrastructure/Caching/WeatherForecastDto.cs`
- Create: `backend/src/WeatherProject.Infrastructure/Caching/RedisWeatherCacheRepository.cs`
- Test: `backend/tests/WeatherProject.Infrastructure.Tests/RedisWeatherCacheRepositoryTests.cs`

**Interfaces:**
- Consumes: `IWeatherCacheRepository` (Task 3), `WeatherForecast` (Task 2)
- Produces: `RedisWeatherCacheRepository` — Task 7'de `Program.cs` içinde `IWeatherCacheRepository` olarak DI'a kaydedilecek.

**Neden bu tasarım:** `RedisWeatherCacheRepository`, `Microsoft.Extensions.Caching.Distributed.IDistributedCache` arayüzüne bağımlı — gerçek Redis'e değil. Bu sayede testte gerçek Redis sunucusuna ihtiyaç duymadan, aynı arayüzün bellek-içi implementasyonu (`MemoryDistributedCache`) ile test edilebiliyor. Gerçek Redis bağlantısı sadece Task 7'de `Program.cs`'de `AddStackExchangeRedisCache` ile kurulacak — iş mantığı kodu Redis'in "nerede" çalıştığını bilmiyor (Dependency Inversion).

- [ ] **Step 1: Gerekli paketleri ekle**

```bash
cd backend
dotnet add src/WeatherProject.Infrastructure package Microsoft.Extensions.Caching.StackExchangeRedis
dotnet add tests/WeatherProject.Infrastructure.Tests package Microsoft.Extensions.Caching.Memory
```

- [ ] **Step 2: Başarısız testleri yaz**

```csharp
// backend/tests/WeatherProject.Infrastructure.Tests/RedisWeatherCacheRepositoryTests.cs
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using WeatherProject.Domain.Entities;
using WeatherProject.Infrastructure.Caching;
using Xunit;

namespace WeatherProject.Infrastructure.Tests;

public class RedisWeatherCacheRepositoryTests
{
    private static IDistributedCache CreateInMemoryDistributedCache() =>
        new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));

    [Fact]
    public async Task SetAsync_ThenGetAsync_ReturnsEquivalentForecast()
    {
        var cache = CreateInMemoryDistributedCache();
        var repository = new RedisWeatherCacheRepository(cache);
        var forecast = new WeatherForecast("Izmir", new DateTime(2026, 7, 28), 27.0, "Sunny");

        await repository.SetAsync("Izmir", forecast, TimeSpan.FromMinutes(5), CancellationToken.None);
        var result = await repository.GetAsync("Izmir", CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(forecast.CityName, result!.CityName);
        Assert.Equal(forecast.TemperatureCelsius, result.TemperatureCelsius);
        Assert.Equal(forecast.Description, result.Description);
    }

    [Fact]
    public async Task GetAsync_WhenKeyNotSet_ReturnsNull()
    {
        var cache = CreateInMemoryDistributedCache();
        var repository = new RedisWeatherCacheRepository(cache);

        var result = await repository.GetAsync("Bursa", CancellationToken.None);

        Assert.Null(result);
    }
}
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/WeatherProject.Infrastructure.Tests`
Expected: FAIL — `RedisWeatherCacheRepository` bulunamadı

- [ ] **Step 4: DTO ve repository implementasyonunu yaz**

```csharp
// backend/src/WeatherProject.Infrastructure/Caching/WeatherForecastDto.cs
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Caching;

internal class WeatherForecastDto
{
    public string CityName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double TemperatureCelsius { get; set; }
    public string Description { get; set; } = string.Empty;

    public static WeatherForecastDto FromDomain(WeatherForecast forecast) => new()
    {
        CityName = forecast.CityName,
        Date = forecast.Date,
        TemperatureCelsius = forecast.TemperatureCelsius,
        Description = forecast.Description
    };

    public WeatherForecast ToDomain() => new(CityName, Date, TemperatureCelsius, Description);
}
```

```csharp
// backend/src/WeatherProject.Infrastructure/Caching/RedisWeatherCacheRepository.cs
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Caching;

public class RedisWeatherCacheRepository : IWeatherCacheRepository
{
    private readonly IDistributedCache _cache;

    public RedisWeatherCacheRepository(IDistributedCache cache)
    {
        _cache = cache;
    }

    public async Task<WeatherForecast?> GetAsync(string cityName, CancellationToken cancellationToken)
    {
        var json = await _cache.GetStringAsync(BuildKey(cityName), cancellationToken);
        if (json is null)
            return null;

        var dto = JsonSerializer.Deserialize<WeatherForecastDto>(json);
        return dto?.ToDomain();
    }

    public async Task SetAsync(
        string cityName,
        WeatherForecast forecast,
        TimeSpan expiration,
        CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(WeatherForecastDto.FromDomain(forecast));
        var options = new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = expiration };
        await _cache.SetStringAsync(BuildKey(cityName), json, options, cancellationToken);
    }

    private static string BuildKey(string cityName) => $"weather:{cityName.ToLowerInvariant()}";
}
```

- [ ] **Step 5: Testin geçtiğini doğrula**

Run: `dotnet test tests/WeatherProject.Infrastructure.Tests`
Expected: PASS (2 test)

- [ ] **Step 6: Commit**

```bash
git add backend/src/WeatherProject.Infrastructure/Caching backend/tests/WeatherProject.Infrastructure.Tests/RedisWeatherCacheRepositoryTests.cs
git commit -m "feat(infrastructure): Redis tabanli IWeatherCacheRepository implementasyonu"
```

---

### Task 5: Infrastructure — PostgreSQL ile arama geçmişi (EF Core)

**Files:**
- Create: `backend/src/WeatherProject.Domain/Entities/SearchHistoryEntry.cs`
- Create: `backend/src/WeatherProject.Application/Interfaces/ISearchHistoryRepository.cs`
- Create: `backend/src/WeatherProject.Infrastructure/Persistence/WeatherDbContext.cs`
- Create: `backend/src/WeatherProject.Infrastructure/Persistence/SearchHistoryRepository.cs`
- Test: `backend/tests/WeatherProject.Infrastructure.Tests/SearchHistoryRepositoryTests.cs`

**Interfaces:**
- Consumes: yok yeni (Domain'e yeni entity eklenir)
- Produces: `ISearchHistoryRepository.AddAsync(SearchHistoryEntry entry, CancellationToken ct): Task`, `ISearchHistoryRepository.GetRecentAsync(int count, CancellationToken ct): Task<IReadOnlyList<SearchHistoryEntry>>`. Task 7'de `WeatherController` her sorgudan sonra `AddAsync` çağıracak.

**Neden bu tasarım:** Testte gerçek PostgreSQL sunucusuna bağlanmak yerine EF Core'un InMemory sağlayıcısı kullanılıyor — `SearchHistoryRepository` kodu `DbContext` üzerinden çalıştığı için hangi veritabanı sağlayıcısının altta olduğunu bilmiyor. Gerçek PostgreSQL bağlantısı (Npgsql) sadece Task 7'de `Program.cs`'de kurulacak.

- [ ] **Step 1: Gerekli paketleri ekle**

```bash
cd backend
dotnet add src/WeatherProject.Infrastructure package Microsoft.EntityFrameworkCore
dotnet add src/WeatherProject.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add tests/WeatherProject.Infrastructure.Tests package Microsoft.EntityFrameworkCore.InMemory
```

- [ ] **Step 2: Domain entity'sini ve arayüzü yaz (bu adımda test yok — saf veri taşıyıcı)**

```csharp
// backend/src/WeatherProject.Domain/Entities/SearchHistoryEntry.cs
namespace WeatherProject.Domain.Entities;

public class SearchHistoryEntry
{
    public int Id { get; set; }
    public string CityName { get; set; } = string.Empty;
    public DateTime SearchedAtUtc { get; set; }
}
```

```csharp
// backend/src/WeatherProject.Application/Interfaces/ISearchHistoryRepository.cs
using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

public interface ISearchHistoryRepository
{
    Task AddAsync(SearchHistoryEntry entry, CancellationToken cancellationToken);

    Task<IReadOnlyList<SearchHistoryEntry>> GetRecentAsync(int count, CancellationToken cancellationToken);
}
```

- [ ] **Step 3: Başarısız testleri yaz**

```csharp
// backend/tests/WeatherProject.Infrastructure.Tests/SearchHistoryRepositoryTests.cs
using Microsoft.EntityFrameworkCore;
using WeatherProject.Domain.Entities;
using WeatherProject.Infrastructure.Persistence;
using Xunit;

namespace WeatherProject.Infrastructure.Tests;

public class SearchHistoryRepositoryTests
{
    private static WeatherDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<WeatherDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new WeatherDbContext(options);
    }

    [Fact]
    public async Task AddAsync_PersistsEntry()
    {
        await using var context = CreateInMemoryContext();
        var repository = new SearchHistoryRepository(context);
        var entry = new SearchHistoryEntry { CityName = "Istanbul", SearchedAtUtc = DateTime.UtcNow };

        await repository.AddAsync(entry, CancellationToken.None);

        Assert.Equal(1, await context.SearchHistoryEntries.CountAsync());
    }

    [Fact]
    public async Task GetRecentAsync_ReturnsMostRecentEntriesFirst()
    {
        await using var context = CreateInMemoryContext();
        var repository = new SearchHistoryRepository(context);

        await repository.AddAsync(
            new SearchHistoryEntry { CityName = "Ankara", SearchedAtUtc = new DateTime(2026, 7, 1) },
            CancellationToken.None);
        await repository.AddAsync(
            new SearchHistoryEntry { CityName = "Izmir", SearchedAtUtc = new DateTime(2026, 7, 28) },
            CancellationToken.None);

        var recent = await repository.GetRecentAsync(1, CancellationToken.None);

        Assert.Single(recent);
        Assert.Equal("Izmir", recent[0].CityName);
    }
}
```

- [ ] **Step 4: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/WeatherProject.Infrastructure.Tests`
Expected: FAIL — `WeatherDbContext`, `SearchHistoryRepository` bulunamadı

- [ ] **Step 5: DbContext ve repository implementasyonunu yaz**

```csharp
// backend/src/WeatherProject.Infrastructure/Persistence/WeatherDbContext.cs
using Microsoft.EntityFrameworkCore;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Persistence;

public class WeatherDbContext : DbContext
{
    public WeatherDbContext(DbContextOptions<WeatherDbContext> options) : base(options)
    {
    }

    public DbSet<SearchHistoryEntry> SearchHistoryEntries => Set<SearchHistoryEntry>();
}
```

```csharp
// backend/src/WeatherProject.Infrastructure/Persistence/SearchHistoryRepository.cs
using Microsoft.EntityFrameworkCore;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Persistence;

public class SearchHistoryRepository : ISearchHistoryRepository
{
    private readonly WeatherDbContext _context;

    public SearchHistoryRepository(WeatherDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(SearchHistoryEntry entry, CancellationToken cancellationToken)
    {
        _context.SearchHistoryEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SearchHistoryEntry>> GetRecentAsync(int count, CancellationToken cancellationToken)
    {
        return await _context.SearchHistoryEntries
            .OrderByDescending(e => e.SearchedAtUtc)
            .Take(count)
            .ToListAsync(cancellationToken);
    }
}
```

- [ ] **Step 6: Testin geçtiğini doğrula**

Run: `dotnet test tests/WeatherProject.Infrastructure.Tests`
Expected: PASS (2 yeni test, toplam 4)

- [ ] **Step 7: Commit**

```bash
git add backend/src/WeatherProject.Domain/Entities/SearchHistoryEntry.cs backend/src/WeatherProject.Application/Interfaces/ISearchHistoryRepository.cs backend/src/WeatherProject.Infrastructure/Persistence backend/tests/WeatherProject.Infrastructure.Tests/SearchHistoryRepositoryTests.cs
git commit -m "feat(infrastructure): PostgreSQL/EF Core ile arama gecmisi repository"
```

---

### Task 6: Infrastructure — dış hava durumu API istemcisi (OpenWeatherMap)

**Files:**
- Create: `backend/src/WeatherProject.Infrastructure/ExternalApis/OpenWeatherMapProvider.cs`
- Create: `backend/src/WeatherProject.Infrastructure/ExternalApis/OpenWeatherMapOptions.cs`
- Test: `backend/tests/WeatherProject.Infrastructure.Tests/OpenWeatherMapProviderTests.cs`
- Test helper: `backend/tests/WeatherProject.Infrastructure.Tests/FakeHttpMessageHandler.cs`

**Interfaces:**
- Consumes: `IWeatherProvider` (Task 3)
- Produces: `OpenWeatherMapProvider` — Task 7'de `Program.cs`'de `IWeatherProvider` olarak `HttpClient` ile DI'a kaydedilecek. `OpenWeatherMapOptions` (`ApiKey`, `BaseUrl`) `appsettings.json`'dan bind edilecek.

**Neden bu tasarım:** Gerçek dış API'ye HTTP isteği atmadan test etmek için `HttpClient`'ın `HttpMessageHandler`'ı sahteleniyor (`FakeHttpMessageHandler`). Bu, dış servislerle konuşan kodu test ederken yaygın kullanılan bir tekniktir — testler ağ bağlantısına veya gerçek API anahtarına ihtiyaç duymaz.

- [ ] **Step 1: Options sınıfını yaz**

```csharp
// backend/src/WeatherProject.Infrastructure/ExternalApis/OpenWeatherMapOptions.cs
namespace WeatherProject.Infrastructure.ExternalApis;

public class OpenWeatherMapOptions
{
    public const string SectionName = "OpenWeatherMap";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.openweathermap.org";
}
```

- [ ] **Step 2: Test için sahte HTTP handler'ı yaz**

```csharp
// backend/tests/WeatherProject.Infrastructure.Tests/FakeHttpMessageHandler.cs
using System.Net;

namespace WeatherProject.Infrastructure.Tests;

public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly HttpStatusCode _statusCode;
    private readonly string _responseBody;

    public FakeHttpMessageHandler(HttpStatusCode statusCode, string responseBody)
    {
        _statusCode = statusCode;
        _responseBody = responseBody;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent(_responseBody)
        };
        return Task.FromResult(response);
    }
}
```

- [ ] **Step 3: Başarısız testleri yaz**

```csharp
// backend/tests/WeatherProject.Infrastructure.Tests/OpenWeatherMapProviderTests.cs
using System.Net;
using Microsoft.Extensions.Options;
using WeatherProject.Infrastructure.ExternalApis;
using Xunit;

namespace WeatherProject.Infrastructure.Tests;

public class OpenWeatherMapProviderTests
{
    private const string SampleResponseJson = """
    {
      "name": "Istanbul",
      "main": { "temp": 24.7 },
      "weather": [ { "description": "clear sky" } ]
    }
    """;

    [Fact]
    public async Task GetCurrentWeatherAsync_WithValidResponse_MapsToWeatherForecast()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, SampleResponseJson);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.openweathermap.org") };
        var options = Options.Create(new OpenWeatherMapOptions { ApiKey = "test-key" });
        var provider = new OpenWeatherMapProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Istanbul", CancellationToken.None);

        Assert.Equal("Istanbul", forecast.CityName);
        Assert.Equal(24.7, forecast.TemperatureCelsius);
        Assert.Equal("clear sky", forecast.Description);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithErrorResponse_ThrowsHttpRequestException()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.NotFound, "{}");
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.openweathermap.org") };
        var options = Options.Create(new OpenWeatherMapOptions { ApiKey = "test-key" });
        var provider = new OpenWeatherMapProvider(httpClient, options);

        await Assert.ThrowsAsync<HttpRequestException>(
            () => provider.GetCurrentWeatherAsync("UnknownCity", CancellationToken.None));
    }
}
```

- [ ] **Step 4: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/WeatherProject.Infrastructure.Tests`
Expected: FAIL — `OpenWeatherMapProvider` bulunamadı

- [ ] **Step 5: Provider implementasyonunu yaz**

```csharp
// backend/src/WeatherProject.Infrastructure/ExternalApis/OpenWeatherMapProvider.cs
using System.Text.Json;
using Microsoft.Extensions.Options;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.ExternalApis;

public class OpenWeatherMapProvider : IWeatherProvider
{
    private readonly HttpClient _httpClient;
    private readonly OpenWeatherMapOptions _options;

    public OpenWeatherMapProvider(HttpClient httpClient, IOptions<OpenWeatherMapOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<WeatherForecast> GetCurrentWeatherAsync(string cityName, CancellationToken cancellationToken)
    {
        var requestUri = $"/data/2.5/weather?q={Uri.EscapeDataString(cityName)}&units=metric&appid={_options.ApiKey}";
        var response = await _httpClient.GetAsync(requestUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        var temperature = root.GetProperty("main").GetProperty("temp").GetDouble();
        var description = root.GetProperty("weather")[0].GetProperty("description").GetString() ?? string.Empty;

        return new WeatherForecast(cityName, DateTime.UtcNow, temperature, description);
    }
}
```

- [ ] **Step 6: Testin geçtiğini doğrula**

Run: `dotnet test tests/WeatherProject.Infrastructure.Tests`
Expected: PASS (2 yeni test, toplam 6)

- [ ] **Step 7: Commit**

```bash
git add backend/src/WeatherProject.Infrastructure/ExternalApis backend/tests/WeatherProject.Infrastructure.Tests/OpenWeatherMapProviderTests.cs backend/tests/WeatherProject.Infrastructure.Tests/FakeHttpMessageHandler.cs
git commit -m "feat(infrastructure): OpenWeatherMap IWeatherProvider implementasyonu"
```

---

### Task 7: Api katmanı — Controller, DI wiring, entegrasyon testi

**Files:**
- Create: `backend/src/WeatherProject.Api/Controllers/WeatherController.cs`
- Modify: `backend/src/WeatherProject.Api/Program.cs`
- Modify: `backend/src/WeatherProject.Api/appsettings.json`
- Test: `backend/tests/WeatherProject.Api.Tests/WeatherControllerTests.cs`

**Interfaces:**
- Consumes: `GetCurrentWeatherHandler` (Task 3), `RedisWeatherCacheRepository` (Task 4), `SearchHistoryRepository` + `WeatherDbContext` (Task 5), `OpenWeatherMapProvider` (Task 6)
- Produces: `GET /api/weather/{cityName}` HTTP endpoint — Task 3 (`04-containerization-docker.md`) bu endpoint'i container içinde çalıştıracak; frontend planı (`03-frontend-angular.md`) bu endpoint'i tüketecek.

- [ ] **Step 1: `appsettings.json`'a bağlantı ayarlarını ekle**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=weatherproject;Username=weatherproject;Password=changeme",
    "Redis": "localhost:6379"
  },
  "OpenWeatherMap": {
    "ApiKey": "REPLACE_WITH_REAL_KEY",
    "BaseUrl": "https://api.openweathermap.org"
  }
}
```

- [ ] **Step 2: Controller'ı yaz**

```csharp
// backend/src/WeatherProject.Api/Controllers/WeatherController.cs
using Microsoft.AspNetCore.Mvc;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Api.Controllers;

[ApiController]
[Route("api/weather")]
public class WeatherController : ControllerBase
{
    private readonly GetCurrentWeatherHandler _handler;
    private readonly ISearchHistoryRepository _searchHistoryRepository;

    public WeatherController(GetCurrentWeatherHandler handler, ISearchHistoryRepository searchHistoryRepository)
    {
        _handler = handler;
        _searchHistoryRepository = searchHistoryRepository;
    }

    [HttpGet("{cityName}")]
    public async Task<ActionResult<WeatherForecast>> GetCurrent(string cityName, CancellationToken cancellationToken)
    {
        var forecast = await _handler.HandleAsync(cityName, cancellationToken);

        await _searchHistoryRepository.AddAsync(
            new SearchHistoryEntry { CityName = cityName, SearchedAtUtc = DateTime.UtcNow },
            cancellationToken);

        return Ok(forecast);
    }
}
```

- [ ] **Step 3: `Program.cs`'i DI kayıtlarıyla güncelle**

```csharp
// backend/src/WeatherProject.Api/Program.cs
using Microsoft.EntityFrameworkCore;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Infrastructure.Caching;
using WeatherProject.Infrastructure.ExternalApis;
using WeatherProject.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.Configure<OpenWeatherMapOptions>(
    builder.Configuration.GetSection(OpenWeatherMapOptions.SectionName));

builder.Services.AddDbContext<WeatherDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

builder.Services.AddHttpClient<IWeatherProvider, OpenWeatherMapProvider>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<OpenWeatherMapOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
});

builder.Services.AddScoped<IWeatherCacheRepository, RedisWeatherCacheRepository>();
builder.Services.AddScoped<ISearchHistoryRepository, SearchHistoryRepository>();
builder.Services.AddScoped<GetCurrentWeatherHandler>();

var app = builder.Build();

app.MapControllers();
app.Run();

public partial class Program
{
}
```

`public partial class Program` satırı: `WebApplicationFactory<Program>` entegrasyon testinin `Program` sınıfına erişebilmesi için gerekli (minimal API `Program.cs` dosyaları varsayılan olarak `internal`).

- [ ] **Step 4: Entegrasyon test paketlerini ekle**

```bash
cd backend
dotnet add tests/WeatherProject.Api.Tests package Microsoft.AspNetCore.Mvc.Testing
dotnet add tests/WeatherProject.Api.Tests package Moq
```

- [ ] **Step 5: Başarısız entegrasyon testini yaz**

```csharp
// backend/tests/WeatherProject.Api.Tests/WeatherControllerTests.cs
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;
using Xunit;

namespace WeatherProject.Api.Tests;

public class WeatherControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public WeatherControllerTests(WebApplicationFactory<Program> factory)
    {
        var fakeProvider = new Mock<IWeatherProvider>();
        fakeProvider
            .Setup(p => p.GetCurrentWeatherAsync("Istanbul", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WeatherForecast("Istanbul", DateTime.UtcNow, 22.0, "Sunny"));

        var fakeCache = new Mock<IWeatherCacheRepository>();
        fakeCache
            .Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WeatherForecast?)null);

        var fakeHistory = new Mock<ISearchHistoryRepository>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddSingleton(fakeProvider.Object);
                services.AddSingleton(fakeCache.Object);
                services.AddSingleton(fakeHistory.Object);
            });
        });
    }

    [Fact]
    public async Task GetCurrent_ForKnownCity_ReturnsOkWithForecast()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/weather/Istanbul");

        response.EnsureSuccessStatusCode();
        var forecast = await response.Content.ReadFromJsonAsync<WeatherForecast>();
        Assert.NotNull(forecast);
        Assert.Equal("Istanbul", forecast!.CityName);
    }
}
```

**Not:** `services.AddSingleton(fakeProvider.Object)` gibi kayıtlar `Program.cs`'deki `AddScoped<IWeatherCacheRepository, ...>` gibi kayıtların üzerine geçer çünkü `ConfigureServices` test host'unda daha sonra çalışır ve DI container son kaydı kullanır.

- [ ] **Step 6: Testin başarısız olduğunu doğrula**

Run: `dotnet test tests/WeatherProject.Api.Tests`
Expected: FAIL — `Program` erişilemiyor veya endpoint 404 (henüz controller/DI yoksa)

- [ ] **Step 7: Testin geçtiğini doğrula**

Run: `dotnet test tests/WeatherProject.Api.Tests`
Expected: PASS (1 test)

- [ ] **Step 8: Tüm solution'ın testlerini çalıştır**

```bash
cd backend
dotnet test
```

Expected: tüm test projelerinde PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/WeatherProject.Api backend/tests/WeatherProject.Api.Tests
git commit -m "feat(api): WeatherController ve DI wiring, entegrasyon testi"
```

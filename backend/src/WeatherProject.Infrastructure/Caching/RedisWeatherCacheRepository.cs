using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Caching;

// IWeatherCacheRepository'nin Redis implementasyonu. IDistributedCache uzerinden
// gidiyor (Microsoft'un soyutlamasi) - Program.cs'de AddStackExchangeRedisCache
// ile bu arayuz Redis'e baglaniyor. WeatherForecast dogrudan serialize edilmiyor,
// WeatherForecastDto'ya cevrilip oyle JSON'a yaziliyor (asagida neden).
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

    // ToLowerInvariant: "Istanbul" ve "istanbul" ayni cache key'e dussun,
    // yoksa buyuk/kucuk harf farkindan gereksiz yere iki kere disari istek atilir
    private static string BuildKey(string cityName) => $"weather:{cityName.ToLowerInvariant()}";
}

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

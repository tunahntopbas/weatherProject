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
}

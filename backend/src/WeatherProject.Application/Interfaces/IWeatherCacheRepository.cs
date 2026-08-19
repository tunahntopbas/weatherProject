using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

// Redis'in arkasindaki sozlesme. Implementasyonu Infrastructure/Caching/
// RedisWeatherCacheRepository.cs'de - burada Redis'ten hic bahsetmiyoruz,
// yarin baska bir cache teknolojisine gecilse Application katmani hic etkilenmez.
public interface IWeatherCacheRepository
{
    Task<WeatherForecast?> GetAsync(string cityName, CancellationToken cancellationToken);

    Task SetAsync(
        string cityName,
        WeatherForecast forecast,
        TimeSpan expiration,
        CancellationToken cancellationToken);
}

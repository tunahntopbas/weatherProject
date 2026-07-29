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

using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

public interface IWeatherProvider
{
    Task<WeatherForecast> GetCurrentWeatherAsync(string cityName, CancellationToken cancellationToken);
}

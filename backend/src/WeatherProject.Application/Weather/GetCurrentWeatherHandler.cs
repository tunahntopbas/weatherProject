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

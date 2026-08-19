using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Weather;

// Asil is mantigi burada: once cache'e bak, yoksa disariya (Open-Meteo) sor,
// sonucu tekrar cache'e yaz. Controller sadece bunu cagiriyor, HTTP/DB detaylarindan
// habersiz - use case mantigi ile sunum katmani birbirine karismasin diye boyle.
public class GetCurrentWeatherHandler
{
    // 10 dakika secildi: hava durumu bu kadar sik degismiyor, ayni sehir tekrar
    // sorgulaninca disari gereksiz istek atilmasin (rate limit + hiz icin)
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
        // cache-aside deseni: once Redis'e bak
        var cached = await _cacheRepository.GetAsync(cityName, cancellationToken);
        if (cached is not null)
            return cached;

        // cache'te yoksa disariya git, sonucu bir sonraki istek icin sakla
        var forecast = await _weatherProvider.GetCurrentWeatherAsync(cityName, cancellationToken);
        await _cacheRepository.SetAsync(cityName, forecast, CacheDuration, cancellationToken);
        return forecast;
    }
}

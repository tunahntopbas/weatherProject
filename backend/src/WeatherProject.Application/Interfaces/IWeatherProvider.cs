using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

// Disaridan hava durumu verisi ceken servisin arayuzu. Su an tek implementasyon
// var: OpenMeteoProvider (Open-Meteo API'sini kullaniyor). Yarin baska bir
// saglayiciya (OpenWeatherMap vs.) gecmek istersek sadece yeni bir class yazip
// Program.cs'deki DI kaydini degistirmek yeterli - Open/Closed prensibi burada.
public interface IWeatherProvider
{
    Task<WeatherForecast> GetCurrentWeatherAsync(string cityName, CancellationToken cancellationToken);
}

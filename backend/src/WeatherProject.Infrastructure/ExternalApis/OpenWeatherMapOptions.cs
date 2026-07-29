// backend/src/WeatherProject.Infrastructure/ExternalApis/OpenWeatherMapOptions.cs
namespace WeatherProject.Infrastructure.ExternalApis;

public class OpenWeatherMapOptions
{
    public const string SectionName = "OpenWeatherMap";

    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.openweathermap.org";
}

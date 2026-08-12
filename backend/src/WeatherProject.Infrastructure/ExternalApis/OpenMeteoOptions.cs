// backend/src/WeatherProject.Infrastructure/ExternalApis/OpenMeteoOptions.cs
namespace WeatherProject.Infrastructure.ExternalApis;

public class OpenMeteoOptions
{
    public const string SectionName = "OpenMeteo";

    public string GeocodingBaseUrl { get; set; } = "https://geocoding-api.open-meteo.com";
    public string ForecastBaseUrl { get; set; } = "https://api.open-meteo.com";
}

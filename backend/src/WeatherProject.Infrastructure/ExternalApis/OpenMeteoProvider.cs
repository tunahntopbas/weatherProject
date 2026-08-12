using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.ExternalApis;

public class OpenMeteoProvider : IWeatherProvider
{
    // WMO weather interpretation codes: https://open-meteo.com/en/docs
    private static readonly Dictionary<int, string> WeatherCodeDescriptions = new()
    {
        [0] = "clear sky",
        [1] = "mainly clear",
        [2] = "partly cloudy",
        [3] = "overcast",
        [45] = "fog",
        [48] = "depositing rime fog",
        [51] = "light drizzle",
        [53] = "moderate drizzle",
        [55] = "dense drizzle",
        [61] = "slight rain",
        [63] = "moderate rain",
        [65] = "heavy rain",
        [71] = "slight snow fall",
        [73] = "moderate snow fall",
        [75] = "heavy snow fall",
        [80] = "slight rain showers",
        [81] = "moderate rain showers",
        [82] = "violent rain showers",
        [95] = "thunderstorm",
        [96] = "thunderstorm with slight hail",
        [99] = "thunderstorm with heavy hail",
    };

    private readonly HttpClient _httpClient;
    private readonly OpenMeteoOptions _options;

    public OpenMeteoProvider(HttpClient httpClient, IOptions<OpenMeteoOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<WeatherForecast> GetCurrentWeatherAsync(string cityName, CancellationToken cancellationToken)
    {
        var (latitude, longitude) = await GeocodeAsync(cityName, cancellationToken);

        var forecastUri =
            $"{_options.ForecastBaseUrl}/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,weather_code";
        var response = await _httpClient.GetAsync(forecastUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);
        var current = document.RootElement.GetProperty("current");

        var temperature = current.GetProperty("temperature_2m").GetDouble();
        var weatherCode = current.GetProperty("weather_code").GetInt32();
        var description = WeatherCodeDescriptions.GetValueOrDefault(weatherCode, "unknown");

        return new WeatherForecast(cityName, DateTime.UtcNow, temperature, description);
    }

    private async Task<(double Latitude, double Longitude)> GeocodeAsync(string cityName, CancellationToken cancellationToken)
    {
        var geocodeUri = $"{_options.GeocodingBaseUrl}/v1/search?name={Uri.EscapeDataString(cityName)}&count=1&format=json";
        var response = await _httpClient.GetAsync(geocodeUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);

        if (!document.RootElement.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
        {
            throw new HttpRequestException($"City '{cityName}' not found.", null, HttpStatusCode.NotFound);
        }

        var first = results[0];
        return (first.GetProperty("latitude").GetDouble(), first.GetProperty("longitude").GetDouble());
    }
}

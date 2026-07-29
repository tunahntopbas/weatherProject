using System.Text.Json;
using Microsoft.Extensions.Options;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.ExternalApis;

public class OpenWeatherMapProvider : IWeatherProvider
{
    private readonly HttpClient _httpClient;
    private readonly OpenWeatherMapOptions _options;

    public OpenWeatherMapProvider(HttpClient httpClient, IOptions<OpenWeatherMapOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<WeatherForecast> GetCurrentWeatherAsync(string cityName, CancellationToken cancellationToken)
    {
        var requestUri = $"/data/2.5/weather?q={Uri.EscapeDataString(cityName)}&units=metric&appid={_options.ApiKey}";
        var response = await _httpClient.GetAsync(requestUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;

        var temperature = root.GetProperty("main").GetProperty("temp").GetDouble();
        var description = root.GetProperty("weather")[0].GetProperty("description").GetString() ?? string.Empty;

        return new WeatherForecast(cityName, DateTime.UtcNow, temperature, description);
    }
}

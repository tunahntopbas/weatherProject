using System.Globalization;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.ExternalApis;

// IWeatherProvider'in gercek implementasyonu - Open-Meteo API'sini kullaniyor.
// Ucretsiz, API key istemiyor, bu yuzden secildi. Iki ayri HTTP cagrisi var:
// once GeocodeAsync ile sehir adindan koordinat buluyoruz, sonra o koordinatla
// forecast cekiyoruz - Open-Meteo boyle calisiyor (dogrudan sehir adiyla sorgu yok).
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

    // Open-Meteo'nun geocoding'i bazen Turkce karakterli sehir adlarinda ("Kirikkale"
    // yerine "Kırıkkale" gibi) sonuc bulamiyor. Once orijinal isimle deneniyor,
    // bulunamazsa ASCII'ye cevrilip tekrar deneniyor (TryGeocodeAsync icinde)
    private static readonly Dictionary<char, char> TurkishToAsciiMap = new()
    {
        ['İ'] = 'I', ['ı'] = 'i', ['Ğ'] = 'G', ['ğ'] = 'g',
        ['Ş'] = 'S', ['ş'] = 's', ['Ç'] = 'C', ['ç'] = 'c',
        ['Ö'] = 'O', ['ö'] = 'o', ['Ü'] = 'U', ['ü'] = 'u',
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
        // once koordinat lazim, Open-Meteo forecast endpoint'i sehir adi kabul etmiyor
        var (latitude, longitude) = await GeocodeAsync(cityName, cancellationToken);

        var forecastUri =
            $"{_options.ForecastBaseUrl}/v1/forecast?latitude={latitude.ToString(CultureInfo.InvariantCulture)}&longitude={longitude.ToString(CultureInfo.InvariantCulture)}" +
            "&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m" +
            "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
            "&forecast_days=7&timezone=auto";
        var response = await _httpClient.GetAsync(forecastUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var current = root.GetProperty("current");

        var temperature = current.GetProperty("temperature_2m").GetDouble();
        var weatherCode = current.GetProperty("weather_code").GetInt32();
        var isDay = current.GetProperty("is_day").GetInt32() == 1;
        var windSpeed = current.GetProperty("wind_speed_10m").GetDouble();
        var humidity = current.GetProperty("relative_humidity_2m").GetDouble();
        var description = WeatherCodeDescriptions.GetValueOrDefault(weatherCode, "unknown");
        var daily = ParseDailyForecasts(root.GetProperty("daily"));

        return new WeatherForecast(
            cityName, DateTime.UtcNow, temperature, description,
            weatherCode, isDay, windSpeed, humidity, daily);
    }

    private static List<DailyForecast> ParseDailyForecasts(JsonElement daily)
    {
        var dates = daily.GetProperty("time");
        var codes = daily.GetProperty("weather_code");
        var maxTemps = daily.GetProperty("temperature_2m_max");
        var minTemps = daily.GetProperty("temperature_2m_min");

        var result = new List<DailyForecast>();
        for (var i = 0; i < dates.GetArrayLength(); i++)
        {
            result.Add(new DailyForecast(
                DateTime.Parse(dates[i].GetString()!),
                codes[i].GetInt32(),
                maxTemps[i].GetDouble(),
                minTemps[i].GetDouble()));
        }
        return result;
    }

    private async Task<(double Latitude, double Longitude)> GeocodeAsync(string cityName, CancellationToken cancellationToken)
    {
        // 81 il icin koordinatlar zaten elimizde (TurkishProvinceCoordinates) -
        // once ona bak, tutarsa disariya hic istek atmadan donduruyoruz. Boylece
        // Turkiye'deki il aramalarinin cogu geocoding cagrisina hic ihtiyac duymuyor.
        if (TurkishProvinceCoordinates.ByName.TryGetValue(cityName, out var knownCoordinates))
            return knownCoordinates;

        var result = await TryGeocodeAsync(cityName, cancellationToken);
        if (result is not null)
            return result.Value;

        var normalized = NormalizeTurkishCharacters(cityName);
        if (normalized != cityName)
        {
            result = await TryGeocodeAsync(normalized, cancellationToken);
            if (result is not null)
                return result.Value;
        }

        throw new HttpRequestException($"City '{cityName}' not found.", null, HttpStatusCode.NotFound);
    }

    private async Task<(double Latitude, double Longitude)?> TryGeocodeAsync(string cityName, CancellationToken cancellationToken)
    {
        var geocodeUri = $"{_options.GeocodingBaseUrl}/v1/search?name={Uri.EscapeDataString(cityName)}&count=1&format=json";
        var response = await _httpClient.GetAsync(geocodeUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(body);

        if (!document.RootElement.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
            return null;

        var first = results[0];
        return (first.GetProperty("latitude").GetDouble(), first.GetProperty("longitude").GetDouble());
    }

    private static string NormalizeTurkishCharacters(string input)
    {
        var chars = input.Select(c => TurkishToAsciiMap.TryGetValue(c, out var replacement) ? replacement : c).ToArray();
        return new string(chars);
    }
}

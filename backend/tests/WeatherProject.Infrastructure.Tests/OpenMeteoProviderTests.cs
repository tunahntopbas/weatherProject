using System.Net;
using Microsoft.Extensions.Options;
using WeatherProject.Infrastructure.ExternalApis;
using Xunit;

namespace WeatherProject.Infrastructure.Tests;

public class OpenMeteoProviderTests
{
    private const string GeocodingResponseJson = """
    {
      "results": [ { "name": "Istanbul", "latitude": 41.0138, "longitude": 28.9497 } ]
    }
    """;

    private const string EmptyGeocodingResponseJson = """
    { "results": [] }
    """;

    private const string ForecastResponseJson = """
    {
      "current": {
        "temperature_2m": 24.7,
        "weather_code": 0,
        "is_day": 1,
        "wind_speed_10m": 12.5,
        "relative_humidity_2m": 55
      },
      "daily": {
        "time": ["2026-08-12", "2026-08-13"],
        "weather_code": [0, 61],
        "temperature_2m_max": [30.1, 26.4],
        "temperature_2m_min": [20.2, 19.8]
      }
    }
    """;

    [Fact]
    public async Task GetCurrentWeatherAsync_WithValidCity_MapsToWeatherForecast()
    {
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, GeocodingResponseJson),
            (HttpStatusCode.OK, ForecastResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Istanbul", CancellationToken.None);

        Assert.Equal("Istanbul", forecast.CityName);
        Assert.Equal(24.7, forecast.TemperatureCelsius);
        Assert.Equal("clear sky", forecast.Description);
        Assert.Equal(0, forecast.WeatherCode);
        Assert.True(forecast.IsDay);
        Assert.Equal(12.5, forecast.WindSpeedKmh);
        Assert.Equal(55, forecast.HumidityPercent);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithValidCity_MapsDailyForecasts()
    {
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, GeocodingResponseJson),
            (HttpStatusCode.OK, ForecastResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Istanbul", CancellationToken.None);

        Assert.Equal(2, forecast.Daily.Count);
        Assert.Equal(61, forecast.Daily[1].WeatherCode);
        Assert.Equal(26.4, forecast.Daily[1].TempMaxCelsius);
        Assert.Equal(19.8, forecast.Daily[1].TempMinCelsius);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithUnknownCity_ThrowsHttpRequestException()
    {
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, EmptyGeocodingResponseJson),
            (HttpStatusCode.OK, EmptyGeocodingResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        await Assert.ThrowsAsync<HttpRequestException>(
            () => provider.GetCurrentWeatherAsync("UnknownCity", CancellationToken.None));
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WhenFirstGeocodeEmpty_RetriesWithNormalizedTurkishCharacters()
    {
        // "İstanbul" 81 il listesinde oldugu icin statik tablodan cozulur ve hic
        // geocoding cagrisi yapmaz; bu testte, o tabloda olmayan bir sehir ("Münih")
        // kullanarak ag uzerinden normalize-edilmis-Turkce-karakter tekrar denemesini
        // dogruluyoruz: ilk deneme ("Münih") bos donuyor, ikinci deneme
        // (sadelestirilmis "Munih") basariyla eslesiyor.
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, EmptyGeocodingResponseJson),
            (HttpStatusCode.OK, GeocodingResponseJson),
            (HttpStatusCode.OK, ForecastResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Münih", CancellationToken.None);

        Assert.Equal("Münih", forecast.CityName);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithKnownTurkishProvince_SkipsGeocodingCall()
    {
        // Handler hic cagrilmazsa test patlar (queue bos kalir) - bu, statik
        // tablodan cozulen iller icin ag cagrisi yapilmadigini kanitlar.
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, ForecastResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Ankara", CancellationToken.None);

        Assert.Equal("Ankara", forecast.CityName);
        Assert.Equal(24.7, forecast.TemperatureCelsius);
    }
}

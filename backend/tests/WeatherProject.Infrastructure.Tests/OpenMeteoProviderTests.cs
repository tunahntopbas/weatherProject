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
      "current": { "temperature_2m": 24.7, "weather_code": 0 }
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
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithUnknownCity_ThrowsHttpRequestException()
    {
        var handler = new SequentialFakeHttpMessageHandler(
            (HttpStatusCode.OK, EmptyGeocodingResponseJson));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new OpenMeteoOptions());
        var provider = new OpenMeteoProvider(httpClient, options);

        await Assert.ThrowsAsync<HttpRequestException>(
            () => provider.GetCurrentWeatherAsync("UnknownCity", CancellationToken.None));
    }
}

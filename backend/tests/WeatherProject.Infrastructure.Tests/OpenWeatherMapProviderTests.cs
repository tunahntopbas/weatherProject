using System.Net;
using Microsoft.Extensions.Options;
using WeatherProject.Infrastructure.ExternalApis;
using Xunit;

namespace WeatherProject.Infrastructure.Tests;

public class OpenWeatherMapProviderTests
{
    private const string SampleResponseJson = """
    {
      "name": "Istanbul",
      "main": { "temp": 24.7 },
      "weather": [ { "description": "clear sky" } ]
    }
    """;

    [Fact]
    public async Task GetCurrentWeatherAsync_WithValidResponse_MapsToWeatherForecast()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, SampleResponseJson);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.openweathermap.org") };
        var options = Options.Create(new OpenWeatherMapOptions { ApiKey = "test-key" });
        var provider = new OpenWeatherMapProvider(httpClient, options);

        var forecast = await provider.GetCurrentWeatherAsync("Istanbul", CancellationToken.None);

        Assert.Equal("Istanbul", forecast.CityName);
        Assert.Equal(24.7, forecast.TemperatureCelsius);
        Assert.Equal("clear sky", forecast.Description);
    }

    [Fact]
    public async Task GetCurrentWeatherAsync_WithErrorResponse_ThrowsHttpRequestException()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.NotFound, "{}");
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.openweathermap.org") };
        var options = Options.Create(new OpenWeatherMapOptions { ApiKey = "test-key" });
        var provider = new OpenWeatherMapProvider(httpClient, options);

        await Assert.ThrowsAsync<HttpRequestException>(
            () => provider.GetCurrentWeatherAsync("UnknownCity", CancellationToken.None));
    }
}

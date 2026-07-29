using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;
using Xunit;

namespace WeatherProject.Api.Tests;

public class WeatherControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public WeatherControllerTests(WebApplicationFactory<Program> factory)
    {
        var fakeProvider = new Mock<IWeatherProvider>();
        fakeProvider
            .Setup(p => p.GetCurrentWeatherAsync("Istanbul", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WeatherForecast("Istanbul", DateTime.UtcNow, 22.0, "Sunny"));

        var fakeCache = new Mock<IWeatherCacheRepository>();
        fakeCache
            .Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((WeatherForecast?)null);

        var fakeHistory = new Mock<ISearchHistoryRepository>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddSingleton(fakeProvider.Object);
                services.AddSingleton(fakeCache.Object);
                services.AddSingleton(fakeHistory.Object);
            });
        });
    }

    [Fact]
    public async Task GetCurrent_ForKnownCity_ReturnsOkWithForecast()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/weather/Istanbul");

        response.EnsureSuccessStatusCode();
        var forecast = await response.Content.ReadFromJsonAsync<WeatherForecast>();
        Assert.NotNull(forecast);
        Assert.Equal("Istanbul", forecast!.CityName);
    }
}

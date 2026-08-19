using Moq;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Domain.Entities;
using Xunit;

namespace WeatherProject.Application.Tests;

// Cache-aside mantigini kanitlayan testler: cache doluysa provider'a hic
// gidilmemeli, bossa gidilip cache doldurulmali. Ikisi de mock (Moq) uzerinden -
// gercek Redis/HTTP yok, sadece HandleAsync'in karar mantigi test ediliyor.
public class GetCurrentWeatherHandlerTests
{
    [Fact]
    public async Task HandleAsync_WhenCached_ReturnsCachedValueAndNeverCallsProvider()
    {
        var cached = new WeatherForecast("Istanbul", DateTime.Today, 25.0, "Sunny");
        var cacheMock = new Mock<IWeatherCacheRepository>();
        cacheMock.Setup(c => c.GetAsync("Istanbul", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(cached);
        var providerMock = new Mock<IWeatherProvider>();

        var handler = new GetCurrentWeatherHandler(providerMock.Object, cacheMock.Object);
        var result = await handler.HandleAsync("Istanbul", CancellationToken.None);

        Assert.Same(cached, result);
        providerMock.Verify(
            p => p.GetCurrentWeatherAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenNotCached_CallsProviderAndStoresResultInCache()
    {
        var fresh = new WeatherForecast("Ankara", DateTime.Today, 30.0, "Clear");
        var cacheMock = new Mock<IWeatherCacheRepository>();
        cacheMock.Setup(c => c.GetAsync("Ankara", It.IsAny<CancellationToken>()))
                 .ReturnsAsync((WeatherForecast?)null);
        var providerMock = new Mock<IWeatherProvider>();
        providerMock.Setup(p => p.GetCurrentWeatherAsync("Ankara", It.IsAny<CancellationToken>()))
                    .ReturnsAsync(fresh);

        var handler = new GetCurrentWeatherHandler(providerMock.Object, cacheMock.Object);
        var result = await handler.HandleAsync("Ankara", CancellationToken.None);

        Assert.Same(fresh, result);
        cacheMock.Verify(
            c => c.SetAsync("Ankara", fresh, TimeSpan.FromMinutes(10), It.IsAny<CancellationToken>()),
            Times.Once);
    }
}

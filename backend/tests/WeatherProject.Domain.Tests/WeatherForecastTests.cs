using WeatherProject.Domain.Entities;
using Xunit;

namespace WeatherProject.Domain.Tests;

// Domain katmaninin disari bagimliligi olmadigi icin bu testler de sade:
// hicbir mock/HTTP/DB yok, sadece constructor validasyonunu kontrol ediyor.
public class WeatherForecastTests
{
    [Fact]
    public void Constructor_WithValidData_SetsAllProperties()
    {
        var date = new DateTime(2026, 7, 28);

        var forecast = new WeatherForecast("Istanbul", date, 28.5, "Clear");

        Assert.Equal("Istanbul", forecast.CityName);
        Assert.Equal(date, forecast.Date);
        Assert.Equal(28.5, forecast.TemperatureCelsius);
        Assert.Equal("Clear", forecast.Description);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Constructor_WithInvalidCityName_ThrowsArgumentException(string? cityName)
    {
        Assert.Throws<ArgumentException>(() =>
            new WeatherForecast(cityName!, DateTime.Today, 20.0, "Sunny"));
    }

    [Fact]
    public void Constructor_WithExtendedData_SetsNewProperties()
    {
        var daily = new List<DailyForecast>
        {
            new DailyForecast(new DateTime(2026, 8, 13), 1, 30.0, 20.0)
        };

        var forecast = new WeatherForecast(
            "Istanbul", DateTime.Today, 28.5, "Clear",
            weatherCode: 0, isDay: true, windSpeedKmh: 12.5, humidityPercent: 55, daily: daily);

        Assert.Equal(0, forecast.WeatherCode);
        Assert.True(forecast.IsDay);
        Assert.Equal(12.5, forecast.WindSpeedKmh);
        Assert.Equal(55, forecast.HumidityPercent);
        Assert.Single(forecast.Daily);
        Assert.Equal(1, forecast.Daily[0].WeatherCode);
        Assert.Equal(30.0, forecast.Daily[0].TempMaxCelsius);
        Assert.Equal(20.0, forecast.Daily[0].TempMinCelsius);
    }

    [Fact]
    public void Constructor_WithoutOptionalParams_DefaultsToEmptyDailyAndSensibleDefaults()
    {
        var forecast = new WeatherForecast("Istanbul", DateTime.Today, 28.5, "Clear");

        Assert.Empty(forecast.Daily);
        Assert.Equal(0, forecast.WeatherCode);
        Assert.True(forecast.IsDay);
    }
}

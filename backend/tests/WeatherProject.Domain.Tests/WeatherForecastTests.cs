using WeatherProject.Domain.Entities;
using Xunit;

namespace WeatherProject.Domain.Tests;

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
}

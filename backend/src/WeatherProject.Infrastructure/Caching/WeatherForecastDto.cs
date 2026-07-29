using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Caching;

internal class WeatherForecastDto
{
    public string CityName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double TemperatureCelsius { get; set; }
    public string Description { get; set; } = string.Empty;

    public static WeatherForecastDto FromDomain(WeatherForecast forecast) => new()
    {
        CityName = forecast.CityName,
        Date = forecast.Date,
        TemperatureCelsius = forecast.TemperatureCelsius,
        Description = forecast.Description
    };

    public WeatherForecast ToDomain() => new(CityName, Date, TemperatureCelsius, Description);
}

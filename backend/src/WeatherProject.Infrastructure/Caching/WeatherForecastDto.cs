using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Caching;

internal class WeatherForecastDto
{
    public string CityName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double TemperatureCelsius { get; set; }
    public string Description { get; set; } = string.Empty;
    public int WeatherCode { get; set; }
    public bool IsDay { get; set; }
    public double WindSpeedKmh { get; set; }
    public double HumidityPercent { get; set; }
    public List<DailyForecast> Daily { get; set; } = new();

    public static WeatherForecastDto FromDomain(WeatherForecast forecast) => new()
    {
        CityName = forecast.CityName,
        Date = forecast.Date,
        TemperatureCelsius = forecast.TemperatureCelsius,
        Description = forecast.Description,
        WeatherCode = forecast.WeatherCode,
        IsDay = forecast.IsDay,
        WindSpeedKmh = forecast.WindSpeedKmh,
        HumidityPercent = forecast.HumidityPercent,
        Daily = forecast.Daily.ToList()
    };

    public WeatherForecast ToDomain() => new(
        CityName, Date, TemperatureCelsius, Description,
        WeatherCode, IsDay, WindSpeedKmh, HumidityPercent, Daily);
}

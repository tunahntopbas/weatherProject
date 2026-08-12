namespace WeatherProject.Domain.Entities;

public class WeatherForecast
{
    public string CityName { get; }
    public DateTime Date { get; }
    public double TemperatureCelsius { get; }
    public string Description { get; }
    public int WeatherCode { get; }
    public bool IsDay { get; }
    public double WindSpeedKmh { get; }
    public double HumidityPercent { get; }
    public IReadOnlyList<DailyForecast> Daily { get; }

    public WeatherForecast(
        string cityName,
        DateTime date,
        double temperatureCelsius,
        string description,
        int weatherCode = 0,
        bool isDay = true,
        double windSpeedKmh = 0,
        double humidityPercent = 0,
        IReadOnlyList<DailyForecast>? daily = null)
    {
        if (string.IsNullOrWhiteSpace(cityName))
            throw new ArgumentException("City name cannot be empty.", nameof(cityName));

        CityName = cityName;
        Date = date;
        TemperatureCelsius = temperatureCelsius;
        Description = description ?? string.Empty;
        WeatherCode = weatherCode;
        IsDay = isDay;
        WindSpeedKmh = windSpeedKmh;
        HumidityPercent = humidityPercent;
        Daily = daily ?? Array.Empty<DailyForecast>();
    }
}

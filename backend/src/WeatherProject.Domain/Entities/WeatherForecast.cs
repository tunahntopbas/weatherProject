namespace WeatherProject.Domain.Entities;

public class WeatherForecast
{
    public string CityName { get; }
    public DateTime Date { get; }
    public double TemperatureCelsius { get; }
    public string Description { get; }

    public WeatherForecast(string cityName, DateTime date, double temperatureCelsius, string description)
    {
        if (string.IsNullOrWhiteSpace(cityName))
            throw new ArgumentException("City name cannot be empty.", nameof(cityName));

        CityName = cityName;
        Date = date;
        TemperatureCelsius = temperatureCelsius;
        Description = description ?? string.Empty;
    }
}

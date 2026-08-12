namespace WeatherProject.Domain.Entities;

public class DailyForecast
{
    public DateTime Date { get; }
    public int WeatherCode { get; }
    public double TempMaxCelsius { get; }
    public double TempMinCelsius { get; }

    public DailyForecast(DateTime date, int weatherCode, double tempMaxCelsius, double tempMinCelsius)
    {
        Date = date;
        WeatherCode = weatherCode;
        TempMaxCelsius = tempMaxCelsius;
        TempMinCelsius = tempMinCelsius;
    }
}

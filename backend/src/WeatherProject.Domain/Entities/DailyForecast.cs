namespace WeatherProject.Domain.Entities;

// Haftalik tahmin listesindeki tek bir gunu temsil eder (WeatherForecast.Daily
// icinde kullaniliyor). Sadece min/max sicaklik ve gun kodu tutuyor, saatlik
// detay yok - frontend'deki forecast-strip bunu gunluk kart olarak gosteriyor.
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

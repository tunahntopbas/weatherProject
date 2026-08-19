namespace WeatherProject.Domain.Entities;

// Domain katmani - anlik hava durumu bilgisini temsil eden saf is nesnesi.
// Disari bagimliligi yok (EF Core, HTTP client vs. yok), bu yuzden Application
// ve Infrastructure ne kullanirsa kullansin bu sinif degismeden kalir.
// Immutable yapildi (setter yok, hepsi constructor'da set ediliyor) cunku bir
// forecast olusturulduktan sonra degismemeli - yeni sorgu = yeni nesne.
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
        // sehir adi bos gelirse daha asagida (cache key, DB kaydi vs.) anlamsiz
        // hatalarla ugrasmak yerine burada erken patlat
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

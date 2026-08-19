namespace WeatherProject.Infrastructure.ExternalApis;

// appsettings.json'daki "OpenMeteo" bolumunden okunuyor (Program.cs'de
// Configure<OpenMeteoOptions> ile baglaniyor). Varsayilan degerler production URL'leri,
// appsettings override etmezse zaten dogru calisir.
public class OpenMeteoOptions
{
    public const string SectionName = "OpenMeteo";

    public string GeocodingBaseUrl { get; set; } = "https://geocoding-api.open-meteo.com";
    public string ForecastBaseUrl { get; set; } = "https://api.open-meteo.com";
}

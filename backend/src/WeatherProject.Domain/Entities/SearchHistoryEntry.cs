namespace WeatherProject.Domain.Entities;

// Kullanicinin gecmiste hangi sehri ne zaman aradigini tutan kayit.
// Bu entity dogrudan EF Core ile Postgres'e yaziliyor (WeatherDbContext),
// bu yuzden diger entity'lerin aksine setter'lari acik - EF Core migration
// ve tracking mekanizmasi bunu boyle bekliyor.
public class SearchHistoryEntry
{
    public int Id { get; set; }
    public string CityName { get; set; } = string.Empty;
    public DateTime SearchedAtUtc { get; set; }
}

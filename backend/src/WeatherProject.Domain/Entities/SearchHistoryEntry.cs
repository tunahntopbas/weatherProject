namespace WeatherProject.Domain.Entities;

public class SearchHistoryEntry
{
    public int Id { get; set; }
    public string CityName { get; set; } = string.Empty;
    public DateTime SearchedAtUtc { get; set; }
}

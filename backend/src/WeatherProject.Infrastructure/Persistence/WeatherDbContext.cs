using Microsoft.EntityFrameworkCore;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Persistence;

// EF Core'un Postgres ile konustugu yer. Su an tek tablo var (arama gecmisi).
// Connection string Program.cs'de appsettings/ortam degiskeninden okunup buraya
// UseNpgsql ile bagli. Migrations/ klasoru bu context'ten otomatik uretildi
// (dotnet ef migrations add), elle dokunulmuyor.
public class WeatherDbContext : DbContext
{
    public WeatherDbContext(DbContextOptions<WeatherDbContext> options) : base(options)
    {
    }

    public DbSet<SearchHistoryEntry> SearchHistoryEntries => Set<SearchHistoryEntry>();
}

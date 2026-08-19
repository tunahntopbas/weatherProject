using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

// Application katmani Infrastructure'i bilmiyor, sadece bu arayuzu goruyor
// (Dependency Inversion). Gercek implementasyon (Postgres + EF Core) Infrastructure
// projesinde: SearchHistoryRepository.cs
public interface ISearchHistoryRepository
{
    Task AddAsync(SearchHistoryEntry entry, CancellationToken cancellationToken);

    Task<IReadOnlyList<SearchHistoryEntry>> GetRecentAsync(int count, CancellationToken cancellationToken);
}

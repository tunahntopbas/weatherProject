using WeatherProject.Domain.Entities;

namespace WeatherProject.Application.Interfaces;

public interface ISearchHistoryRepository
{
    Task AddAsync(SearchHistoryEntry entry, CancellationToken cancellationToken);

    Task<IReadOnlyList<SearchHistoryEntry>> GetRecentAsync(int count, CancellationToken cancellationToken);
}

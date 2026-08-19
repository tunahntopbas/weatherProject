using Microsoft.EntityFrameworkCore;
using WeatherProject.Application.Interfaces;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Infrastructure.Persistence;

// ISearchHistoryRepository'nin EF Core / Postgres implementasyonu.
// WeatherController her basarili aramadan sonra AddAsync'i cagirip bu tabloya
// kaydediyor - "GetRecentAsync" tarafi ise ileride bir "son aramalar" ozelligi
// icin hazir bekliyor, su an frontend'de kullanilmiyor.
public class SearchHistoryRepository : ISearchHistoryRepository
{
    private readonly WeatherDbContext _context;

    public SearchHistoryRepository(WeatherDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(SearchHistoryEntry entry, CancellationToken cancellationToken)
    {
        _context.SearchHistoryEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SearchHistoryEntry>> GetRecentAsync(int count, CancellationToken cancellationToken)
    {
        return await _context.SearchHistoryEntries
            .OrderByDescending(e => e.SearchedAtUtc)
            .Take(count)
            .ToListAsync(cancellationToken);
    }
}

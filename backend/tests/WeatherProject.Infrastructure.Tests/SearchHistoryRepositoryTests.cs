using Microsoft.EntityFrameworkCore;
using WeatherProject.Domain.Entities;
using WeatherProject.Infrastructure.Persistence;
using Xunit;

namespace WeatherProject.Infrastructure.Tests;

public class SearchHistoryRepositoryTests
{
    private static WeatherDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<WeatherDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new WeatherDbContext(options);
    }

    [Fact]
    public async Task AddAsync_PersistsEntry()
    {
        await using var context = CreateInMemoryContext();
        var repository = new SearchHistoryRepository(context);
        var entry = new SearchHistoryEntry { CityName = "Istanbul", SearchedAtUtc = DateTime.UtcNow };

        await repository.AddAsync(entry, CancellationToken.None);

        Assert.Equal(1, await context.SearchHistoryEntries.CountAsync());
    }

    [Fact]
    public async Task GetRecentAsync_ReturnsMostRecentEntriesFirst()
    {
        await using var context = CreateInMemoryContext();
        var repository = new SearchHistoryRepository(context);

        await repository.AddAsync(
            new SearchHistoryEntry { CityName = "Ankara", SearchedAtUtc = new DateTime(2026, 7, 1) },
            CancellationToken.None);
        await repository.AddAsync(
            new SearchHistoryEntry { CityName = "Izmir", SearchedAtUtc = new DateTime(2026, 7, 28) },
            CancellationToken.None);

        var recent = await repository.GetRecentAsync(1, CancellationToken.None);

        Assert.Single(recent);
        Assert.Equal("Izmir", recent[0].CityName);
    }
}

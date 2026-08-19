using Microsoft.AspNetCore.Mvc;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Api.Controllers;

// Tek endpoint'lik controller: /api/weather/{cityName}. Is mantigini kendi
// icinde tutmuyor, hepsini GetCurrentWeatherHandler'a devrediyor - controller
// sadece HTTP'yi (route, status code) ve gecmis kaydini yonetiyor.
[ApiController]
[Route("api/weather")]
public class WeatherController : ControllerBase
{
    private readonly GetCurrentWeatherHandler _handler;
    private readonly ISearchHistoryRepository _searchHistoryRepository;

    public WeatherController(GetCurrentWeatherHandler handler, ISearchHistoryRepository searchHistoryRepository)
    {
        _handler = handler;
        _searchHistoryRepository = searchHistoryRepository;
    }

    [HttpGet("{cityName}")]
    public async Task<ActionResult<WeatherForecast>> GetCurrent(string cityName, CancellationToken cancellationToken)
    {
        var forecast = await _handler.HandleAsync(cityName, cancellationToken);

        // her basarili sorgu gecmise yaziliyor, cache'ten gelse bile - kullanicinin
        // hangi sehri ne siklikta aradigini gormek icin
        await _searchHistoryRepository.AddAsync(
            new SearchHistoryEntry { CityName = cityName, SearchedAtUtc = DateTime.UtcNow },
            cancellationToken);

        return Ok(forecast);
    }
}

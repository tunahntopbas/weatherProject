using Microsoft.AspNetCore.Mvc;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Domain.Entities;

namespace WeatherProject.Api.Controllers;

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

        await _searchHistoryRepository.AddAsync(
            new SearchHistoryEntry { CityName = cityName, SearchedAtUtc = DateTime.UtcNow },
            cancellationToken);

        return Ok(forecast);
    }
}

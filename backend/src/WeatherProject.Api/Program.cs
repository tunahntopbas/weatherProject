using Microsoft.EntityFrameworkCore;
using Prometheus;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Infrastructure.Caching;
using WeatherProject.Infrastructure.ExternalApis;
using WeatherProject.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.Configure<OpenWeatherMapOptions>(
    builder.Configuration.GetSection(OpenWeatherMapOptions.SectionName));

builder.Services.AddDbContext<WeatherDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

builder.Services.AddHttpClient<IWeatherProvider, OpenWeatherMapProvider>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<OpenWeatherMapOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
});

builder.Services.AddScoped<IWeatherCacheRepository, RedisWeatherCacheRepository>();
builder.Services.AddScoped<ISearchHistoryRepository, SearchHistoryRepository>();
builder.Services.AddScoped<GetCurrentWeatherHandler>();

var app = builder.Build();

if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
    dbContext.Database.Migrate();
}

app.UseHttpMetrics();
app.MapMetrics();

app.MapControllers();
app.Run();

public partial class Program
{
}

using System.Net.Security;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using Microsoft.EntityFrameworkCore;
using Prometheus;
using WeatherProject.Application.Interfaces;
using WeatherProject.Application.Weather;
using WeatherProject.Infrastructure.Caching;
using WeatherProject.Infrastructure.ExternalApis;
using WeatherProject.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.Configure<OpenMeteoOptions>(
    builder.Configuration.GetSection(OpenMeteoOptions.SectionName));

builder.Services.AddDbContext<WeatherDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

var httpClientBuilder = builder.Services.AddHttpClient<IWeatherProvider, OpenMeteoProvider>();
if (builder.Environment.IsDevelopment())
{
    // Kurumsal VPN online CRL/OCSP sorgusunu engelliyor; NoCheck ise firewall/EDR
    // tarafından şüpheli görülüp bağlantıyı resetliyor. Offline modu ortada kalıyor:
    // online sorgu atmaz, zincir doğrulamasını yine de yapar.
    httpClientBuilder.ConfigurePrimaryHttpMessageHandler(() =>
        new SocketsHttpHandler
        {
            SslOptions = new SslClientAuthenticationOptions
            {
                CertificateRevocationCheckMode = X509RevocationMode.NoCheck
            }
        });
}

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

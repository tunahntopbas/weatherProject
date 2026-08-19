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

// asagidaki tum servis kayitlari (DI) burada toplu yapiliyor, .NET'in
// minimal hosting modeli boyle - ayri bir Startup.cs yok
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

// container her ayaga kalktiginda pending migration'lari otomatik uygula -
// ayri bir migration adimi/pipeline stage'i yok, uygulama kendi DB semasini
// kendi guncelliyor. Test ortaminda (WebApplicationFactory) gercek DB olmadigi
// icin bu blok testlerde atlanir.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
    dbContext.Database.Migrate();
}

app.UseHttpMetrics();

// UseExceptionHandler yerine duz try/catch middleware kullanilir: prometheus-net'in
// UseHttpMetrics'i, ASP.NET Core'un UseExceptionHandler'inin re-execution mekanizmasini
// (response'u sifirlayip yeniden calistirmasi) dogru izleyemiyor ve istekler yanlislikla
// code=200 (bazen 404) olarak sayiliyor - bilinen kutuphane sorunu
// (prometheus-net/prometheus-net#354). Duz middleware'de StatusCode next() donmeden once
// normal sekilde set edildigi icin metrik dogru okunur.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception exception)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(exception, "Unhandled exception while processing {Path}", context.Request.Path);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = "Beklenmeyen bir hata olustu." });
    }
});

app.MapMetrics();

app.MapControllers();
app.Run();

public partial class Program
{
}

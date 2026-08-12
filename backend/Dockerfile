FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY WeatherProject.sln ./
COPY src/WeatherProject.Domain/WeatherProject.Domain.csproj src/WeatherProject.Domain/
COPY src/WeatherProject.Application/WeatherProject.Application.csproj src/WeatherProject.Application/
COPY src/WeatherProject.Infrastructure/WeatherProject.Infrastructure.csproj src/WeatherProject.Infrastructure/
COPY src/WeatherProject.Api/WeatherProject.Api.csproj src/WeatherProject.Api/
RUN dotnet restore src/WeatherProject.Api/WeatherProject.Api.csproj

COPY src/ src/
RUN dotnet publish src/WeatherProject.Api/WeatherProject.Api.csproj -c Release -o /app/publish --no-restore

# websense-root-ca.crt: bu makinenin zorunlu kurumsal VPN'i (Ivanti Secure Access)
# tum outbound HTTPS trafigini bir Websense/Forcepoint proxy'sinden geciriyor ve
# kendi sertifikasiyla yeniden imzaliyor. Container'in kendi trust store'u host
# OS'tan izole oldugu icin bu CA'yi ayrica burada guvenilir kilmazsak, dis API
# cagrilari (Open-Meteo) sertifika dogrulama hatasiyla basarisiz olur.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
COPY websense-root-ca.crt /usr/local/share/ca-certificates/websense-root-ca.crt
RUN update-ca-certificates

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "WeatherProject.Api.dll"]

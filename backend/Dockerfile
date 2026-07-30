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

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "WeatherProject.Api.dll"]

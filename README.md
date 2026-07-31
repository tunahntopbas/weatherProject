# WeatherProject

Angular + .NET tabanlı hava durumu uygulaması. DevOps öğrenme projesi olarak; Docker, Kubernetes, CI/CD ve izleme (Grafana/Prometheus) katmanları eklenerek geliştiriliyor.

## Mimari

- **Frontend:** Angular
- **Backend:** ASP.NET Core (.NET 10), katmanlı mimari (Domain / Application / Infrastructure / Api)
- **Veritabanı:** PostgreSQL
- **Cache:** Redis
- **Dış servis:** OpenWeatherMap API

## Yerelde çalıştırma

```bash
cp .env.example .env   # OPENWEATHERMAP_API_KEY değerini gir
docker compose up --build -d
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:5000

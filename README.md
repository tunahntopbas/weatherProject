# WeatherProject

Angular + .NET tabanlı hava durumu uygulaması. DevOps öğrenme projesi olarak; Docker, Kubernetes, CI/CD ve izleme (Grafana/Prometheus) katmanları eklenerek geliştiriliyor.

## Mimari

- **Frontend:** Angular
- **Backend:** ASP.NET Core (.NET 10), katmanlı mimari (Domain / Application / Infrastructure / Api)
- **Veritabanı:** PostgreSQL
- **Cache:** Redis
- **Dış servis:** Open-Meteo API (API anahtarı gerektirmez)

### Sayfalar

- `/` — Anasayfa (hava durumu arama + haftalik tahmin)
- `/favoriler` — Favori sehirler (kalici, canli sicaklik kartlari)
- `/karsilastir` — 2-3 sehri yan yana karsilastirma
- `/harita` — Turkiye'nin 81 iline tiklanabilir harita

Tum fontlar ve foto/harita gorselleri derleme zamaninda `frontend/public/` altina
gomulu (bkz. `frontend/public/CREDITS.md` kaynak/lisans listesi icin) — calisma
zamaninda hicbir CDN/dis kaynak istegi yapilmaz.

## Yerelde çalıştırma

```bash
docker compose up --build -d
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:5000

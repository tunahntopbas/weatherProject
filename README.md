# WeatherProject

Angular + .NET tabanlı hava durumu uygulaması — kurumsal bir yazılımın geçtiği
tüm aşamaları (kod → container → sanal makine → Kubernetes → loglama →
monitoring → CI/CD) uçtan uca uygulayan bir DevOps öğrenme projesi. Mimari
kararların ve gerekçelerinin tamamı için: [`docs/architecture-overview.md`](docs/architecture-overview.md).

## Mimari

- **Frontend:** Angular (`frontend/`)
- **Backend:** ASP.NET Core (.NET 10), katmanlı mimari — Domain / Application / Infrastructure / Api (`backend/`)
- **Veritabanı:** PostgreSQL
- **Cache:** Redis
- **Dış servis:** Open-Meteo API (API anahtarı gerektirmez)
- **Container:** Docker, multi-stage image'lar + docker-compose
- **Orkestrasyon:** Kubernetes (k3s + Rancher), manifestler `k8s/`
- **Loglama:** ElasticSearch + Kibana + Filebeat, `k8s/logging/`
- **Monitoring:** Prometheus + Grafana + node-exporter, `k8s/monitoring/`
- **CI/CD:** GitHub Actions, self-hosted runner — push'ta otomatik build/test/deploy, `.github/workflows/`

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

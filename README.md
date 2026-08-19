# WeatherProject

Şehir adı girip anlık ve haftalık hava durumunu gösteren bir web uygulaması.
Uygulamanın kendisi sade tutuldu; asıl amacım kurumsal bir yazılımın gerçek
hayatta geçtiği tüm aşamaları uçtan uca kendi ellerimle kurup öğrenmekti:
kod yazımından container'a, oradan Kubernetes cluster'ına, loglamaya,
monitoring'e ve son olarak CI/CD ile otomatik deploy'a kadar.

Mimari kararların tamamı ve neden öyle seçildikleri için:
[`docs/architecture-overview.md`](docs/architecture-overview.md).

## Neler var

- **Anasayfa** — şehir arama + günlük/haftalık tahmin
- **Favoriler** — favori şehirleri kalıcı tutar, canlı sıcaklık kartlarıyla gösterir
- **Karşılaştır** — 2-3 şehri yan yana kıyaslar
- **Harita** — Türkiye'nin 81 iline tıklanabilir SVG harita üzerinden erişim

Fontlar ve fotoğraf/harita görselleri derleme zamanında `frontend/public/`
altına gömülü (kaynak/lisans listesi: `frontend/public/CREDITS.md`) —
uygulama çalışırken hiçbir CDN veya dış kaynağa istek atmıyor.

## Mimari ve kullandığım servisler

**Backend — ASP.NET Core (.NET 10), Clean Architecture**
`backend/` altında dört katman: `Domain` (saf iş nesneleri, dış bağımlılığı
yok), `Application` (use case'ler ve arayüzler — `IWeatherProvider`,
`IWeatherCacheRepository`), `Infrastructure` (bu arayüzlerin gerçek
implementasyonları: PostgreSQL/EF Core, Redis, dış hava durumu API'si) ve
`Api` (controller'lar, `Program.cs` içindeki DI kayıtları). Bağımlılıklar
her zaman dıştan içe: iç katmanlar dış katmanlardan habersiz.

**Frontend — Angular**
`frontend/` altında route bazlı 4 sayfa, servis/component ayrımıyla modüler
bir yapı. Backend'e istekler `/api/` üzerinden, nginx reverse-proxy ile
gidiyor — böylece CORS derdi olmuyor ve backend adresi frontend'den saklı
kalıyor (`frontend/nginx.conf`).

**Veritabanı — PostgreSQL**
Arama geçmişini kalıcı tutmak için. Kubernetes'te StatefulSet + headless
Service olarak çalışıyor (`k8s/02-postgres.yaml`).

**Cache — Redis**
Aynı şehir için art arda gelen istekleri dış API'ye tekrar tekrar gitmeden
karşılamak için cache-aside deseni kullanıyorum. Redis burada kalıcı veri
değil, geçici/atılabilir veri tuttuğu için Deployment olarak çalışıyor,
StatefulSet değil (`k8s/03-redis.yaml`).

**Dış servis — Open-Meteo API**
Hava durumu verisinin kaynağı. API anahtarı gerektirmiyor, önce
geocode sonra forecast olmak üzere iki adımlı çağrı yapıyor.

**Container — Docker**
Hem backend hem frontend için multi-stage Dockerfile'lar: build aşaması
ayrı bir katmanda kalıyor, üretilen image'a sadece derlenmiş çıktı
kopyalanıyor. `docker-compose.yml` ile yerelde tüm servisleri (postgres,
redis, backend, frontend) healthcheck'lerle birlikte ayağa kaldırabiliyorum.

**Sanallaştırma — VirtualBox + Ubuntu**
Gerçek bir sunucu parkuru yerine yerelde 3 ayrı VM ile gerçek node'ları
simüle ettim: bir control-plane (`weather-server`) ve iki worker node
(`weather-node2`, `weather-node3`).

**Orkestrasyon — Kubernetes (k3s + Rancher)**
Container'ların çalıştırılması, ölçeklenmesi ve yönetimi `k8s/` altındaki
manifestlerle tanımlı. Rancher, cluster'ı görsel olarak yönetmek için
kullandığım arayüz katmanı. İmajları node'lar arasında dağıtmak için
cluster içinde kendi private Docker registry'imi kurdum
(`k8s/registry/`) — tek node'dan 3 node'a geçince `imagePullPolicy: Never`
ile yerel image aktarımı yetersiz kaldığı için bu adıma geçtim.

**Loglama — ElasticSearch + Kibana + Filebeat**
`k8s/logging/` altında. Filebeat her node'daki container loglarını
toplayıp ElasticSearch'e gönderiyor, Kibana üzerinden arayıp
görselleştiriyorum. Dağıtık sistemde loglar pod'lar arasında dağınık
kaldığı ve pod silindiğinde kaybolduğu için merkezi toplama şart.

**Monitoring — Prometheus + Grafana**
`k8s/monitoring/` altında. Prometheus; node-exporter, kube-state-metrics
ve backend'in kendi `/metrics` endpoint'inden metrikleri periyodik
topluyor, Grafana bu veriyi dashboard'larda gösteriyor
(`k8s/monitoring/04-grafana-provisioning.yaml` ile datasource ve
dashboard'lar otomatik provision ediliyor, elle "Add datasource"
yapmama gerek kalmıyor).

**CI/CD — Azure DevOps Pipelines**
`azure-pipelines/` altında backend ve frontend için ayrı, path-filtreli
pipeline'lar. Self-hosted agent (weather-server üzerinde) kullanıyorum
çünkü deploy hedefi (kubectl, k3s) sadece o makineden erişilebilir.
Push sonrası otomatik build → test → image push → `kubectl rollout` akışı
çalışıyor.

**Ağ erişimi — DNS**
Cluster içi/dışı erişim için `nip.io` wildcard DNS trick'i kullanıyorum
(gerçek domain gerektirmiyor). Global erişim için Cloudflare Tunnel
şablonu da hazır (`k8s/cloudflared-deployment.example.yaml`).

## SOLID ve Clean Architecture

Backend'de SOLID prensiplerinin nasıl uygulandığı ve katman yapısının
detayları için: [`docs/architecture-overview.md`](docs/architecture-overview.md).

## Yerelde çalıştırma

```bash
docker compose up --build -d
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:5000

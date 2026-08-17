# WeatherProject — Mimari Genel Bakış

Bu doküman projenin "neden böyle yapıldığını" anlatır. Her yeni teknoloji
veya karar için: **ne olduğu / neden seçildiği / nasıl kullanılacağı**
sırasıyla açıklanır. Amaç: DevOps stajyerinin projeyi bir defter gibi takip
edip her adımı öğrenerek ilerlemesi.

## 1. Proje Amacı

Kullanıcının şehir girip anlık/haftalık hava durumu görebildiği bir web
uygulaması. Uygulamanın kendisi basit; asıl öğrenme hedefi bu uygulamayı
**kurumsal bir yazılımın geçtiği tüm aşamalardan** geçirmek:

1. Kod (backend + frontend) — Clean Architecture + SOLID
2. Container (Docker)
3. Altyapı (sanal makineler)
4. Orkestrasyon (Kubernetes / Rancher)
5. Gözlemlenebilirlik (loglama + monitoring)
6. Otomasyon (CI/CD)
7. Ağ erişimi (DNS)

Bu sıra rastgele değil: her aşama bir öncekinin üstüne kurulur. Kod
olmadan container olmaz, container olmadan Kubernetes'e deploy edilemez,
deploy olmadan log/monitoring toplanamaz, deploy pipeline'ı olmadan CI/CD
anlamsızdır, uygulama ayakta olmadan DNS ile erişim test edilemez.

## 2. Teknoloji Seçimleri ve Gerekçeleri

| Katman | Teknoloji | Ne işe yarar | Neden seçildi |
|---|---|---|---|
| Backend | .NET (ASP.NET Core Web API) | HTTP API sunucusu | Kurumsal .NET dünyasında en yaygın backend framework; Clean Architecture ile doğal uyumlu; güçlü DI (Dependency Injection) desteği SOLID'i kolaylaştırır |
| Frontend | Angular | Kullanıcı arayüzü (SPA) | Kurumsal projelerde yaygın, TypeScript tabanlı, modüler yapı (component/service) SOLID mantığına yakın |
| Veritabanı | PostgreSQL | Kalıcı veri saklama (örn. arama geçmişi, kullanıcı tercihleri) | Açık kaynak, ücretsiz, kurumsal ortamlarda SQL Server'a alternatif olarak çok tercih edilir |
| Cache | Redis | Sık istenen hava durumu verisini geçici saklama | Dış hava durumu API'sine her istekte gitmemek için; hız kazandırır, dış servis rate-limit'ine takılmayı azaltır |
| Container | Docker | Uygulamayı taşınabilir pakete koyma | Kubernetes'in çalışma birimi container'dır; Docker olmadan K8s'e deploy edilemez |
| Sanallaştırma | VirtualBox + Ubuntu | Kubernetes cluster'ının çalışacağı makineler | Gerçek sunucu yerine yerel ortamda "gerçek makine gibi" 3 ayrı node simüle etmek için |
| Orkestrasyon | Kubernetes (Rancher ile kurulum) | Container'ları çalıştırma, ölçekleme, yönetme | Kurumsal ortamda container yönetimi standardı; Rancher, kurulumu ve yönetimi kolaylaştıran bir arayüz/araç katmanı sunar |
| Loglama | ElasticSearch + Kibana + Filebeat | Uygulama loglarını toplama ve arama/görselleştirme | Dağıtık sistemde (birden fazla pod/node) loglar dağınık olur; merkezi toplama olmadan hata ayıklamak imkansızlaşır. Filebeat, her node'daki container loglarını okuyup ElasticSearch'e gönderen log toplayıcıdır (log shipper) — o olmadan loglar container'ların içinde kilitli kalır ve pod silindiğinde kaybolur |
| Monitoring | Prometheus + Grafana | Metrikleri (CPU, RAM, istek sayısı vb.) toplama ve dashboard'da izleme | Grafana tek başına metrik toplamaz, sadece görselleştirir; Prometheus, node-exporter, kube-state-metrics ve backend'in kendi `/metrics` endpoint'inden metrikleri periyodik olarak toplayıp saklayan bileşendir — Grafana bu veriyi sorgulayıp gösterir |
| CI/CD | Azure DevOps Pipelines | Kod push edilince otomatik build/test/deploy | Manuel deploy hataya açık ve yavaştır; pipeline bunu otomatikleştirir |
| Ağ | DNS (local + global) | Uygulamaya isimle erişim (IP yerine) | `weather.local` gibi bir isimle erişmek IP ezberlemekten daha sürdürülebilir; global DNS ise dışarıdan erişim için gerekir |

## 3. SOLID Prensipleri (Weather App Bağlamında)

SOLID, kodun değişime dayanıklı ve test edilebilir olmasını sağlayan 5
prensiptir. Backend'de (.NET) uygulanacak somut örnekler:

- **S — Single Responsibility (Tek Sorumluluk):** `WeatherService` sadece
  hava durumu verisi getirir; loglama, cache yönetimi ayrı sınıflarda olur.
  Bir sınıfın değişme sebebi tek olmalı.
- **O — Open/Closed (Açık/Kapalı):** Yeni bir hava durumu sağlayıcısı
  (örn. OpenWeatherMap'ten başka bir API'ye geçiş) eklerken mevcut kodu
  değiştirmeden, `IWeatherProvider` arayüzünü yeni bir sınıfla implemente
  ederek eklenir.
- **L — Liskov Substitution:** `IWeatherProvider` arayüzünü implemente eden
  her sınıf (`OpenWeatherMapProvider`, `MockWeatherProvider` gibi) birbirinin
  yerine sorunsuz geçebilmeli.
- **I — Interface Segregation:** `IWeatherProvider` sadece hava durumu
  metodları içerir; kullanılmayan metodları implemente etmeye zorlayan şişkin
  arayüzlerden kaçınılır.
- **D — Dependency Inversion:** `Application` katmanı `Infrastructure`
  katmanına değil, kendi tanımladığı `IWeatherProvider` arayüzüne bağımlı
  olur. Gerçek implementasyon (`Infrastructure`) bu arayüzü doldurur.

## 4. Clean Architecture Katmanları

Katmanlar **bağımlılık kuralı (Dependency Rule)** ile çalışır: bağımlılıklar
daima dıştan içe doğrudur — dış katmanlar iç katmanlara bağımlı olabilir, iç
katmanlar dış katmanlardan habersizdir.

```
WeatherProject.Api            <- Presentation: HTTP controller'lar, Program.cs
  -> WeatherProject.Infrastructure  <- Dış dünya: PostgreSQL (EF Core), Redis, dış hava durumu API'si
    -> WeatherProject.Application  <- İş kuralları, use case'ler, arayüzler (IWeatherProvider, IWeatherCacheRepository)
      -> WeatherProject.Domain     <- Saf iş nesneleri (Entity'ler), dışarıya hiçbir bağımlılığı yok
```

- **Domain:** `City`, `WeatherForecast` gibi saf C# sınıfları. Hiçbir NuGet
  paketine (EF Core, HTTP client vb.) bağımlı değildir.
- **Application:** Use case'ler (`GetCurrentWeatherQuery` gibi) ve
  Domain/Infrastructure arasındaki arayüzler (`IWeatherProvider`,
  `IWeatherCacheRepository`) burada tanımlanır.
- **Infrastructure:** Application katmanındaki arayüzlerin gerçek
  implementasyonları — PostgreSQL erişimi (EF Core `DbContext`), Redis
  bağlantısı, dış hava durumu API'sine HTTP çağrısı.
- **Api:** ASP.NET Core controller'ları, `Program.cs` içinde Dependency
  Injection kayıtları (`IWeatherProvider` -> `OpenMeteoProvider` gibi).

Bu yapı Plan 2'de (`02-backend-dotnet.md`) birebir solution/proje adları
olarak kullanılacaktır: `WeatherProject.Domain`, `WeatherProject.Application`,
`WeatherProject.Infrastructure`, `WeatherProject.Api`.

## 5. Uygulama Sırası ve Durumu

Aşağıdaki 9 aşama, sırasıyla tamamlandı — her aşama bir öncekinin ürettiği
bileşenlerin üzerine kuruldu:

1. **.NET backend** — Clean Architecture (Domain/Application/Infrastructure/Api), PostgreSQL, Redis (`backend/`)
2. **Angular arayüz** — 4 sayfalı SPA, gerçek routing (`frontend/`)
3. **Docker** — multi-stage image'lar + docker-compose (`docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`)
4. **VirtualBox + Ubuntu VM** — Kubernetes'in çalışacağı sunucu ortamı
5. **Kubernetes (k3s + Rancher)** — cluster kurulumu, uygulama deploy'u (`k8s/`)
6. **Loglama (ELK)** — ElasticSearch + Kibana + Filebeat (`k8s/logging/`)
7. **Monitoring (Prometheus + Grafana)** — metrik toplama + dashboard (`k8s/monitoring/`)
8. **CI/CD (Azure DevOps Pipelines)** — push'ta otomatik build/test/deploy (`azure-pipelines/`), self-hosted agent ile k3s'e deploy. Detaylı anlatım: `docs/08-cicd-azure-devops.md`
9. **DNS erişimi** — `nip.io` ile isimle erişim (yerel), Cloudflare Tunnel şablonu hazır (global, `k8s/cloudflared-deployment.example.yaml`)

Planlanandan sapan kararlar (tek node vs. 3 node gibi) ve gerekçeleri
projenin geliştirme sürecinde belgelendi. CI/CD katmanı önce GitHub Actions
ile kuruldu, sonra orijinal plana dönülerek Azure DevOps Pipelines'a
taşındı — bu geçişin gerekçesi ve adımları `docs/08-cicd-azure-devops.md`
içinde.

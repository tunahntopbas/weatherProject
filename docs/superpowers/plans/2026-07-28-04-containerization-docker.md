# Containerization (Docker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend'i (`02-backend-dotnet.md`) ve frontend'i (`03-frontend-angular.md`) Docker image'larına paketlemek ve `docker-compose` ile PostgreSQL + Redis dahil tüm sistemi tek komutla ayağa kaldırmak. Bu, `06-kubernetes-rancher.md`'nin deploy edeceği image'ların temelidir.

**Architecture:** Her servis (backend, frontend) için çok aşamalı (multi-stage) Dockerfile: build aşaması (SDK/Node) + çalıştırma aşaması (küçük runtime image). `docker-compose.yml` tüm servisleri (postgres, redis, backend, frontend) bir araya getirir ve local geliştirme/test ortamı sağlar.

**Tech Stack:** Docker, Docker Compose, nginx (frontend static dosyaları sunmak ve `/api` isteklerini backend'e proxy'lemek için).

## Global Constraints

- Backend container'ı `8080` portunda dinler (`ASPNETCORE_URLS=http://+:8080`), bkz. `02-backend-dotnet.md`
- Frontend production build çıktısı `frontend/dist/frontend/browser` altında (bkz. `03-frontend-angular.md` Task 4)
- Frontend'in prod ortamda `apiBaseUrl` değeri boş string (`''`) — istekler göreli `/api/...` yoluna gider, nginx bunu backend'e proxy'ler (bkz. `03-frontend-angular.md` Task 2)
- Hiçbir sır (API key, DB şifresi) image içine gömülmez; ortam değişkeni olarak geçirilir

---

### Task 1: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Consumes: `backend/WeatherProject.sln` ve tüm `src/` (bkz. `02-backend-dotnet.md`)
- Produces: `weatherproject-backend` image, `8080` portunda HTTP servisi. Task 3 (docker-compose) ve `06-kubernetes-rancher.md` bu image'ı kullanacak.

- [ ] **Step 1: `.dockerignore` dosyasını oluştur**

```
# backend/.dockerignore
**/bin/
**/obj/
**/.vs/
**/*.user
```

- [ ] **Step 2: Dockerfile'ı yaz**

```dockerfile
# backend/Dockerfile
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
```

**Neden bu tasarım:** İlk `RUN dotnet restore` sadece `.csproj` dosyaları kopyalandıktan sonra çalışır; kaynak kod (`src/`) değiştiğinde ama proje referansları değişmediğinde Docker bu katmanı yeniden kullanır (layer cache) — her kod değişikliğinde tüm NuGet paketlerini yeniden indirmez.

- [ ] **Step 3: Image'ı build et**

```bash
cd backend
docker build -t weatherproject-backend -f Dockerfile .
```

Expected: `Successfully tagged weatherproject-backend:latest`

- [ ] **Step 4: Container'ı çalıştır ve doğrula**

```bash
docker run --rm -p 5000:8080 --name weatherproject-backend-test weatherproject-backend
```

Başka bir terminalde:

```bash
curl -i http://localhost:5000/api/weather/Istanbul
```

Expected: HTTP 500 (henüz PostgreSQL/Redis bağlantısı yok — bu adımda beklenen budur, sadece container'ın ayakta kalıp HTTP cevabı verdiğini doğruluyoruz). Container'ı durdur: `Ctrl+C` veya `docker stop weatherproject-backend-test`.

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "chore(docker): backend icin multi-stage Dockerfile"
```

---

### Task 2: Frontend Dockerfile ve nginx yapılandırması

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `frontend/.dockerignore`

**Interfaces:**
- Consumes: `frontend/package.json`, `frontend/src/` (bkz. `03-frontend-angular.md`)
- Produces: `weatherproject-frontend` image, `80` portunda statik dosya + `/api/` proxy. Task 3 bu image'ı kullanacak.

- [ ] **Step 1: `.dockerignore` dosyasını oluştur**

```
# frontend/.dockerignore
node_modules/
dist/
.angular/
```

- [ ] **Step 2: nginx yapılandırmasını yaz**

```nginx
# frontend/nginx.conf
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Neden `backend:8080`:** Docker Compose (Task 3) ve Kubernetes Service (bkz. `06-kubernetes-rancher.md`) aynı mantıkla çalışır — container'lar birbirine IP yerine servis adıyla ulaşır. `backend` burada docker-compose'daki servis adıdır.

- [ ] **Step 3: Dockerfile'ı yaz**

```dockerfile
# frontend/Dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 4: Image'ı build et**

```bash
cd frontend
docker build -t weatherproject-frontend -f Dockerfile .
```

Expected: `Successfully tagged weatherproject-frontend:latest`

- [ ] **Step 5: Container'ı tek başına çalıştır ve doğrula**

```bash
docker run --rm -p 8081:80 --name weatherproject-frontend-test weatherproject-frontend
```

```bash
curl -i http://localhost:8081/
```

Expected: HTTP 200, `<title>Frontend</title>` (veya Angular'ın ürettiği başlık) içeren HTML. Container'ı durdur: `docker stop weatherproject-frontend-test`.

- [ ] **Step 6: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore
git commit -m "chore(docker): frontend icin multi-stage Dockerfile ve nginx proxy"
```

---

### Task 3: docker-compose ile tüm sistemi birlikte çalıştırma

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Consumes: `weatherproject-backend` image (Task 1), `weatherproject-frontend` image (Task 2)
- Produces: local olarak `http://localhost:8081` üzerinden erişilebilen tam çalışan sistem. `09-cicd-azure-devops.md`'de pipeline bu image'ları build edip registry'ye push edecek; `06-kubernetes-rancher.md`'de aynı servisler Kubernetes manifest'lerine çevrilecek.

- [ ] **Step 1: `.env.example` dosyasını oluştur**

```
# .env.example
OPENWEATHERMAP_API_KEY=REPLACE_WITH_REAL_KEY
```

- [ ] **Step 2: `docker-compose.yml` dosyasını yaz**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: weatherproject
      POSTGRES_USER: weatherproject
      POSTGRES_PASSWORD: changeme
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U weatherproject -d weatherproject"]
      interval: 2s
      timeout: 3s
      retries: 15

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 15

  backend:
    build:
      context: ./backend
    environment:
      ConnectionStrings__Postgres: "Host=postgres;Port=5432;Database=weatherproject;Username=weatherproject;Password=changeme"
      ConnectionStrings__Redis: "redis:6379"
      OpenWeatherMap__ApiKey: "${OPENWEATHERMAP_API_KEY}"
    ports:
      - "5000:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
    ports:
      - "8081:80"
    depends_on:
      - backend

volumes:
  postgres-data:
```

**Neden `healthcheck` + `condition: service_healthy` (plan yazilirken atlanan bir detay):** `depends_on` tek basina sadece container'in *baslatildigini* bekler, icindeki servisin *baglanti kabul etmeye hazir* oldugunu degil. Postgres process'i basladiktan birkac saniye sonra dinlemeye baslar; bu sirada backend hemen `Database.Migrate()` calistirip `Connection refused` ile coker. Healthcheck, Postgres/Redis gercekten hazir olana kadar backend'in baslamasini erteler.

- [ ] **Step 3: `.env` dosyanı oluştur (gerçek anahtarla, commit edilmeyecek)**

```bash
cp .env.example .env
```

`.env` dosyasını aç, `OPENWEATHERMAP_API_KEY` değerini gerçek OpenWeatherMap API anahtarınla değiştir.

- [ ] **Step 4: `.gitignore`'a `.env` ekle**

```bash
echo ".env" >> .gitignore
```

- [ ] **Step 5: Tüm sistemi ayağa kaldır**

```bash
docker compose up --build -d
docker compose ps
```

Expected: `postgres`, `redis`, `backend`, `frontend` servisleri `running`/`healthy` durumda.

- [ ] **Step 6: Uçtan uca doğrula**

```bash
curl -i http://localhost:8081/api/weather/Istanbul
```

Expected: HTTP 200, JSON gövde `{"cityName":"Istanbul","date":"...","temperatureCelsius":...,"description":"..."}`. Bu istek sırasıyla: frontend nginx -> backend container -> Redis (cache miss) -> OpenWeatherMap -> PostgreSQL'e arama kaydı yazma zincirini test eder.

- [ ] **Step 7: Sistemi kapat**

```bash
docker compose down
```

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "chore(docker): docker-compose ile postgres, redis, backend, frontend orkestrasyonu"
```

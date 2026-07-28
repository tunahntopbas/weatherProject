# Monitoring (Prometheus + Grafana) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Node'ların (CPU/RAM), cluster'ın (pod/deployment durumu) ve backend uygulamasının (HTTP istek sayısı) metriklerini toplayıp Grafana'da görselleştirmek.

**Architecture:** Grafana tek başına metrik **toplamaz**, sadece **gösterir** — bir veri kaynağına ihtiyacı vardır. Bu yüzden bu planda önce metrik toplayan bileşenler kurulur (`node-exporter`: node donanım metrikleri, `kube-state-metrics`: Kubernetes nesne durumu, backend'in kendi `/metrics` endpoint'i), sonra bunları periyodik olarak toplayıp saklayan **Prometheus**, en sonda da Prometheus'u sorgulayıp dashboard çizen **Grafana** kurulur.

**Tech Stack:** Prometheus, node-exporter, kube-state-metrics, `prometheus-net.AspNetCore` (.NET metrik kütüphanesi), Grafana.

## Global Constraints

- Namespace: `monitoring`
- Prometheus verisi `emptyDir` üzerinde tutulacak (pod yeniden başlarsa geçmiş metrikler kaybolur) — bu bilinçli bir sadeleştirmedir: monitoring verisi (aksine `postgres`/`elasticsearch`'teki gibi) burada öğrenme amaçlı, kaybı kritik değil. Gerçek bir üretim ortamında Prometheus da kalıcı disk (`PersistentVolumeClaim`) kullanır.
- Node metrikleri node IP'leri üzerinden doğrudan toplanacak (`192.168.56.11/12/13:9100`), bu sayede Prometheus'a Kubernetes API'sini sorgulama izni (RBAC) vermeye gerek kalmaz — basit ve öğrenmesi kolay bir başlangıç noktası

---

### Task 1: node-exporter DaemonSet — node donanım metrikleri

**Files:**
- Create: `k8s/monitoring/namespace.yaml`
- Create: `k8s/monitoring/node-exporter-daemonset.yaml`

**Interfaces:**
- Consumes: 3 node (bkz. `05-virtualbox-ubuntu-vm.md`)
- Produces: her node'un `9100` portunda Prometheus formatında CPU/RAM/disk metrikleri. Task 3'teki Prometheus bu portları scrape edecek.

**Neden DaemonSet:** `07-logging-elk.md`'deki Filebeat ile aynı mantık — her node'un kendi donanım metriğini ölçmek için o node'da bir kopya çalışmalı.

- [ ] **Step 1: Namespace'i oluştur**

```yaml
# k8s/monitoring/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
```

```powershell
kubectl apply -f k8s/monitoring/namespace.yaml
```

- [ ] **Step 2: node-exporter manifest'ini yaz**

```yaml
# k8s/monitoring/node-exporter-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:v1.8.2
          args:
            - "--path.procfs=/host/proc"
            - "--path.sysfs=/host/sys"
            - "--path.rootfs=/host/root"
          ports:
            - containerPort: 9100
              hostPort: 9100
          volumeMounts:
            - name: proc
              mountPath: /host/proc
              readOnly: true
            - name: sys
              mountPath: /host/sys
              readOnly: true
            - name: root
              mountPath: /host/root
              readOnly: true
      volumes:
        - name: proc
          hostPath:
            path: /proc
        - name: sys
          hostPath:
            path: /sys
        - name: root
          hostPath:
            path: /
```

**Neden `hostNetwork: true`:** node-exporter, node'un **kendi** ağ arayüzü üzerinden (container'ın izole ağı yerine) erişilebilir olmalı — Prometheus'un doğrudan `192.168.56.11:9100` gibi bir node IP'sine bağlanabilmesi için. `hostPID`/`hostPath` mount'ları ise container'ın node'un gerçek `/proc`, `/sys` bilgisine (CPU, bellek, disk istatistikleri buradan okunur) erişmesini sağlar.

- [ ] **Step 3: Uygula ve doğrula**

```powershell
kubectl apply -f k8s/monitoring/node-exporter-daemonset.yaml
kubectl get pods -n monitoring -l app=node-exporter -o wide
```

Expected: 3 pod, her biri farklı bir node'da (`NODE` sütunu), `Running`.

```powershell
curl http://192.168.56.11:9100/metrics | Select-String "node_cpu_seconds_total" | Select-Object -First 3
```

Expected: `node_cpu_seconds_total{...}` ile başlayan birkaç metrik satırı.

- [ ] **Step 4: Commit**

```bash
git add k8s/monitoring/namespace.yaml k8s/monitoring/node-exporter-daemonset.yaml
git commit -m "feat(monitoring): node-exporter daemonset"
```

---

### Task 2: kube-state-metrics — cluster nesne durumu

**Files:** Yok (resmi upstream manifestleri kullanılacak)

**Interfaces:**
- Consumes: yok
- Produces: `kube-state-metrics.kube-system.svc.cluster.local:8080` — pod/deployment/statefulset sayısı ve durumu gibi metrikler. Task 3'teki Prometheus bunu scrape edecek.

**Neden node-exporter'dan farklı bir bileşen gerekiyor:** node-exporter donanımı (CPU/RAM) ölçer, ama "kaç pod `Running`", "bir Deployment'ın istenen replica sayısı ile gerçek replica sayısı eşleşiyor mu" gibi **Kubernetes nesnelerinin durumunu** ölçmez. Bunun için ayrı ve resmi bir araç olan `kube-state-metrics` kullanılır (kendi RBAC ve manifestleri Kubernetes projesi tarafından bakımı yapılır, elle yazmak yerine resmi sürüme referans vermek daha güvenilirdir).

- [ ] **Step 1: Resmi manifestleri uygula (pinned sürüm: v2.13.0)**

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v2.13.0/examples/standard/cluster-role-binding.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v2.13.0/examples/standard/cluster-role.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v2.13.0/examples/standard/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v2.13.0/examples/standard/service-account.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v2.13.0/examples/standard/service.yaml
```

- [ ] **Step 2: Doğrula**

```powershell
kubectl get pods -n kube-system -l app.kubernetes.io/name=kube-state-metrics
```

Expected: pod `Running`.

```powershell
kubectl run curl-test --rm -i --restart=Never --image=curlimages/curl -- curl -s http://kube-state-metrics.kube-system.svc.cluster.local:8080/metrics | Select-String "kube_pod_status_phase" | Select-Object -First 3
```

Expected: `kube_pod_status_phase{...}` metrik satırları görünür.

---

### Task 3: Prometheus — metrik toplama ve saklama

**Files:**
- Create: `k8s/monitoring/prometheus-configmap.yaml`
- Create: `k8s/monitoring/prometheus-deployment.yaml`

**Interfaces:**
- Consumes: `node-exporter:9100` (Task 1), `kube-state-metrics:8080` (Task 2), backend `/metrics` (Task 4 — henüz yokken bu hedef `DOWN` görünecek, Task 4'te düzelecek)
- Produces: `prometheus.monitoring.svc.cluster.local:9090` — Task 5'te Grafana'nın veri kaynağı olacak.

- [ ] **Step 1: Scrape yapılandırmasını yaz**

```yaml
# k8s/monitoring/prometheus-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s

    scrape_configs:
      - job_name: 'node-exporter'
        static_configs:
          - targets:
              - '192.168.56.11:9100'
              - '192.168.56.12:9100'
              - '192.168.56.13:9100'

      - job_name: 'kube-state-metrics'
        static_configs:
          - targets: ['kube-state-metrics.kube-system.svc.cluster.local:8080']

      - job_name: 'weatherproject-backend'
        metrics_path: /metrics
        static_configs:
          - targets: ['backend.weatherproject.svc.cluster.local:8080']
```

**Not:** `weatherproject-backend` hedefi Service DNS'i üzerinden tek noktadan scrape eder; `backend` birden fazla replikaya sahip olsa bile Prometheus her seferinde Service'in yönlendirdiği rastgele bir pod'u görür. Çoklu replika başına ayrı ayrı metrik toplamak isteseydik Kubernetes service discovery (`kubernetes_sd_configs`) kullanmamız gerekirdi — bu, öğrenmenin bir sonraki adımı olarak not düşülür, bu planın kapsamı dışındadır.

- [ ] **Step 2: Prometheus Deployment ve Service'ini yaz**

```yaml
# k8s/monitoring/prometheus-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
        - name: prometheus
          image: prom/prometheus:v2.54.1
          args:
            - "--config.file=/etc/prometheus/prometheus.yml"
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
      volumes:
        - name: config
          configMap:
            name: prometheus-config
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitoring
spec:
  selector:
    app: prometheus
  ports:
    - port: 9090
      targetPort: 9090
```

- [ ] **Step 3: Uygula ve doğrula**

```powershell
kubectl apply -f k8s/monitoring/prometheus-configmap.yaml
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
kubectl get pods -n monitoring -l app=prometheus
```

Expected: pod `Running`.

Port-forward ile Prometheus UI'ı geçici olarak host'a aç:

```powershell
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

Tarayıcıdan `http://localhost:9090/targets` adresine git.

Expected: `node-exporter` (3 hedef) ve `kube-state-metrics` (1 hedef) `UP` durumda; `weatherproject-backend` henüz `DOWN` (Task 4'ten önce bekleniyor, çünkü backend'de `/metrics` yok).

- [ ] **Step 4: Commit**

```bash
git add k8s/monitoring/prometheus-configmap.yaml k8s/monitoring/prometheus-deployment.yaml
git commit -m "feat(monitoring): prometheus deployment ve scrape yapilandirmasi"
```

---

### Task 4: Backend'e Prometheus metrik endpoint'i ekle

**Files:**
- Modify: `backend/src/WeatherProject.Api/WeatherProject.Api.csproj`
- Modify: `backend/src/WeatherProject.Api/Program.cs`
- Modify: `k8s/backend-deployment.yaml`

**Interfaces:**
- Consumes: `02-backend-dotnet.md` Task 7'deki `Program.cs`
- Produces: `GET /metrics` endpoint'i (backend container'ının `8080` portunda). Task 3'teki Prometheus job'ı bunu artık `UP` görecek.

- [ ] **Step 1: NuGet paketini ekle**

```bash
cd backend
dotnet add src/WeatherProject.Api package prometheus-net.AspNetCore
```

- [ ] **Step 2: `Program.cs`'e metrik toplama ve `/metrics` endpoint'ini ekle**

```csharp
// backend/src/WeatherProject.Api/Program.cs
// ... mevcut using'lerin altina:
using Prometheus;

// ... "var app = builder.Build();" satirindan hemen sonra, app.MapControllers()'dan once:
app.UseHttpMetrics();
app.MapMetrics();

app.MapControllers();
app.Run();
```

**Neden `UseHttpMetrics()` + `MapMetrics()` ikisi birden:** `UseHttpMetrics()` her gelen HTTP isteğini otomatik sayar/süresini ölçer (`http_request_duration_seconds` gibi metrikler üretir); `MapMetrics()` ise bu toplanan metrikleri `/metrics` yolunda Prometheus'un okuyabileceği text formatında dışarı açar. Biri toplar, diğeri sunar.

- [ ] **Step 3: Image'ı yeniden build et ve push et**

```bash
docker build -t weatherproject-backend -f backend/Dockerfile backend/
docker tag weatherproject-backend <dockerhub-kullanici-adi>/weatherproject-backend:latest
docker push <dockerhub-kullanici-adi>/weatherproject-backend:latest
```

- [ ] **Step 4: `k8s/backend-deployment.yaml`'a `imagePullPolicy: Always` ekle**

```yaml
# k8s/backend-deployment.yaml içinde containers[0] altına eklenecek satır:
          imagePullPolicy: Always
```

**Neden gerekli:** Image'ı `:latest` etiketiyle kullanıyoruz. Kubernetes varsayılan olarak `:latest` etiketli image'lar için bile bazen node'da zaten var olan (eski) kopyayı kullanabilir. `imagePullPolicy: Always`, her pod yeniden başlatıldığında registry'den image'ın güncel halinin çekilmesini garanti eder — aksi halde `kubectl rollout restart` yapsan bile eski (metriksiz) kod çalışmaya devam edebilir.

- [ ] **Step 5: Değişiklikleri uygula ve yeniden başlat**

```powershell
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout restart deployment backend -n weatherproject
kubectl rollout status deployment backend -n weatherproject
```

Expected: `deployment "backend" successfully rolled out`

- [ ] **Step 6: `/metrics` endpoint'ini doğrula**

```powershell
kubectl run curl-test --rm -i --restart=Never --image=curlimages/curl -- curl -s http://backend.weatherproject.svc.cluster.local:8080/metrics | Select-String "http_request" | Select-Object -First 5
```

Expected: `http_request_duration_seconds_...` ile başlayan metrik satırları.

Prometheus `/targets` sayfasını tekrar kontrol et (`kubectl port-forward -n monitoring svc/prometheus 9090:9090`): `weatherproject-backend` artık `UP`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/WeatherProject.Api/WeatherProject.Api.csproj backend/src/WeatherProject.Api/Program.cs k8s/backend-deployment.yaml
git commit -m "feat(backend): prometheus /metrics endpoint ekle"
```

---

### Task 5: Grafana kurulumu ve Prometheus veri kaynağı

**Files:**
- Create: `k8s/monitoring/grafana-deployment.yaml`

**Interfaces:**
- Consumes: `prometheus.monitoring.svc.cluster.local:9090` (Task 3)
- Produces: `NodePort 30300` üzerinden erişilebilen Grafana UI + tanımlı Prometheus veri kaynağı. Task 6 bunun üzerine dashboard kuracak.

- [ ] **Step 1: Manifest'i yaz**

```yaml
# k8s/monitoring/grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:11.1.4
          ports:
            - containerPort: 3000
          env:
            - name: GF_SECURITY_ADMIN_PASSWORD
              value: "changeme"
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
spec:
  type: NodePort
  selector:
    app: grafana
  ports:
    - port: 3000
      targetPort: 3000
      nodePort: 30300
```

- [ ] **Step 2: Uygula ve giriş yap**

```powershell
kubectl apply -f k8s/monitoring/grafana-deployment.yaml
kubectl get pods -n monitoring -l app=grafana
```

Expected: pod `Running`.

Tarayıcıdan `http://192.168.56.11:30300` adresine git, `admin` / `changeme` ile giriş yap (ilk girişte şifre değiştirmeyi Grafana önerecektir, öğrenme ortamında atlanabilir).

- [ ] **Step 3: Prometheus veri kaynağını ekle**

Grafana UI > Connections > Data sources > Add data source > Prometheus. URL alanına:

```
http://prometheus.monitoring.svc.cluster.local:9090
```

"Save & Test" tıkla.

Expected: `Successfully queried the Prometheus API.` mesajı.

- [ ] **Step 4: Commit**

```bash
git add k8s/monitoring/grafana-deployment.yaml
git commit -m "feat(monitoring): grafana deployment ve prometheus veri kaynagi"
```

---

### Task 6: Dashboard oluşturma

**Files:** Yok (Grafana UI üzerinden, Grafana'nın kendi veritabanında saklanır)

**Interfaces:**
- Consumes: Prometheus veri kaynağı (Task 5)
- Produces: iki dashboard — node donanım metrikleri (hazır community dashboard) ve backend HTTP istek oranı (elle oluşturulan basit panel)

- [ ] **Step 1: Hazır node-exporter dashboard'unu içe aktar**

Grafana UI > Dashboards > New > Import. Dashboard ID alanına `1860` (Grafana Labs'ın topluluk kataloğundaki resmi "Node Exporter Full" dashboard'u) gir, "Load" tıkla, veri kaynağı olarak Task 5'te eklediğin Prometheus'u seç, "Import" tıkla.

Expected: CPU, RAM, disk, network grafiklerini içeren hazır bir dashboard açılır, 3 node için veri gösterir (üstteki node seçiciden `node1`/`node2`/`node3` arasında geçiş yapılabilir).

- [ ] **Step 2: Backend için basit bir dashboard oluştur**

Grafana UI > Dashboards > New > New Dashboard > Add visualization > Prometheus veri kaynağını seç.

Panel 1 — "Backend HTTP İstek Oranı":
```
sum(rate(http_request_duration_seconds_count{job="weatherproject-backend"}[1m]))
```

Panel 2 — "Backend Ayakta mı":
```
up{job="weatherproject-backend"}
```

Dashboard'u "WeatherProject - Backend" ismiyle kaydet.

- [ ] **Step 3: Dashboard'u doğrula**

```powershell
curl http://192.168.56.11:30080/api/weather/Istanbul
curl http://192.168.56.11:30080/api/weather/Ankara
curl http://192.168.56.11:30080/api/weather/Izmir
```

Grafana'daki "WeatherProject - Backend" dashboard'una dön, "Backend HTTP İstek Oranı" panelinde birkaç saniye içinde bir yükselme görülmeli (dashboard'un sağ üstünden "Refresh" ile yenile veya otomatik yenilemeyi 5s'e ayarla).

Expected: panelde az önce atılan 3 isteğe karşılık gelen bir artış görünür; "Backend Ayakta mı" paneli `1` değerini gösterir.

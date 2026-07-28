# Kubernetes Cluster (Rancher) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `05-virtualbox-ubuntu-vm.md`'de hazırlanan 3 node üzerinde Rancher ile bir Kubernetes cluster'ı kurmak, `kubectl` CLI ile temel Kubernetes komutlarını öğrenmek, ve `04-containerization-docker.md`'de üretilen backend/frontend image'larını bu cluster'a deploy etmek.

**Architecture:** `node1` hem Rancher yönetim sunucusunu (Docker container olarak) hem de cluster'daki `etcd + Control Plane + Worker` rolünü taşır. `node2` ve `node3` sadece `Worker` rolündedir. Rancher, "Custom Cluster" akışıyla bu 3 node'u RKE (Rancher Kubernetes Engine) kullanarak bir Kubernetes cluster'ına dönüştürür. Uygulama bileşenleri (`postgres`, `redis`, `backend`, `frontend`) bu cluster içinde ayrı Kubernetes kaynakları (Deployment/StatefulSet + Service) olarak çalışır.

**Tech Stack:** Docker (node'larda), Rancher (`rancher/rancher` image), RKE (Rancher'ın Kubernetes kurulum motoru), `kubectl`, Docker Hub (image registry).

## Global Constraints

- Node IP'leri Task `05-virtualbox-ubuntu-vm.md`'den: `node1=192.168.56.11`, `node2=192.168.56.12`, `node3=192.168.56.13`
- Cluster adı: `weatherproject-cluster`, namespace: `weatherproject`
- Image'lar Docker Hub'da `<dockerhub-kullanici-adi>/weatherproject-backend` ve `<dockerhub-kullanici-adi>/weatherproject-frontend` olarak yayınlanacak (RKE node'ları yerel makinede build edilen image'lara doğrudan erişemez, bir registry şart)
- Sırlar (DB şifresi, API key) asla düz metin YAML olarak commit edilmeyecek; `kubectl create secret` ile imperative oluşturulacak

---

### Task 1: Tüm node'lara Docker kur, Rancher server'ı node1'de çalıştır

**Files:** Yok

**Interfaces:**
- Consumes: `node1`, `node2`, `node3` (bkz. `05-virtualbox-ubuntu-vm.md`)
- Produces: `https://192.168.56.11` üzerinden erişilebilen Rancher UI. Task 3 bu UI üzerinden cluster oluşturacak.

**Neden Docker her node'da gerekli:** RKE, Kubernetes bileşenlerinin (`kubelet`, `etcd`, `kube-apiserver` vb.) her birini birer Docker container olarak çalıştırır. Rancher'ın kendisi de (yönetim arayüzü) bir Docker container'dır. Yani hem "Rancher'ı çalıştırmak" hem de "Rancher'ın yöneteceği node'lar" için Docker ön koşuldur.

- [ ] **Step 1: Üç node'a da Docker'ı kur**

Host makineden her node'a SSH ile bağlanıp çalıştır (veya konsoldan elle):

```bash
ssh devops@192.168.56.11 "curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker devops"
ssh devops@192.168.56.12 "curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker devops"
ssh devops@192.168.56.13 "curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker devops"
```

Her node'a tekrar SSH ile bağlan (grup üyeliğinin etkili olması için) ve doğrula:

```bash
ssh devops@192.168.56.11 "docker --version"
```

Expected: `Docker version 2x.x.x, build ...`

- [ ] **Step 2: node1'de Rancher container'ını başlat**

```bash
ssh devops@192.168.56.11
docker run -d --restart=unless-stopped \
  -p 80:80 -p 443:443 \
  --privileged \
  --name rancher-server \
  rancher/rancher:latest
```

- [ ] **Step 3: Bootstrap şifresini al**

```bash
docker logs rancher-server 2>&1 | grep "Bootstrap Password:"
```

Expected: `Bootstrap Password: <rastgele-uretilmis-sifre>` satırı. Bu şifreyi not al.

- [ ] **Step 4: Rancher UI'a eriş**

Host makinede tarayıcıdan `https://192.168.56.11` adresine git (self-signed sertifika uyarısı normaldir, "Devam Et / Advanced > Proceed" ile geç). Bootstrap şifresiyle giriş yap, yeni bir yönetici şifresi belirle.

Expected: Rancher "Cluster Management" ana ekranı görünür, henüz hiçbir downstream cluster listelenmez (sadece Rancher'ın kendi `local` cluster'ı görünür).

- [ ] **Step 5: Commit (not amaçlı — kod değil ama işlem kaydı için)**

Bu task kod üretmez; `docs/architecture-overview.md`'ye "Rancher URL: https://192.168.56.11" notunu eklemek istersen elle ekleyip commit edebilirsin. Zorunlu değil, sonraki task'lar buna bağımlı değil.

---

### Task 2: kubectl CLI'ı host makineye kur

**Files:** Yok

**Interfaces:**
- Consumes: yok
- Produces: host makinede çalışan `kubectl` komutu. Task 3'te cluster'a bağlanmak için kullanılacak.

- [ ] **Step 1: kubectl'i indir (Windows)**

```powershell
curl.exe -LO "https://dl.k8s.io/release/v1.30.0/bin/windows/amd64/kubectl.exe"
```

- [ ] **Step 2: PATH'e ekle**

`kubectl.exe` dosyasını `C:\Users\VELI.TOPBAS\bin` gibi PATH'te olan bir klasöre taşı (klasör yoksa oluştur ve PATH'e ekle):

```powershell
New-Item -ItemType Directory -Force -Path "$HOME\bin" | Out-Null
Move-Item .\kubectl.exe "$HOME\bin\kubectl.exe" -Force
$env:PATH += ";$HOME\bin"
```

Kalıcı olması için: Windows Ayarları > Sistem > Gelişmiş Sistem Ayarları > Ortam Değişkenleri > `PATH`'e `%USERPROFILE%\bin` ekle.

- [ ] **Step 3: Kurulumu doğrula**

```powershell
kubectl version --client
```

Expected: `Client Version: v1.30.0` benzeri bir çıktı.

---

### Task 3: Rancher ile custom cluster oluştur (3 node) ve kubectl ile bağlan

**Files:** Yok

**Interfaces:**
- Consumes: Rancher UI (Task 1), `kubectl` (Task 2), Docker kurulu 3 node
- Produces: `weatherproject-cluster` adında, 3 node'un tamamı `Ready` durumda Kubernetes cluster'ı + host'ta `~/.kube/config` içinde bu cluster'a ait kubeconfig. Task 4-7'deki tüm `kubectl apply` komutları bu cluster'ı hedefleyecek.

- [ ] **Step 1: Rancher UI'da yeni cluster oluşturmayı başlat**

Rancher UI > Cluster Management > Create > **Custom** seç. Cluster adı: `weatherproject-cluster`. Kubernetes sürümünü varsayılan (en son stabil) bırak, "Create" tıkla.

- [ ] **Step 2: node1 için registration komutunu al ve çalıştır**

Rancher, node rollerini seçmen için bir ekran gösterir. `node1` için şu rolleri işaretle: **etcd**, **Control Plane**, **Worker**. Rancher bunun altında bir `docker run ...` komutu üretir (içinde cluster'a özel bir token vardır — bu yüzden burada sabit bir komut verilemez, ekrandaki komutu birebir kopyala).

```bash
ssh devops@192.168.56.11
# Rancher UI'dan kopyaladigin docker run komutunu buraya yapistir ve calistir
```

- [ ] **Step 3: node2 ve node3 için registration komutlarını al ve çalıştır**

Aynı ekranda rolleri değiştir: sadece **Worker** işaretli olacak şekilde yeni bir komut üret (Rancher, farklı rol kombinasyonu için farklı komut üretir). Bu komutu `node2` ve `node3` üzerinde çalıştır:

```bash
ssh devops@192.168.56.12
# Rancher UI'dan kopyaladigin (Worker-only) docker run komutunu buraya yapistir

ssh devops@192.168.56.13
# Ayni komutu burada da calistir
```

- [ ] **Step 4: Cluster'ın aktif olmasını bekle**

Rancher UI'da `Cluster Management` ekranında `weatherproject-cluster` satırının durumunu izle. Provisioning birkaç dakika sürer (node'lar birbirine `etcd`/`kube-apiserver` bağlantısı kurar). Durum `Active` olunca devam et.

- [ ] **Step 5: kubeconfig'i indir ve kullan**

Rancher UI'da `weatherproject-cluster`'a tıkla > sağ üstte "Kubeconfig" veya "Download KubeConfig" butonuna tıkla, dosyayı indir.

```powershell
New-Item -ItemType Directory -Force -Path "$HOME\.kube" | Out-Null
Move-Item "$HOME\Downloads\weatherproject-cluster.yaml" "$HOME\.kube\config" -Force
```

- [ ] **Step 6: Cluster bağlantısını doğrula (ilk kubectl komutları)**

```powershell
kubectl get nodes
```

Expected: 3 satır, hepsi `STATUS` sütununda `Ready`:
```
NAME    STATUS   ROLES                      AGE   VERSION
node1   Ready    controlplane,etcd,worker   Xm    v1.3x.x
node2   Ready    worker                     Xm    v1.3x.x
node3   Ready    worker                     Xm    v1.3x.x
```

```powershell
kubectl get pods -A
kubectl describe node node1
```

`get pods -A` (tüm namespace'ler) Kubernetes'in kendi sistem pod'larını (`kube-system` içinde `etcd`, `kube-apiserver`, `coredns` vb.) gösterir — bunlar senin deploy ettiğin değil, cluster'ın kendi çalışması için gereken pod'lardır. `describe node` bir node'un kapasitesini (CPU/RAM), üzerinde çalışan pod'ları ve olayları (events) gösterir; sorun giderirken en çok kullanılan komutlardan biridir.

---

### Task 4: Image'ları Docker Hub'a push et

**Files:** Yok

**Interfaces:**
- Consumes: `weatherproject-backend`, `weatherproject-frontend` local image'ları (bkz. `04-containerization-docker.md`)
- Produces: `docker.io/<dockerhub-kullanici-adi>/weatherproject-backend:latest`, `docker.io/<dockerhub-kullanici-adi>/weatherproject-frontend:latest` — Task 6 ve 7'deki Deployment manifest'leri bu image adreslerini kullanacak.

**Neden registry şart:** `docker build` ile ürettiğin image sadece build ettiğin makinenin yerel Docker deposunda durur. `node1/2/3` bambaşka makineler (VM'ler) olduğu için, image'ı bir yerden "çekebilmeleri" (`docker pull`) gerekir. Docker Hub, bunun için ücretsiz ve en yaygın public registry'dir. (`09-cicd-azure-devops.md`'de bu push işlemi otomatikleştirilecek.)

- [ ] **Step 1: Docker Hub'a giriş yap**

```bash
docker login
```

Docker Hub kullanıcı adı/şifreni gir.

- [ ] **Step 2: Image'ları etiketle**

```bash
docker tag weatherproject-backend <dockerhub-kullanici-adi>/weatherproject-backend:latest
docker tag weatherproject-frontend <dockerhub-kullanici-adi>/weatherproject-frontend:latest
```

- [ ] **Step 3: Push et**

```bash
docker push <dockerhub-kullanici-adi>/weatherproject-backend:latest
docker push <dockerhub-kullanici-adi>/weatherproject-frontend:latest
```

Expected: her ikisi için `latest: digest: sha256:... size: ...` ile başarılı push.

- [ ] **Step 4: Doğrula**

```bash
docker pull <dockerhub-kullanici-adi>/weatherproject-backend:latest
```

Expected: image Docker Hub'dan başarıyla çekilir (yerelde zaten olsa da registry'de gerçekten var olduğunu kanıtlar).

---

### Task 5: Namespace, Secret ve PostgreSQL StatefulSet

**Files:**
- Create: `k8s/namespace.yaml`
- Create: `k8s/postgres-statefulset.yaml`

**Interfaces:**
- Consumes: `weatherproject-cluster` (Task 3)
- Produces: `weatherproject` namespace'i içinde `postgres-0` pod'u ve `postgres` ClusterIP Service'i (port 5432). Task 7'deki backend Deployment'ı bu Service'e `Host=postgres` şeklinde bağlanacak.

**Neden StatefulSet (Deployment değil):** PostgreSQL gibi durum bilgisi (state/veri) tutan uygulamalarda pod'un adı ve diskinin kalıcı olması gerekir. `StatefulSet`, pod'a sabit bir isim (`postgres-0`) ve kendi `PersistentVolumeClaim`'ini verir — pod yeniden başlasa bile aynı diske bağlanır. `Deployment` bunu garanti etmez (pod'lar rastgele isimlendirilir, disk garantisi yoktur).

- [ ] **Step 1: Namespace'i oluştur**

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: weatherproject
```

```powershell
kubectl apply -f k8s/namespace.yaml
```

- [ ] **Step 2: Secret'ı imperative olarak oluştur (YAML'a düz metin şifre yazılmaz)**

```powershell
kubectl create secret generic weatherproject-secrets `
  --namespace weatherproject `
  --from-literal=postgres-password=changeme `
  --from-literal=openweathermap-api-key=REPLACE_WITH_REAL_KEY
```

- [ ] **Step 3: PostgreSQL StatefulSet ve Service manifest'ini yaz**

```yaml
# k8s/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: weatherproject
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: weatherproject
            - name: POSTGRES_USER
              value: weatherproject
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: weatherproject-secrets
                  key: postgres-password
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 2Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: weatherproject
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

- [ ] **Step 4: Uygula ve doğrula**

```powershell
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl get pods -n weatherproject
kubectl logs -n weatherproject postgres-0
```

Expected: `postgres-0` pod'u `Running`, loglarda `database system is ready to accept connections`.

- [ ] **Step 5: Commit**

```bash
git add k8s/namespace.yaml k8s/postgres-statefulset.yaml
git commit -m "feat(k8s): namespace ve postgresql statefulset"
```

---

### Task 6: Redis Deployment

**Files:**
- Create: `k8s/redis-deployment.yaml`

**Interfaces:**
- Consumes: `weatherproject` namespace (Task 5)
- Produces: `redis` ClusterIP Service'i (port 6379). Task 7'deki backend Deployment'ı `redis:6379` adresine bağlanacak.

**Neden Deployment (StatefulSet değil):** Redis burada sadece cache olarak kullanılıyor (bkz. `02-backend-dotnet.md` Task 4) — veri kaybolsa da uygulama dış API'den tekrar veri çeker. Kalıcı disk garantisine ihtiyaç yok, bu yüzden daha basit olan `Deployment` yeterli.

- [ ] **Step 1: Manifest'i yaz**

```yaml
# k8s/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: weatherproject
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: weatherproject
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

- [ ] **Step 2: Uygula ve doğrula**

```powershell
kubectl apply -f k8s/redis-deployment.yaml
kubectl get pods -n weatherproject -l app=redis
```

Expected: pod `Running` durumda.

- [ ] **Step 3: Commit**

```bash
git add k8s/redis-deployment.yaml
git commit -m "feat(k8s): redis deployment ve service"
```

---

### Task 7: Backend + Frontend Deployment/Service ve uçtan uca doğrulama

**Files:**
- Create: `k8s/backend-deployment.yaml`
- Create: `k8s/frontend-deployment.yaml`

**Interfaces:**
- Consumes: Docker Hub image'ları (Task 4), `postgres`/`redis` Service'leri (Task 5, 6), `weatherproject-secrets` (Task 5)
- Produces: `frontend` Service'i (`NodePort 30080`) üzerinden dışarıdan erişilebilen tam sistem. `10-dns-erisim.md` bu Service/Ingress üzerine DNS ismi bağlayacak.

- [ ] **Step 1: Backend manifest'ini yaz**

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: weatherproject
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: <dockerhub-kullanici-adi>/weatherproject-backend:latest
          ports:
            - containerPort: 8080
          env:
            - name: ConnectionStrings__Postgres
              value: "Host=postgres;Port=5432;Database=weatherproject;Username=weatherproject;Password=$(POSTGRES_PASSWORD)"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: weatherproject-secrets
                  key: postgres-password
            - name: ConnectionStrings__Redis
              value: "redis:6379"
            - name: OpenWeatherMap__ApiKey
              valueFrom:
                secretKeyRef:
                  name: weatherproject-secrets
                  key: openweathermap-api-key
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: weatherproject
spec:
  selector:
    app: backend
  ports:
    - port: 8080
      targetPort: 8080
```

**Not:** `<dockerhub-kullanici-adi>` yerine Task 4'te kullandığın gerçek Docker Hub kullanıcı adını yaz.

- [ ] **Step 2: Frontend manifest'ini yaz**

```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: weatherproject
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: <dockerhub-kullanici-adi>/weatherproject-frontend:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: weatherproject
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
```

**Neden `frontend` `NodePort`, diğerleri `ClusterIP`:** `postgres`, `redis`, `backend` sadece cluster **içinden** çağrılıyor (başka pod'lardan), dışarıya açılmasına gerek yok — varsayılan `ClusterIP` yeterli ve daha güvenli. `frontend` ise kullanıcının tarayıcıdan erişmesi gereken tek bileşen, bu yüzden `NodePort` ile her node'un `30080` portundan dışarıya açılıyor. (`10-dns-erisim.md`'de bunun yerine/üzerine bir Ingress + DNS ismi eklenecek.)

- [ ] **Step 3: Uygula**

```powershell
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

- [ ] **Step 4: Pod'ların ayağa kalktığını doğrula**

```powershell
kubectl get pods -n weatherproject
```

Expected: `postgres-0`, `redis-...`, `backend-...`, `frontend-...` hepsi `Running`.

Bir pod `CrashLoopBackOff` veya `Pending` durumundaysa öğrenme amaçlı sık kullanılan tanı komutları:

```powershell
kubectl describe pod -n weatherproject <pod-adi>
kubectl logs -n weatherproject <pod-adi>
```

- [ ] **Step 5: Uçtan uca doğrula**

```powershell
curl http://192.168.56.11:30080/
curl http://192.168.56.11:30080/api/weather/Istanbul
```

Expected: ilk komut HTML (Angular arayüzü), ikinci komut JSON hava durumu verisi döner. Tarayıcıdan `http://192.168.56.11:30080` adresine girip arama kutusunu da elle test et.

- [ ] **Step 6: Öğrenme egzersizi — ölçekleme (kubectl CLI pratiği)**

```powershell
kubectl scale deployment backend -n weatherproject --replicas=2
kubectl get pods -n weatherproject -l app=backend
```

Expected: `backend` için 2 pod listelenir. Bu, Kubernetes'in "aynı uygulamadan birden fazla kopya çalıştırma" (yatay ölçekleme) yeteneğini gösterir — trafik arttığında manuel veya otomatik (`HorizontalPodAutoscaler`, bu planın kapsamı dışında) ölçeklenebilir.

Geri al:

```powershell
kubectl scale deployment backend -n weatherproject --replicas=1
```

- [ ] **Step 7: Commit**

```bash
git add k8s/backend-deployment.yaml k8s/frontend-deployment.yaml
git commit -m "feat(k8s): backend ve frontend deployment/service, uctan uca dogrulama"
```

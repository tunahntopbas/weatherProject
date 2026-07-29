# CI/CD (Azure DevOps Pipelines) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kod `main` branch'ine push edildiğinde backend ve frontend için otomatik olarak build -> test -> Docker image push -> `06-kubernetes-rancher.md`'deki cluster'a deploy zincirini çalıştırmak. Manuel deploy adımlarını (Task 04, 06, 08'de elle yapılan `docker build`/`docker push`/`kubectl apply`) otomatikleştirmek.

**Architecture:** Azure DevOps, kod deposunu (Azure Repos) barındırır ve pipeline'ları tetikler. Pipeline'lar Microsoft'un barındırdığı (Microsoft-hosted) agent'larda **değil**, kendi kurduğumuz bir **self-hosted agent**'ta çalışır — çünkü Kubernetes cluster'ımız (`192.168.56.x`) sadece yerel ağdan erişilebilir, internetteki bir Microsoft-hosted agent bu adreslere ulaşamaz.

**Tech Stack:** Azure DevOps (Pipelines, Repos, Service Connections, Library/Secure Files), self-hosted Azure Pipelines agent, YAML pipeline'lar.

## Global Constraints

- Kod deposu: Azure Repos (bu proje için Azure DevOps organizasyonu/proje adı: `weatherProject`)
- Self-hosted agent, host Windows makinede çalışacak (zaten `kubectl` kurulu ve `192.168.56.x` ağına erişimi var, bkz. `06-kubernetes-rancher.md` Task 2)
- Docker Hub kimlik bilgileri ve cluster kubeconfig'i **asla** pipeline YAML dosyasına düz metin yazılmayacak; Azure DevOps'un "Service Connection" ve "Secure Files" mekanizmaları kullanılacak
- Pipeline'lar sadece kendi ilgili klasöründe (`backend/` veya `frontend/`) değişiklik olduğunda tetiklenecek (`paths.include`) — birinde yapılan değişiklik diğerinin gereksiz yere yeniden deploy olmasına sebep olmamalı

---

### Task 1: Azure DevOps projesi oluştur ve kodu Azure Repos'a taşı

**Files:** Yok

**Interfaces:**
- Consumes: bu ana kadar oluşturulan tüm dosyalar (`backend/`, `frontend/`, `k8s/`, `docs/`)
- Produces: Azure Repos'ta `weatherProject` deposu — Task 4 ve 5'teki pipeline'lar bu depoyu izleyecek.

- [ ] **Step 1: Azure DevOps organizasyonu ve proje oluştur**

https://dev.azure.com adresine git, Microsoft hesabınla giriş yap. "New organization" ile bir organizasyon oluştur (yoksa), ardından "New project" > İsim: `weatherProject`, Visibility: `Private`.

- [ ] **Step 2: Repo clone URL'sini al**

Proje içinde Repos > Files ekranına git, "Clone" butonuna tıkla, HTTPS clone URL'sini kopyala (örn. `https://dev.azure.com/<org>/weatherProject/_git/weatherProject`).

- [ ] **Step 3: Yerel repoyu Azure Repos'a bağla ve push et**

```bash
git remote add azure https://dev.azure.com/<org>/weatherProject/_git/weatherProject
git push -u azure master
```

Kimlik doğrulama istenirse: Azure DevOps > User Settings > Personal Access Tokens > New Token (Code: Read & Write yetkisiyle) oluştur, şifre yerine bu token'ı kullan.

- [ ] **Step 4: Doğrula**

Azure DevOps > Repos > Files ekranını yenile.

Expected: `backend/`, `frontend/`, `k8s/`, `docs/` klasörleri Azure Repos'ta görünür.

---

### Task 2: Self-hosted Azure Pipelines agent'ı kur

**Files:** Yok — agent, repo dışında ayrı bir klasöre kurulur (örn. `C:\azagent`)

**Interfaces:**
- Consumes: yok
- Produces: `self-hosted-pool` adlı agent havuzunda çevrimiçi bir agent. Task 4 ve 5'teki pipeline'lar bu havuzu (`pool: name: 'self-hosted-pool'`) hedefleyecek.

**Neden self-hosted gerekli:** Microsoft-hosted agent'lar her çalıştırmada sıfırdan oluşturulan geçici sanal makinelerdir ve sadece internetten erişilebilir adreslere ulaşabilir. Bizim Kubernetes API sunucumuz `192.168.56.11` gibi özel bir IP'de, sadece bu ağa (VirtualBox Host-Only) bağlı makinelerden erişilebilir. Bu yüzden pipeline'ın "deploy" adımını, bu ağa zaten erişimi olan kendi makinemizde (self-hosted) çalıştırmamız gerekir.

- [ ] **Step 1: Agent havuzu oluştur**

Azure DevOps > Organization Settings > Agent pools > Add pool > Self-hosted, isim: `self-hosted-pool`.

- [ ] **Step 2: Agent'ı indir ve yapılandır**

Oluşturduğun havuza tıkla > New agent > Windows sekmesi, verilen indirme linkini ve komutları takip et:

```powershell
New-Item -ItemType Directory -Force -Path "C:\azagent"
cd C:\azagent
# Azure DevOps ekranindaki indirme linkini buraya yapistir (surum numarasi degisebilir)
Invoke-WebRequest -Uri "<azure-devops-ekraninda-verilen-agent-zip-url>" -OutFile "agent.zip"
Expand-Archive -Path "agent.zip" -DestinationPath "."
.\config.cmd
```

`config.cmd` sırasında sorulanlar:
- Server URL: `https://dev.azure.com/<org>`
- Authentication type: `PAT` (Task 1'de oluşturduğun Personal Access Token'ı kullan, veya "Agent Pools: Read & manage" yetkisiyle yeni bir tane oluştur)
- Agent pool: `self-hosted-pool`
- Agent name: varsayılan bırakılabilir

- [ ] **Step 3: Agent'ı servis olarak çalıştır**

```powershell
.\run.cmd
```

(Kalıcı olması için Windows servisine kurmak istersen `config.cmd` sırasında "servis olarak çalıştır" seçeneğini işaretleyebilirsin; öğrenme aşamasında `run.cmd`'yi açık bir terminalde çalışır bırakmak yeterlidir.)

- [ ] **Step 4: Doğrula**

Azure DevOps > Organization Settings > Agent pools > `self-hosted-pool`.

Expected: bir agent, yeşil nokta ile "Online" durumda listelenir.

---

### Task 3: Docker Hub service connection ve kubeconfig secure file

**Files:** Yok

**Interfaces:**
- Consumes: Docker Hub hesabı (bkz. `06-kubernetes-rancher.md` Task 4), `~/.kube/config` (bkz. `06-kubernetes-rancher.md` Task 3)
- Produces: `dockerhub-connection` adlı service connection, `weatherproject-cluster-kubeconfig` adlı secure file. Task 4 ve 5'teki pipeline'lar bu ikisini isimleriyle referans alacak.

- [ ] **Step 1: Docker Hub service connection oluştur**

Azure DevOps > Project Settings > Service connections > New service connection > Docker Registry > Docker Hub. Docker Hub kullanıcı adı/şifreni (veya access token'ını) gir, connection adı: `dockerhub-connection`.

- [ ] **Step 2: kubeconfig'i secure file olarak yükle**

Azure DevOps > Pipelines > Library > Secure files > `+ Secure file`. Host makinendeki `%USERPROFILE%\.kube\config` dosyasını seç ve yükle, dosya adını `weatherproject-cluster-kubeconfig` olarak bırak (veya bu isimle yeniden adlandır).

Yüklenen dosyaya tıkla > "Pipeline permissions" > "Authorize for all pipelines" işaretle (aksi halde her pipeline ilk çalıştığında ayrıca izin onayı ister).

- [ ] **Step 3: Doğrula**

Library > Secure files listesinde `weatherproject-cluster-kubeconfig` görünür ve "Authorized" durumdadır.

---

### Task 4: Backend pipeline'ı

**Files:**
- Create: `azure-pipelines-backend.yml`

**Interfaces:**
- Consumes: `backend/` klasörü (bkz. `02-backend-dotnet.md`), `dockerhub-connection` (Task 3), `weatherproject-cluster-kubeconfig` (Task 3), `k8s/backend-deployment.yaml` (bkz. `06-kubernetes-rancher.md` Task 7, `08-monitoring-grafana.md` Task 4)
- Produces: `main` branch'e `backend/` altında bir push geldiğinde otomatik çalışan build-test-push-deploy pipeline'ı

- [ ] **Step 1: Pipeline YAML'ını yaz**

```yaml
# azure-pipelines-backend.yml
trigger:
  branches:
    include:
      - master
  paths:
    include:
      - backend/*

pool:
  name: 'self-hosted-pool'

variables:
  dockerHubRepo: '<dockerhub-kullanici-adi>/weatherproject-backend'

stages:
  - stage: BuildAndTest
    jobs:
      - job: BuildAndTest
        steps:
          - task: UseDotNet@2
            inputs:
              packageType: 'sdk'
              version: '10.0.x'
          - script: dotnet restore backend/WeatherProject.sln
            displayName: 'dotnet restore'
          - script: dotnet build backend/WeatherProject.sln --configuration Release --no-restore
            displayName: 'dotnet build'
          - script: dotnet test backend/WeatherProject.sln --configuration Release --no-build --logger trx --results-directory $(Agent.TempDirectory)/testresults
            displayName: 'dotnet test'
          - task: PublishTestResults@2
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: 'VSTest'
              testResultsFiles: '$(Agent.TempDirectory)/testresults/*.trx'

  - stage: BuildAndPushImage
    dependsOn: BuildAndTest
    jobs:
      - job: DockerBuildPush
        steps:
          - task: Docker@2
            displayName: 'Build and push backend image'
            inputs:
              containerRegistry: 'dockerhub-connection'
              repository: '$(dockerHubRepo)'
              command: 'buildAndPush'
              Dockerfile: 'backend/Dockerfile'
              buildContext: 'backend'
              tags: |
                $(Build.BuildId)
                latest

  - stage: DeployToCluster
    dependsOn: BuildAndPushImage
    jobs:
      - job: Deploy
        steps:
          - task: DownloadSecureFile@1
            name: kubeconfig
            inputs:
              secureFile: 'weatherproject-cluster-kubeconfig'
          - script: |
              kubectl --kubeconfig=$(kubeconfig.secureFilePath) apply -f k8s/backend-deployment.yaml
              kubectl --kubeconfig=$(kubeconfig.secureFilePath) rollout restart deployment backend -n weatherproject
              kubectl --kubeconfig=$(kubeconfig.secureFilePath) rollout status deployment backend -n weatherproject
            displayName: 'Deploy backend to Kubernetes'
```

**Neden 3 ayrı stage:** Her stage bağımsız olarak başarılı/başarısız olabilir ve Azure DevOps arayüzünde ayrı ayrı görünür — testler başarısız olursa image hiç build edilmez/push edilmez (`dependsOn` zinciri), yanlış/bozuk kod asla cluster'a ulaşmaz.

- [ ] **Step 2: Pipeline'ı Azure DevOps'a bağla**

Azure DevOps > Pipelines > New pipeline > Azure Repos Git > `weatherProject` > Existing Azure Pipelines YAML file > `/azure-pipelines-backend.yml`. Pipeline adını `weatherproject-backend-ci` olarak değiştir (Pipelines listesinde tıkla > Rename/move).

- [ ] **Step 3: Değişikliği commit'le ve push'la (pipeline'ı tetikle)**

```bash
git add azure-pipelines-backend.yml
git commit -m "ci: backend icin azure devops pipeline"
git push azure master
```

- [ ] **Step 4: Pipeline çalışmasını izle ve doğrula**

Azure DevOps > Pipelines > `weatherproject-backend-ci` > son çalışmaya tıkla.

Expected: `BuildAndTest` -> `BuildAndPushImage` -> `DeployToCluster` stage'lerinin hepsi yeşil (başarılı).

```powershell
kubectl rollout history deployment backend -n weatherproject
```

Expected: yeni bir revizyon (`REVISION` sütununda artmış bir sayı) görünür — pipeline'ın gerçekten yeni bir deploy tetiklediğinin kanıtı.

---

### Task 5: Frontend pipeline'ı

**Files:**
- Create: `azure-pipelines-frontend.yml`

**Interfaces:**
- Consumes: `frontend/` klasörü (bkz. `03-frontend-angular.md`), `dockerhub-connection` (Task 3), `weatherproject-cluster-kubeconfig` (Task 3), `k8s/frontend-deployment.yaml` (bkz. `06-kubernetes-rancher.md` Task 7)
- Produces: `main` branch'e `frontend/` altında bir push geldiğinde otomatik çalışan build-test-push-deploy pipeline'ı

- [ ] **Step 1: Pipeline YAML'ını yaz**

```yaml
# azure-pipelines-frontend.yml
trigger:
  branches:
    include:
      - master
  paths:
    include:
      - frontend/*

pool:
  name: 'self-hosted-pool'

variables:
  dockerHubRepo: '<dockerhub-kullanici-adi>/weatherproject-frontend'

stages:
  - stage: BuildAndTest
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - script: npm ci
            workingDirectory: frontend
            displayName: 'npm ci'
          - script: npm test -- --watch=false --browsers=ChromeHeadless
            workingDirectory: frontend
            displayName: 'npm test'
          - script: npm run build
            workingDirectory: frontend
            displayName: 'npm run build'

  - stage: BuildAndPushImage
    dependsOn: BuildAndTest
    jobs:
      - job: DockerBuildPush
        steps:
          - task: Docker@2
            displayName: 'Build and push frontend image'
            inputs:
              containerRegistry: 'dockerhub-connection'
              repository: '$(dockerHubRepo)'
              command: 'buildAndPush'
              Dockerfile: 'frontend/Dockerfile'
              buildContext: 'frontend'
              tags: |
                $(Build.BuildId)
                latest

  - stage: DeployToCluster
    dependsOn: BuildAndPushImage
    jobs:
      - job: Deploy
        steps:
          - task: DownloadSecureFile@1
            name: kubeconfig
            inputs:
              secureFile: 'weatherproject-cluster-kubeconfig'
          - script: |
              kubectl --kubeconfig=$(kubeconfig.secureFilePath) apply -f k8s/frontend-deployment.yaml
              kubectl --kubeconfig=$(kubeconfig.secureFilePath) rollout restart deployment frontend -n weatherproject
              kubectl --kubeconfig=$(kubeconfig.secureFilePath) rollout status deployment frontend -n weatherproject
            displayName: 'Deploy frontend to Kubernetes'
```

- [ ] **Step 2: Pipeline'ı Azure DevOps'a bağla**

Azure DevOps > Pipelines > New pipeline > Azure Repos Git > `weatherProject` > Existing Azure Pipelines YAML file > `/azure-pipelines-frontend.yml`. Adını `weatherproject-frontend-ci` yap.

- [ ] **Step 3: Değişikliği commit'le ve push'la**

```bash
git add azure-pipelines-frontend.yml
git commit -m "ci: frontend icin azure devops pipeline"
git push azure master
```

- [ ] **Step 4: Pipeline çalışmasını izle ve doğrula**

Azure DevOps > Pipelines > `weatherproject-frontend-ci` > son çalışma.

Expected: tüm stage'ler başarılı.

```powershell
curl http://192.168.56.11:30080/
```

Expected: HTTP 200, güncel frontend HTML'i döner.

- [ ] **Step 5: Path filtresini doğrula (isteğe bağlı ama öğretici)**

Sadece `backend/` altında küçük bir değişiklik yap (örn. bir yorum satırı ekle) ve push et.

```bash
git add backend/
git commit -m "test: path filtresini dogrulamak icin kucuk degisiklik"
git push azure master
```

Expected: Azure DevOps'ta sadece `weatherproject-backend-ci` tetiklenir, `weatherproject-frontend-ci` **tetiklenmez** — `paths.include` filtresinin çalıştığının kanıtı.

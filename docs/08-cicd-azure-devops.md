# 8. CI/CD — Azure DevOps Pipelines

Bu defter, projenin CI/CD katmanını sıfırdan anlatır: önce genel kavramlar,
sonra bu projede gerçekte kurulan sistem, en sonda ileri seviye konular ve
gelecekte eklenebilecekler. `docs/architecture-overview.md`'deki 5. bölümde
(Uygulama Sırası) 8. aşama olarak geçen katmanın detayıdır.

> Not: Bu katman ilk aşamada GitHub Actions ile kuruldu, sonra orijinal
> plana dönülerek Azure DevOps Pipelines'a taşındı. Bu doküman güncel
> (Azure DevOps) durumu anlatır.

## 8.1 Temel Kavramlar

**CI (Continuous Integration — Sürekli Entegrasyon):** Geliştiricinin kodu
push ettiği anda otomatik olarak derlenmesi (build) ve test edilmesi.
Amaç: "benim makinemde çalışıyordu" sorununu erken yakalamak — kod
merkezi bir ortamda, herkesin göreceği şekilde build/test edilir.

**CD (Continuous Deployment/Delivery — Sürekli Dağıtım):** Build ve
testten geçen kodun otomatik olarak bir ortama (bu projede: Kubernetes
cluster'ı) deploy edilmesi. Manuel deploy'un iki riski vardır: (1) insan
hatası — bir adım unutulabilir, (2) yavaşlık — her deploy 10-15 dakikalık
manuel iş gerektirir. Pipeline bu iki riski de ortadan kaldırır.

**Pipeline:** CI+CD adımlarının tanımlandığı, sırayla çalışan otomasyon
akışı. Bu projede YAML dosyası olarak tanımlanır (`azure-pipelines/*.yml`)
ve repo ile birlikte versiyonlanır — pipeline tanımı da kod gibi
değişiklik geçmişine sahiptir ("pipeline as code").

**Agent:** Pipeline adımlarının (`dotnet build`, `docker build`,
`kubectl rollout` vb.) fiilen çalıştığı makine. İki türü vardır:

- **Microsoft-hosted agent:** Azure'ın sağladığı, her run'da sıfırdan
  ayağa kalkan geçici sanal makine. İnternete açık, genel amaçlı işler
  için uygundur.
- **Self-hosted agent:** Kendi makinenize kurduğunuz, kalıcı agent.

Bu projede **self-hosted agent zorunludur**, çünkü deploy hedefi
(`k3s` cluster'ı, `kubectl`, `docker`) yalnızca yerel ağdaki
`weather-server` makinesinden erişilebilir durumda — Microsoft'un genel
ağdaki geçici makinesi bu cluster'a ulaşamaz.

## 8.2 Neden Azure DevOps (GitHub Actions Yerine)

Proje başlangıç planında Azure DevOps hedeflenmişti; geliştirme sürecinde
hız için GitHub Actions ile başlanmış, bu defterle birlikte plana geri
dönülüp Azure DevOps'a taşınmıştır. İki sistem de aynı temel modele sahiptir
(YAML pipeline + agent + secret yönetimi), bu yüzden geçiş kavramsal değil,
büyük ölçüde sözdizimseldir:

| Kavram | GitHub Actions | Azure DevOps |
|---|---|---|
| Pipeline tanımı | `.github/workflows/*.yml` | `azure-pipelines/*.yml` |
| Adım | `run:` | `script:` |
| Kendi makinen | `runs-on: self-hosted` | `pool: { name: Default }` |
| Gizli değer | `secrets.X` → `${{ secrets.X }}` | Pipeline Variables → `$(X)` |
| Çalışma dizini | `working-directory:` | `workingDirectory:` |

Kurumsal ortamlarda Azure DevOps'un tercih edilme nedenleri: Boards
(iş takibi), Repos, Pipelines, Artifacts ve Test Plans'ın tek bir ürün
içinde entegre gelmesi; Azure/.NET ekosistemiyle (bu projenin backend'i
.NET) doğal uyum; kurumsal Active Directory/Entra ID ile SSO desteği.

## 8.3 Bu Projede Kurulan Sistem — Genel Şema

```
Geliştirici (yerel makine)
      │  git push
      ▼
Azure Repos  (dev.azure.com/weatherProjectTunahan/weatherProject/_git/weatherProject)
      │  push tetikler (trigger: master, path filter)
      ▼
Azure Pipelines (bulut, tanım YAML'dan okunur)
      │  iş self-hosted agent'a atanır
      ▼
Self-hosted Agent  (weather-server makinesi, systemd servisi)
      │  dotnet/npm build+test → docker build → docker save | k3s ctr import → kubectl rollout
      ▼
k3s Cluster (aynı makine üzerinde) — namespace: weather-app
```

Önemli mimari karar: **agent ve deploy hedefi (k3s) aynı fiziksel/sanal
makinede.** Bu yüzden "image'i bir registry'ye push edip cluster'ın oradan
çekmesi" adımına gerek yok — `docker save | k3s ctr images import -` ile
image doğrudan yerel containerd'e aktarılıyor. Registry kullanılmamasının
bilinçli bir basitleştirme olduğu, ileri seviye bölümünde tekrar geçiyor.

### GitHub ile ilişki

Kod hâlâ GitHub'da (`github.com/tunahntopbas/weatherProject`) duruyor, ama
artık pipeline'ı tetikleyen kaynak değil — sadece pasif bir yedek/görünür
kopya. `git remote -v` çıktısında `origin` artık Azure Repos'u gösteriyor;
GitHub'a push atmak için ayrı bir remote eklemek gerekir. Pipeline'lar
yalnızca Azure Repos'a gelen push'ları dinler.

## 8.4 Proje ve Repo Kurulumu

1. **Organizasyon + Proje:** `dev.azure.com` üzerinde organizasyon
   (`weatherProjectTunahan`) ve içinde proje (`weatherProject`) oluşturuldu.
   Bir organizasyon birden fazla projeyi barındırabilir; proje, Repos/
   Pipelines/Boards gibi tüm bileşenlerin izole edildiği çalışma alanıdır.
2. **Repos:** Proje ile birlikte gelen boş Git deposu, mevcut yerel repo
   buraya `git push` ile aktarıldı (`git remote add`/`set-url` + push).
3. **Kimlik doğrulama:** HTTPS clone URL'i ile push atarken kullanıcı adı +
   şifre yerine **Personal Access Token (PAT)** kullanılır (bkz. 8.6).

## 8.5 Pipeline YAML Yapısı

İki ayrı pipeline var — backend ve frontend bağımsız deploy edilebilsin ve
biri değişmeden diğeri gereksiz yere tetiklenmesin diye path filtresi ile
ayrıldılar (GitHub Actions'daki `paths:` mantığının birebir karşılığı).

`azure-pipelines/backend.yml` — anatomi:

```yaml
trigger:
  branches: { include: [master] }
  paths: { include: [backend/*] }      # sadece backend/ altında değişiklik olursa tetiklenir
pr: none                                # PR'larda otomatik çalışmasın
pool: { name: Default }                 # self-hosted agent pool'u
jobs:
  - job: build_test_deploy
    steps:
      - checkout: self
      - script: dotnet restore backend/WeatherProject.sln
      - script: dotnet build ... --no-restore
      - script: dotnet test ... --no-build
      - script: printf '%s' "$WEBSENSE_ROOT_CA" > backend/websense-root-ca.crt
        env: { WEBSENSE_ROOT_CA: $(WEBSENSE_ROOT_CA) }   # secret pipeline variable
      - script: docker build -t weatherproject-backend:latest ./backend
      - script: |
          docker tag weatherproject-backend:latest weather-backend:local
          docker save weather-backend:local | sudo k3s ctr images import -
      - script: |
          kubectl rollout restart deployment backend -n weather-app
          kubectl rollout status deployment backend -n weather-app --timeout=120s
        env: { KUBECONFIG: /home/tunahntopbas/.kube/config }
```

`frontend.yml` aynı iskeleti kullanır, sadece build adımları
`npm ci` / `npm test` / `npm run build` ile değişir.

Her `script:` adımı, aynı agent üzerinde, aynı çalışma dizininden sırayla
çalışır — bir adım başarısız olursa (`exit code != 0`) sonrakiler
çalışmaz ve job `failed` işaretlenir.

## 8.6 Secret ve Kimlik Bilgisi Yönetimi

Bu projede üç farklı gizli değer var, üçü de **asla YAML dosyasına veya
repoya yazılmaz**:

| Gizli değer | Nerede tutulur | Nasıl kullanılır |
|---|---|---|
| `WEBSENSE_ROOT_CA` (kurumsal proxy sertifikası) | Pipeline > Edit > Variables, "keep this value secret" işaretli | `env:` ile script'e enjekte edilir, `$WEBSENSE_ROOT_CA` |
| PAT — Code (Read & Write) | Kullanıcının kendi hesabı, `_usersSettings/tokens` | `git push` sırasında HTTPS kimlik doğrulama |
| PAT — Agent Pools (Read & manage) | Aynı yerde, ayrı token | `config.sh --auth pat --token ...` ile agent'ı pool'a kaydetmek |

**Neden Azure DevOps secret değerleri YAML'a yazdırmaz:** Secret pipeline
variable'ları YAML dosyasında sadece `$(İSİM)` referansı olarak görünür,
gerçek değer yalnızca çalışma anında agent'a enjekte edilir ve loglarda
otomatik olarak `***` ile maskelenir. Bu, GitHub Actions'daki
`secrets.X` mekanizmasının birebir dengidir.

**PAT güvenliği — bu projede öğrenilen ders:** Kurulum sırasında PAT
token'ları geçici olarak sohbet/terminal geçmişinde açık metin olarak yer
aldı. Bu kabul edilebilir bir pratik değildir; bir token açık bir kanalda
paylaşıldığı anda **sızmış sayılır** ve iş bitince (hatta mümkünse hemen,
kısa ömürlü tek kullanımlık token ile) `_usersSettings/tokens` sayfasından
**Revoke** edilmelidir. Kalıcı otomasyon için doğru yöntem PAT değil,
**Service Connection** (bkz. 8.9) veya Managed Identity kullanmaktır.

## 8.7 Self-Hosted Agent Kurulumu

Agent, `weather-server` makinesinde şu adımlarla kuruldu:

1. **İndirme:** `download.agent.dev.azure.com` adresinden platforma özel
   tar.gz paketi indirilir (`vsts-agent-linux-x64-*.tar.gz`), açılır.
2. **Kayıt (`config.sh --unattended`):** Agent'a hangi organizasyona
   (`--url`), hangi pool'a (`--pool Default`) ve hangi isimle
   (`--agent weather-server-agent`) bağlanacağı, kimlik doğrulama için PAT
   (`--auth pat --token ...`) verilir. Bu adım Azure DevOps tarafında
   "Successfully added the agent" ile onaylanır.
3. **Servis kurulumu (`sudo ./svc.sh install` + `start`):** Agent bir
   systemd servisi olarak kurulur (`vsts.agent.<org>.<pool>.<isim>.service`)
   — böylece makine yeniden başlasa bile agent otomatik ayağa kalkar,
   sürekli "dinleme" modunda bekler ve manuel `./run.sh` çalıştırmaya
   gerek kalmaz.
4. **Sudo yetkisi:** k3s image import (`k3s ctr images import`) ve
   `kubectl` bazı komutları root gerektirir; agent'ı çalıştıran kullanıcı
   (`tunahntopbas`) için parolasız sudo (`NOPASSWD: ALL`) tanımlı olmalı,
   aksi halde script bir parola isteyip agent'ta (interaktif terminal
   olmadığı için) sonsuza kadar askıda kalır.

**Karşılaşılan gerçek sorun ve çözümü:** Agent paketinin eski indirme
adresi (`vstsagentpackage.azureedge.net`, klasik Azure CDN) tamamen DNS'te
çözülmez hâle gelmişti (Microsoft bu CDN'i emekliye ayırdı). Yeni adres
(`download.agent.dev.azure.com`) IPv6 üzerinden bağlantıyı reset ediyordu
çünkü makinenin IPv6 rotası çalışmıyordu; çözüm `curl -4` ile IPv4'ü
zorlamaktı. Bu tür altyapı bağımlı hatalar CI/CD kurulumlarında sık
görülür — hata mesajına (`Could not resolve host` / `Connection reset`)
bakarak DNS mi yoksa transport katmanı mı sorunlu olduğunu ayırt etmek
önemlidir.

## 8.8 Pool İzinleri ("Permission needed")

Bir pipeline ilk kez bir agent pool'unu kullanmak istediğinde Azure
DevOps otomatik çalıştırmaz; **"This pipeline needs permission to access
a resource"** uyarısı ile durur ve insan onayı (View → Permit) ister. Bu
kasıtlı bir güvenlik kapısıdır: bir pipeline tanımını değiştirebilen
herkesin, ekstra onay almadan production'a erişimi olan bir pool'u
otomatik kullanabilmesini engeller. Bu onay **her yeni pipeline
tanımı için ayrı ayrı** istenir (bu projede backend ve frontend
pipeline'ları için iki kez onaylandı) ve REST API üzerinden bu adımı
atlamak, kullanılan PAT'in scope'u ne olursa olsun mümkün değildir —
tasarım gereği insan onayı gerektirir.

## 8.9 İleri Seviye Konular

Aşağıdakiler bu projede henüz uygulanmadı, ama bir sonraki olgunluk
seviyesi olarak bilinçli not edildi:

- **Service Connection:** PAT yerine, Azure DevOps içinde tanımlanan ve
  scope'u/ömrü merkezi olarak yönetilen kimlik bağlantısı. Özellikle bir
  Container Registry veya bulut kaynağına bağlanırken PAT'ten daha güvenli
  ve denetlenebilir bir yöntemdir.
- **Environments + Approval Gates:** `Deploy to Kubernetes` adımını ayrı
  bir `environment: production` olarak tanımlayıp, deploy'dan önce
  belirli kişilerin manuel onayını (approval) zorunlu kılmak. Şu an her
  push otomatik deploy ediyor; kurumsal ortamlarda production deploy'u
  genelde bir onay adımı ister.
- **Stage ayrımı (Build → Test → Deploy):** Şu an tek `job` içinde
  sıralı adımlar var. Büyüyen bir pipeline'da bunlar ayrı `stages:` olarak
  bölünüp aralarına manuel onay veya farklı agent pool'ları konabilir
  (örn. build bulutta, deploy self-hosted'da).
- **Container Registry kullanımı:** Şu an image agent'ın kendi
  containerd'ine `k3s ctr images import` ile aktarılıyor — tek node'luk
  kurulum için pratik ama registry olmadan **image versiyonlama/rollback
  geçmişi yok** ve cluster birden fazla node'a büyürse bu yöntem
  çalışmaz (her node'a ayrı import gerekir). Bir sonraki adım: Azure
  Container Registry veya self-hosted bir registry'ye `docker push`,
  ardından Kubernetes manifestinde `image:` alanının o registry'yi
  göstermesi.
- **Pipeline'ı REST API ile tetikleme/izleme:** Bu geçiş sırasında
  `POST .../_apis/build/builds` ile pipeline programatik olarak
  kuyruğa alındı, `GET .../builds/{id}/timeline` ile adım adım durumu
  izlendi. Bu API, harici bir sistemden (örn. başka bir otomasyon aracı)
  deploy tetiklemek istendiğinde kullanılabilir.
- **Branch policy + PR pipeline:** Şu an `pr: none` ile PR'larda pipeline
  çalışmıyor; ileri seviyede `master`'a merge şartı olarak PR'da build/test
  geçme zorunluluğu (branch policy) eklenebilir.

## 8.10 Hızlı Referans — Sorun Giderme

| Belirti | Olası neden | Bakılacak yer |
|---|---|---|
| Build kuyrukta kalıp başlamıyor | Agent pool'a bağlı online agent yok | Project Settings > Agent Pools > Default |
| "No agent found in pool ... satisfies demands" | Agent offline veya sürüm eski | `sudo ./svc.sh status` (agent makinesinde) |
| "This pipeline needs permission" | İlgili pipeline tanımı için pool onayı hiç verilmemiş | Run ekranı > View > Permit |
| Secret adım boş/hatalı değer yazıyor | Variable "secret" işaretli değil veya `env:` eşlemesi eksik | Pipeline > Edit > Variables |
| `k3s ctr images import` adımında takılı kalıyor | Sudo parola soruyor (agent'ta interaktif terminal yok) | Agent kullanıcısı için `NOPASSWD` sudo kuralı |
| Paket indirme adımında DNS hatası | Kurumsal DNS/CDN adresi değişmiş/engelli | `curl -4 -sSI <url>` ile IPv4 zorlayarak test et |

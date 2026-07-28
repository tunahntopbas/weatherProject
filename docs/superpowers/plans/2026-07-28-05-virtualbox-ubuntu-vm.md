# VirtualBox + Ubuntu Sanal Makineler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `06-kubernetes-rancher.md`'de Rancher ile kurulacak 3 node'lu Kubernetes cluster'ı için, birbirleriyle ve host makineyle konuşabilen 3 adet Ubuntu sanal makine hazırlamak.

**Architecture:** VirtualBox üzerinde 3 VM (`node1`, `node2`, `node3`). Her VM'de 2 network adaptörü: biri NAT (internet erişimi — `apt install` için), biri Host-Only (VM'ler ve host birbirini sabit IP ile görsün diye). `node1` kurulup Ubuntu + SSH ile hazırlanacak, sonra `node2`/`node3` bu VM'nin klonu olarak oluşturulacak (aynı işi 3 kez elle yapmamak için).

**Tech Stack:** Oracle VirtualBox, Ubuntu Server 22.04 LTS, netplan (Ubuntu'nun ağ yapılandırma aracı), OpenSSH.

## Global Constraints

- Host-Only network aralığı: `192.168.56.0/24`
- IP planı: `node1 = 192.168.56.11`, `node2 = 192.168.56.12`, `node3 = 192.168.56.13`
- Her VM: minimum 2 vCPU, 4 GB RAM, 20 GB disk (Rancher/Kubernetes için Task `06-kubernetes-rancher.md`'de bu makineler kullanılacağından altında kalınmamalı; host'un RAM'i yetiyorsa 8 GB önerilir)
- Bu plan sadece işletim sistemi + ağ + SSH hazırlar; Docker/Kubernetes kurulumu `06-kubernetes-rancher.md`'nin konusu

---

### Task 1: VirtualBox kurulumu ve Host-Only network oluşturma

**Files:** Yok — bu adımlar işletim sistemi seviyesinde araç kurulumu

**Interfaces:**
- Consumes: yok
- Produces: `vboxnet0` adlı Host-Only network adaptörü (`192.168.56.1/24`, host tarafı gateway). Task 2 ve 3'teki tüm VM'ler bu adaptörü kullanacak.

- [ ] **Step 1: VirtualBox'ı kur**

https://www.virtualbox.org/wiki/Downloads adresinden Windows için VirtualBox'ı indir ve kur (varsayılan ayarlarla ilerlenebilir).

- [ ] **Step 2: Kurulumu doğrula**

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" --version
```

Expected: bir sürüm numarası (örn. `7.0.x`) döner.

- [ ] **Step 3: Host-Only network adaptörü oluştur**

VirtualBox Manager > File > Host Network Manager > Create. Oluşan adaptörün adı genelde `vboxnet0` olur, IPv4 adresi varsayılan olarak `192.168.56.1/24` gelir (DHCP'yi kapatabilirsin, çünkü IP'leri VM içinde elle sabitleyeceğiz).

Komut satırından doğrulamak için:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list hostonlyifs
```

Expected: `vboxnet0` adında bir arayüz, `IPAddress: 192.168.56.1` satırıyla listelenir.

**Neden Host-Only + NAT birlikte:** Sadece NAT olsaydı VM'ler birbirini sabit bir IP ile göremezdi (her VM'nin NAT IP'si kendi izole ağında). Sadece Host-Only olsaydı VM'ler internete çıkıp `apt install` yapamazdı. İkisini birlikte kullanmak (VirtualBox'ta "Multi-Adapter") her iki ihtiyacı da karşılar — bu, gerçek dünyada bir sunucunun hem dahili ağda (cluster içi iletişim) hem dış ağda (internet/paket güncellemeleri) olmasının basit bir benzetmesidir.

---

### Task 2: node1 — ilk Ubuntu VM'i kur ve hazırla

**Files:** Yok — VM konfigürasyonu VirtualBox içinde tutulur

**Interfaces:**
- Consumes: `vboxnet0` (Task 1)
- Produces: `node1` adlı, `192.168.56.11` IP'sinde SSH ile erişilebilen, tam güncellenmiş bir Ubuntu VM. Task 3'te bu VM klonlanarak `node2`/`node3` oluşturulacak. `06-kubernetes-rancher.md` bu 3 node'u kullanacak.

- [ ] **Step 1: Ubuntu Server ISO'sunu indir**

https://ubuntu.com/download/server adresinden Ubuntu Server 22.04 LTS ISO dosyasını indir.

- [ ] **Step 2: VM'i oluştur**

VirtualBox Manager > New:
- Name: `node1`
- Type: Linux, Version: Ubuntu (64-bit)
- Memory: 4096 MB (veya host'un izin verdiği kadar, öneri 8192 MB)
- CPU: 2
- Disk: 20 GB, VDI, dinamik ayrılan

- [ ] **Step 3: İki network adaptörü ekle**

VM Settings > Network:
- Adapter 1: NAT (internet erişimi)
- Adapter 2: Host-only Adapter, `vboxnet0` (cluster içi sabit IP)

- [ ] **Step 4: ISO'yu bağla ve kurulumu başlat**

VM Settings > Storage > İndirilen ISO'yu optik sürücüye bağla, VM'i başlat. Ubuntu kurulum sihirbazında:
- Dil/klavye: varsayılan
- "Install OpenSSH server" seçeneği: **işaretle** (host'tan SSH ile bağlanabilmek için şart)
- Kullanıcı adı: `devops`, hostname: `node1`
- Kurulum bitince ISO'yu çıkar, VM'i yeniden başlat

- [ ] **Step 5: Host-only adaptöre sabit IP ver**

VM içinde (konsoldan), aktif network arayüzlerini listele:

```bash
ip a
```

Genelde `enp0s3` (NAT) ve `enp0s8` (Host-only) görünür. Netplan dosyasını düzenle:

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true
    enp0s8:
      addresses: [192.168.56.11/24]
```

```bash
sudo netplan apply
```

- [ ] **Step 6: Sistemi güncelle**

```bash
sudo apt update && sudo apt upgrade -y
```

- [ ] **Step 7: Host makineden SSH erişimini doğrula**

Host makinede (Windows PowerShell):

```powershell
ssh devops@192.168.56.11
```

Expected: `node1`'e SSH ile bağlanılır, şifre sorulur, giriş başarılı olur.

- [ ] **Step 8: VM'i kapat (klonlama için)**

```bash
sudo shutdown now
```

---

### Task 3: node1'i klonlayarak node2 ve node3'ü oluştur

**Files:** Yok

**Interfaces:**
- Consumes: kapatılmış `node1` VM'i (Task 2)
- Produces: `node2` (`192.168.56.12`), `node3` (`192.168.56.13`) — üçü birbirini ping'leyebilen, host'tan SSH ile erişilebilen 3 node'luk bir ağ. `06-kubernetes-rancher.md` bu 3 makineyi Rancher ile Kubernetes cluster'ına çevirecek.

**Neden klonlama sonrası ekstra adımlar gerekli:** VirtualBox tam klon (full clone) diski birebir kopyalar. Bu, `node2` ve `node3`'ün `node1` ile **aynı** makine kimliğine (`/etc/machine-id`) ve **aynı** SSH host anahtarlarına sahip olacağı anlamına gelir. Aynı machine-id bazı DHCP/systemd servislerinde çakışmaya yol açabilir; aynı SSH host key'leri ise host'tan farklı IP'lere bağlanırken "bu makine gerçekten kim" garantisini ortadan kaldırır (güvenlik açısından yanlış). Bu yüzden klonlama sonrası her node'da bu ikisi sıfırlanır.

- [ ] **Step 1: node1'i iki kez klonla**

VirtualBox Manager'da `node1`e sağ tık > Clone:
- Name: `node2`, "Reinitialize the MAC address of all network cards" seçeneği **işaretli** olsun
- Clone type: Full clone

Aynı işlemi `node3` için tekrarla.

- [ ] **Step 2: node2'yi başlat ve hostname/IP/kimlik ayarlarını düzelt**

```bash
sudo hostnamectl set-hostname node2
sudo rm /etc/machine-id
sudo systemd-machine-id-setup
sudo rm /etc/ssh/ssh_host_*
sudo dpkg-reconfigure openssh-server
```

Netplan dosyasını düzenle (`enp0s8` IP'sini değiştir):

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true
    enp0s8:
      addresses: [192.168.56.12/24]
```

```bash
sudo netplan apply
sudo reboot
```

- [ ] **Step 3: node3 için aynı adımları tekrarla**

Aynı Step 2'yi `node3` için uygula: hostname `node3`, IP `192.168.56.13/24`.

- [ ] **Step 4: Tüm node'ların birbirini gördüğünü doğrula**

Host makineden:

```powershell
ssh devops@192.168.56.11 "hostname && ping -c 2 192.168.56.12 && ping -c 2 192.168.56.13"
```

Expected: `node1` hostname'i döner, her iki ping de `0% packet loss` ile başarılı olur.

- [ ] **Step 5: Host'tan üç node'a da SSH erişimini doğrula**

```powershell
ssh devops@192.168.56.11 "hostname"
ssh devops@192.168.56.12 "hostname"
ssh devops@192.168.56.13 "hostname"
```

Expected: sırasıyla `node1`, `node2`, `node3` döner.

- [ ] **Step 6: Kayıt tut**

Bu üç makinenin IP/hostname eşlemesini ileride referans olması için not al (örn. bu planın en altına ekle veya `docs/architecture-overview.md`'ye bir "Altyapı Envanteri" bölümü olarak işlenebilir — `06-kubernetes-rancher.md`'de bu bilgi tekrar kullanılacak):

| Hostname | IP | Rol (Task 06'da belirlenecek) |
|---|---|---|
| node1 | 192.168.56.11 | (Rancher server / control-plane adayı) |
| node2 | 192.168.56.12 | (worker adayı) |
| node3 | 192.168.56.13 | (worker adayı) |

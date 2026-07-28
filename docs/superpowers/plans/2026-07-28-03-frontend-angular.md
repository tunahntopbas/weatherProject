# Frontend (Angular) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kullanıcının şehir adı girip backend'deki `GET /api/weather/{cityName}` endpoint'inden (bkz. `02-backend-dotnet.md` Task 7) hava durumu sonucu görebildiği bir Angular arayüzü oluşturmak.

**Architecture:** Standalone Angular component'ler, katmanlı klasör yapısı: `core` (servis + model, backend ile konuşan tek nokta), `features` (kullanıcıya görünen ekran/component). Servis katmanı sayesinde component'ler HTTP detaylarını bilmez (SRP).

**Tech Stack:** Angular (standalone components), `HttpClient`, RxJS, Jasmine/Karma (Angular CLI varsayılan test altyapısı).

## Global Constraints

- Backend endpoint sözleşmesi: `GET {apiBaseUrl}/api/weather/{cityName}` -> JSON gövde `{ cityName, date, temperatureCelsius, description }` (bkz. `02-backend-dotnet.md` Task 2 `WeatherForecast` entity'si, System.Text.Json varsayılan camelCase serileştirme)
- Tüm kod `frontend/` klasörü altında
- HTTP çağrıları sadece `core/services` altındaki servislerden yapılacak, component'ler doğrudan `HttpClient` kullanmayacak

---

### Task 1: Angular workspace iskeletini oluştur

**Files:**
- Create: `frontend/` (tüm Angular CLI workspace dosyaları)

**Interfaces:**
- Consumes: yok
- Produces: `frontend/src/app/`, `frontend/src/environments/` klasör yapısı — sonraki task'lar bunun içine dosya ekleyecek.

- [ ] **Step 1: Angular CLI ile workspace oluştur**

```bash
npm install -g @angular/cli
ng new frontend --style=scss --routing=false --skip-git --ssr=false
```

Sorulursa: "Which stylesheet format?" -> SCSS (zaten `--style=scss` ile belirtildi, prompt çıkmaz).

- [ ] **Step 2: Workspace'in çalıştığını doğrula**

```bash
cd frontend
npm test -- --watch=false --browsers=ChromeHeadless
```

Expected: Angular CLI'nin varsayılan `app.component.spec.ts` testleri PASS

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/
git commit -m "chore: angular workspace iskeleti"
```

---

### Task 2: Hava durumu modeli ve WeatherService

**Files:**
- Create: `frontend/src/app/core/models/weather-forecast.model.ts`
- Create: `frontend/src/app/core/services/weather.service.ts`
- Test: `frontend/src/app/core/services/weather.service.spec.ts`
- Create: `frontend/src/environments/environment.ts`
- Create: `frontend/src/environments/environment.prod.ts`
- Modify: `frontend/src/app/app.config.ts`

**Interfaces:**
- Consumes: backend `GET /api/weather/{cityName}` endpoint
- Produces: `WeatherForecast` interface (`cityName: string`, `date: string`, `temperatureCelsius: number`, `description: string`), `WeatherService.getCurrentWeather(cityName: string): Observable<WeatherForecast>`. Task 3 bu servisi kullanacak.

- [ ] **Step 1: Environment dosyalarını oluştur**

```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000'
};
```

```typescript
// frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: ''
};
```

`apiBaseUrl` boş string: prod'da istekler `${apiBaseUrl}/api/weather/...` yani göreli `/api/weather/...` yoluna gider. `04-containerization-docker.md`'de nginx bu `/api/` yolunu backend container'ına proxy'ler — bu yüzden burada ikinci bir `/api` öneki eklenmemeli.

- [ ] **Step 2: Modeli yaz (veri taşıyıcı, test gerektirmez)**

```typescript
// frontend/src/app/core/models/weather-forecast.model.ts
export interface WeatherForecast {
  cityName: string;
  date: string;
  temperatureCelsius: number;
  description: string;
}
```

- [ ] **Step 3: `app.config.ts`'e HttpClient sağlayıcısını ekle**

```typescript
// frontend/src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()]
};
```

- [ ] **Step 4: Başarısız testi yaz**

```typescript
// frontend/src/app/core/services/weather.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeatherService } from './weather.service';
import { environment } from '../../../environments/environment';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WeatherService]
    });
    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should send a GET request to the weather endpoint for the given city', () => {
    const mockResponse = {
      cityName: 'Istanbul',
      date: '2026-07-28',
      temperatureCelsius: 25,
      description: 'Sunny'
    };

    service.getCurrentWeather('Istanbul').subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Istanbul`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
```

- [ ] **Step 5: Testin başarısız olduğunu doğrula**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/weather.service.spec.ts'`
Expected: FAIL — `WeatherService` modülü bulunamadı

- [ ] **Step 6: Servisi yaz**

```typescript
// frontend/src/app/core/services/weather.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeatherForecast } from '../models/weather-forecast.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  getCurrentWeather(cityName: string): Observable<WeatherForecast> {
    return this.http.get<WeatherForecast>(`${environment.apiBaseUrl}/api/weather/${cityName}`);
  }
}
```

- [ ] **Step 7: Testin geçtiğini doğrula**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/weather.service.spec.ts'`
Expected: PASS (1 test)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/core frontend/src/environments frontend/src/app/app.config.ts
git commit -m "feat(frontend): WeatherForecast modeli ve WeatherService"
```

---

### Task 3: WeatherSearchComponent (arama ekranı)

**Files:**
- Create: `frontend/src/app/features/weather-search/weather-search.component.ts`
- Create: `frontend/src/app/features/weather-search/weather-search.component.html`
- Test: `frontend/src/app/features/weather-search/weather-search.component.spec.ts`
- Modify: `frontend/src/app/app.component.ts`
- Modify: `frontend/src/app/app.component.html`

**Interfaces:**
- Consumes: `WeatherService.getCurrentWeather` (Task 2)
- Produces: `app-weather-search` component — `04-containerization-docker.md` bu component'in çalışan halini container içinde build edip servis edecek.

- [ ] **Step 1: Başarısız testleri yaz**

```typescript
// frontend/src/app/features/weather-search/weather-search.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeatherSearchComponent } from './weather-search.component';
import { environment } from '../../../environments/environment';

describe('WeatherSearchComponent', () => {
  let fixture: ComponentFixture<WeatherSearchComponent>;
  let component: WeatherSearchComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherSearchComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherSearchComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should populate forecast() after a successful search', () => {
    component.cityName = 'Ankara';
    component.search();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    req.flush({ cityName: 'Ankara', date: '2026-07-28', temperatureCelsius: 30, description: 'Clear' });

    expect(component.forecast()?.cityName).toBe('Ankara');
    expect(component.errorMessage()).toBeNull();
  });

  it('should set errorMessage() when the request fails', () => {
    component.cityName = 'UnknownCity';
    component.search();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/UnknownCity`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(component.forecast()).toBeNull();
    expect(component.errorMessage()).toContain('Hava durumu alinamadi');
  });

  it('should not call the service when cityName is blank', () => {
    component.cityName = '   ';
    component.search();

    httpMock.expectNone(() => true);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/weather-search.component.spec.ts'`
Expected: FAIL — `WeatherSearchComponent` bulunamadı

- [ ] **Step 3: Component ve template'i yaz**

```typescript
// frontend/src/app/features/weather-search/weather-search.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';

@Component({
  selector: 'app-weather-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './weather-search.component.html'
})
export class WeatherSearchComponent {
  private readonly weatherService = inject(WeatherService);

  cityName = '';
  forecast = signal<WeatherForecast | null>(null);
  errorMessage = signal<string | null>(null);

  search(): void {
    if (!this.cityName.trim()) {
      return;
    }

    this.errorMessage.set(null);
    this.weatherService.getCurrentWeather(this.cityName).subscribe({
      next: (result) => this.forecast.set(result),
      error: () => {
        this.forecast.set(null);
        this.errorMessage.set('Hava durumu alinamadi. Sehir adini kontrol edin.');
      }
    });
  }
}
```

```html
<!-- frontend/src/app/features/weather-search/weather-search.component.html -->
<div class="weather-search">
  <input
    type="text"
    [(ngModel)]="cityName"
    placeholder="Sehir adi girin"
    (keyup.enter)="search()"
  />
  <button type="button" (click)="search()">Ara</button>

  @if (forecast(); as f) {
    <div class="weather-result">
      <h3>{{ f.cityName }}</h3>
      <p>{{ f.temperatureCelsius }} C - {{ f.description }}</p>
    </div>
  }

  @if (errorMessage(); as msg) {
    <p class="error">{{ msg }}</p>
  }
</div>
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/weather-search.component.spec.ts'`
Expected: PASS (3 test)

- [ ] **Step 5: Component'i ana sayfaya bağla**

```typescript
// frontend/src/app/app.component.ts
import { Component } from '@angular/core';
import { WeatherSearchComponent } from './features/weather-search/weather-search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WeatherSearchComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
}
```

```html
<!-- frontend/src/app/app.component.html -->
<main>
  <h1>Hava Durumu</h1>
  <app-weather-search />
</main>
```

- [ ] **Step 6: Tüm frontend testlerini çalıştır**

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

Expected: tüm testler PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features frontend/src/app/app.component.ts frontend/src/app/app.component.html
git commit -m "feat(frontend): WeatherSearchComponent arama ekrani"
```

---

### Task 4: Build doğrulaması (üretim derlemesi)

**Files:**
- Yeni dosya yok — mevcut workspace'in production build'i doğrulanır

**Interfaces:**
- Consumes: Task 1-3'teki tüm dosyalar
- Produces: `frontend/dist/` — `04-containerization-docker.md` bu klasörü nginx container image'ına kopyalayacak.

- [ ] **Step 1: Production build'i çalıştır**

```bash
cd frontend
npm run build
```

Expected: `Application bundle generation complete.` ve `frontend/dist/frontend/` altında derlenmiş dosyalar

- [ ] **Step 2: Commit (varsa `.gitignore` güncellemesi hariç `dist/` commit edilmez)**

`frontend/.gitignore` içinde `/dist` zaten Angular CLI tarafından otomatik eklenir; ek işlem gerekmez.

```bash
git status
```

Expected: `dist/` klasörü untracked/ignored görünür, başka bekleyen değişiklik yoksa commit atılmaz.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { WeatherDashboardComponent } from './weather-dashboard.component';
import { WeatherHeroComponent } from '../../components/weather-hero/weather-hero.component';
import { ForecastStripComponent } from '../../components/forecast-strip/forecast-strip.component';
import { AnimatedBackgroundComponent } from '../../components/animated-background/animated-background.component';
import { environment } from '../../../environments/environment';
import { SelectedCityService } from '../../core/services/selected-city.service';

describe('WeatherDashboardComponent', () => {
  let fixture: ComponentFixture<WeatherDashboardComponent>;
  let component: WeatherDashboardComponent;
  let httpMock: HttpTestingController;

  const mockForecast = {
    cityName: 'Ankara',
    date: '2026-08-12',
    temperatureCelsius: 30,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [{ date: '2026-08-12', weatherCode: 0, tempMaxCelsius: 32, tempMinCelsius: 20 }],
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [WeatherDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('populates forecast() and derives a theme after a successful city selection', () => {
    component.onCitySelected('Ankara');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    req.flush(mockForecast);

    expect(component.forecast()?.cityName).toBe('Ankara');
    expect(component.theme().category).toBe('clear');
    expect(component.errorMessage()).toBeNull();
  });

  it('sets errorMessage() and clears forecast() when the request fails', () => {
    component.onCitySelected('Ankara');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(component.forecast()).toBeNull();
    expect(component.errorMessage()).toContain('Hava durumu alinamadi');
  });

  it('adds a successfully searched city to recentCities(), most-recent first', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    component.onCitySelected('İzmir');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/%C4%B0zmir`).flush({ ...mockForecast, cityName: 'İzmir' });

    expect(component.recentCities()).toEqual(['İzmir', 'Ankara']);
  });

  it('does not duplicate a city already present in recentCities()', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    expect(component.recentCities()).toEqual(['Ankara']);
  });

  it('loads weather for a city selected via SelectedCityService (top bar search)', async () => {
    const selectedCityService = TestBed.inject(SelectedCityService);
    fixture.detectChanges();

    selectedCityService.select('Ankara');
    await fixture.whenStable();
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    req.flush(mockForecast);

    expect(component.forecast()?.cityName).toBe('Ankara');
  });

  // --- Supplementary DOM/localStorage-level coverage (added on review) ---

  it('renders app-weather-hero, app-forecast-strip, and app-animated-background with correctly bound inputs after a successful search (DOM)', () => {
    fixture.detectChanges();

    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    const heroDebug = fixture.debugElement.query(By.directive(WeatherHeroComponent));
    const stripDebug = fixture.debugElement.query(By.directive(ForecastStripComponent));
    const bgDebug = fixture.debugElement.query(By.directive(AnimatedBackgroundComponent));

    expect(heroDebug).toBeTruthy();
    expect(stripDebug).toBeTruthy();
    expect(bgDebug).toBeTruthy();

    const hero = heroDebug.componentInstance as WeatherHeroComponent;
    expect(hero.forecast().cityName).toBe('Ankara');
    expect(hero.theme().category).toBe('clear');

    const strip = stripDebug.componentInstance as ForecastStripComponent;
    expect(strip.days()).toEqual(mockForecast.daily);

    const bg = bgDebug.componentInstance as AnimatedBackgroundComponent;
    expect(bg.theme().category).toBe('clear');
  });

  it('renders recent-city chips and re-triggers a real HTTP search when a chip is clicked (DOM)', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    component.onCitySelected('İzmir');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/%C4%B0zmir`).flush({ ...mockForecast, cityName: 'İzmir' });
    fixture.detectChanges();

    const chips: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.dashboard__recent-chip'),
    );
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual(['İzmir', 'Ankara']);

    const ankaraChip = chips.find((chip) => chip.textContent?.trim() === 'Ankara')!;
    ankaraChip.click();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    expect(req.request.method).toBe('GET');
    req.flush(mockForecast);
  });

  it('renders a role="alert" element with the error text in the DOM when the request fails', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush('Not Found', {
      status: 404,
      statusText: 'Not Found',
    });
    fixture.detectChanges();

    const alertEl: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl).toBeTruthy();
    expect(alertEl?.textContent).toContain('Hava durumu alinamadi');
  });

  it('caps recentCities() at MAX_RECENT_CITIES (5), reflected in the rendered chip DOM', () => {
    const cities = ['City1', 'City2', 'City3', 'City4', 'City5', 'City6'];
    for (const city of cities) {
      component.onCitySelected(city);
      httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/${city}`).flush({ ...mockForecast, cityName: city });
    }
    fixture.detectChanges();

    expect(component.recentCities()).toEqual(['City6', 'City5', 'City4', 'City3', 'City2']);

    const chips = fixture.nativeElement.querySelectorAll('.dashboard__recent-chip');
    expect(chips.length).toBe(5);
  });

  it('persists recentCities() to real localStorage and a fresh component instance loads it back on init (reload survival)', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);

    const stored = JSON.parse(localStorage.getItem('weather-recent-cities') ?? '[]');
    expect(stored).toEqual(['Ankara']);

    // Simulate a page reload: a brand-new component instance re-reads localStorage on construction.
    const reloadedFixture = TestBed.createComponent(WeatherDashboardComponent);
    const reloadedComponent = reloadedFixture.componentInstance;

    expect(reloadedComponent.recentCities()).toEqual(['Ankara']);
  });
});

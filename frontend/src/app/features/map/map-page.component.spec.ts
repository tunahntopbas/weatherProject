import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { MapPageComponent } from './map-page.component';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { environment } from '../../../environments/environment';

describe('MapPageComponent', () => {
  let fixture: ComponentFixture<MapPageComponent>;
  let httpMock: HttpTestingController;

  const sampleSvg = `<svg id="map-svg" viewBox="0 0 10 10">
    <g><g id="ankara" data-plate-code="06" data-name="Ankara"><path d="M0,0 L1,1"/></g></g>
    <g><g id="izmir" data-plate-code="35" data-name="İzmir"><path d="M2,2 L3,3"/></g></g>
  </svg>`;

  const mockForecast = {
    cityName: 'Ankara',
    date: '2026-08-14',
    temperatureCelsius: 24,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(MapPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne('/images/turkey-provinces.svg').flush(sampleSvg);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('fetches weather for the clicked province and shows its temperature', () => {
    const path: SVGElement = fixture.nativeElement.querySelector('path');
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    expect(fixture.componentInstance.activeCity()).toBe('Ankara');
    expect(fixture.componentInstance.activeTemp()).toBe(24);
  });

  it('applies the temperature-derived color-mix fill to the clicked province path via inline style (not setAttribute)', () => {
    const path: SVGElement = fixture.nativeElement.querySelector('path');
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    // The fix uses path.style.fill = color (real CSS, resolves var()/color-mix()) instead of
    // path.setAttribute('fill', color) (an SVG presentation attribute, which does not resolve
    // var()/color-mix() in current browsers). Assert the style property itself was populated
    // with the expected color-mix(...) expression, and that the presentation attribute was NOT
    // used for this purpose.
    expect(path.style.fill).toContain('color-mix(in srgb, var(--cold)');
    expect(path.style.fill).toContain('var(--warm)');
    expect(path.getAttribute('fill')).toBeNull();
  });

  it('viewOnDashboard() selects the active city and navigates to /', () => {
    const path: SVGElement = fixture.nativeElement.querySelector('path');
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const selectedCityService = TestBed.inject(SelectedCityService);

    fixture.componentInstance.viewOnDashboard();

    expect(selectedCityService.cityName()).toBe('Ankara');
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('shows the loading state while the request is in flight, before any response arrives', () => {
    const path: SVGElement = fixture.nativeElement.querySelector('path');
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Yukleniyor...');

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();
  });

  it('renders the temperature and "Anasayfada gor" button for a province at exactly 0 degrees (falsy-but-not-null regression)', () => {
    const path: SVGElement = fixture.nativeElement.querySelector('path');
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush({ ...mockForecast, temperatureCelsius: 0 });
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTemp()).toBe(0);

    const panel = fixture.nativeElement as HTMLElement;
    expect(panel.textContent).not.toContain('Yukleniyor...');
    expect(panel.querySelector('.map-page__panel-action')).toBeTruthy();
    expect(panel.querySelector('.map-page__panel-temp')?.textContent).toContain('0');
  });

  it('ignores a stale response when a second province is clicked before the first one responds', () => {
    const paths: NodeListOf<SVGElement> = fixture.nativeElement.querySelectorAll('path');
    const ankaraPath = paths[0];
    const izmirPath = paths[1];

    ankaraPath.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    izmirPath.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const izmirForecast = { ...mockForecast, cityName: 'İzmir', temperatureCelsius: 30 };

    // The second click's request resolves first...
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/${encodeURIComponent('İzmir')}`).flush(izmirForecast);
    fixture.detectChanges();

    // ...then the first click's now-stale request resolves after.
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    expect(fixture.componentInstance.activeCity()).toBe('İzmir');
    expect(fixture.componentInstance.activeTemp()).toBe(30);
  });
});

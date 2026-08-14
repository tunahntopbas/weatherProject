import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { MapPageComponent } from './map-page.component';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { environment } from '../../../environments/environment';

describe('MapPageComponent', () => {
  let fixture: ComponentFixture<MapPageComponent>;
  let httpMock: HttpTestingController;

  const sampleSvg = `<svg id="map-svg" viewBox="0 0 10 10">
    <g><g id="ankara" data-plate-code="06" data-name="Ankara"><path d="M0,0 L1,1"/></g></g>
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
});

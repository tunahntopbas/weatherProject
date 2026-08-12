import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WeatherDashboardComponent } from './weather-dashboard.component';
import { environment } from '../../../environments/environment';

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
});

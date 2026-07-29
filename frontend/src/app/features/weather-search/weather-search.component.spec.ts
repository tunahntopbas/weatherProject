import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WeatherSearchComponent } from './weather-search.component';
import { environment } from '../../../environments/environment';

describe('WeatherSearchComponent', () => {
  let fixture: ComponentFixture<WeatherSearchComponent>;
  let component: WeatherSearchComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherSearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
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

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WeatherService } from './weather.service';
import { environment } from '../../../environments/environment';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WeatherService, provideHttpClient(), provideHttpClientTesting()]
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

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MultiCityWeatherService, CityWeatherSummary } from './multi-city-weather.service';
import { environment } from '../../../environments/environment';

// forkJoin ile paralel isteklerin dogru birlestigini ve bir istegin basarisiz
// olmasi durumunda digerlerinin etkilenmedigini (failed:true ile devam ettigini) test eder
describe('MultiCityWeatherService', () => {
  let service: MultiCityWeatherService;
  let httpMock: HttpTestingController;

  const mockForecast = {
    cityName: 'Ankara',
    date: '2026-08-14',
    temperatureCelsius: 30,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MultiCityWeatherService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MultiCityWeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('emits an empty array for an empty city list without making any request', () => {
    let result: CityWeatherSummary[] | undefined;
    service.getSummaries([]).subscribe((r) => (result = r));
    expect(result).toEqual([]);
  });

  it('returns a summary per city, marking a failed city without breaking the others', () => {
    let result: CityWeatherSummary[] | undefined;
    service.getSummaries(['Ankara', 'BadCity']).subscribe((r) => (result = r));

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/BadCity`).flush('err', { status: 500, statusText: 'Server Error' });

    expect(result).toEqual([
      { cityName: 'Ankara', temperatureCelsius: 30, weatherCode: 0, failed: false },
      { cityName: 'BadCity', temperatureCelsius: null, weatherCode: null, failed: true },
    ]);
  });
});

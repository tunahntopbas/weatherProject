import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { WeatherService } from './weather.service';

export interface CityWeatherSummary {
  cityName: string;
  temperatureCelsius: number | null;
  weatherCode: number | null;
  failed: boolean;
}

@Injectable({ providedIn: 'root' })
export class MultiCityWeatherService {
  private readonly weatherService = inject(WeatherService);

  getSummaries(cityNames: string[]): Observable<CityWeatherSummary[]> {
    if (cityNames.length === 0) return of([]);

    const requests = cityNames.map((cityName) =>
      this.weatherService.getCurrentWeather(cityName).pipe(
        map((forecast) => ({
          cityName,
          temperatureCelsius: forecast.temperatureCelsius,
          weatherCode: forecast.weatherCode,
          failed: false,
        })),
        catchError(() => of({ cityName, temperatureCelsius: null, weatherCode: null, failed: true })),
      ),
    );

    return forkJoin(requests);
  }
}

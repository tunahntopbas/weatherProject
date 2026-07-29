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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeatherForecast } from '../models/weather-forecast.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  // apiBaseUrl bos oldugu icin bu istek hep goreceli /api/... yoluna gidiyor -
  // sehir adinda bosluk/ozel karakter olabilir (orn. "Afyonkarahisar" degil de
  // kullanicinin serbest yazdigi bir isim), encodeURIComponent bunu URL-guvenli hale getiriyor
  getCurrentWeather(cityName: string): Observable<WeatherForecast> {
    return this.http.get<WeatherForecast>(`${environment.apiBaseUrl}/api/weather/${encodeURIComponent(cityName)}`);
  }
}

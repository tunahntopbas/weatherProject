import { Injectable, signal } from '@angular/core';
import { resolveWeatherTheme, WeatherTheme } from './weather-theme.service';

// Cloudy/day is the same neutral fallback WeatherDashboardComponent used to fall back to
// before any forecast has loaded (weatherCode 2, isDay true).
const DEFAULT_THEME = resolveWeatherTheme(2, true);

/**
 * Holds the "currently active" WeatherTheme so it can be shared between whichever feature
 * page computes it (currently only WeatherDashboardComponent, via its forecast()) and the
 * shell (App), which renders the single, route-persistent <app-animated-background> layer.
 */
// kisacasi: dashboard hava durumunu cekince temayi burada guncelliyor, app.ts
// da bu signal'i okuyup arka plani gunceliyor - iki component birbirini
// dogrudan bilmiyor, aradaki kopruyu bu servis kuruyor
@Injectable({ providedIn: 'root' })
export class WeatherThemeStateService {
  readonly theme = signal<WeatherTheme>(DEFAULT_THEME);

  setTheme(theme: WeatherTheme): void {
    this.theme.set(theme);
  }
}

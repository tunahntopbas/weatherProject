import { Component, computed, inject, signal } from '@angular/core';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { resolveWeatherTheme } from '../../core/services/weather-theme.service';
import { CityAutocompleteComponent } from '../../components/city-autocomplete/city-autocomplete.component';
import { AnimatedBackgroundComponent } from '../../components/animated-background/animated-background.component';
import { WeatherHeroComponent } from '../../components/weather-hero/weather-hero.component';
import { ForecastStripComponent } from '../../components/forecast-strip/forecast-strip.component';

const RECENT_CITIES_KEY = 'weather-recent-cities';
const MAX_RECENT_CITIES = 5;

@Component({
  selector: 'app-weather-dashboard',
  imports: [CityAutocompleteComponent, AnimatedBackgroundComponent, WeatherHeroComponent, ForecastStripComponent],
  templateUrl: './weather-dashboard.component.html',
  styleUrl: './weather-dashboard.component.scss',
})
export class WeatherDashboardComponent {
  private readonly weatherService = inject(WeatherService);

  readonly forecast = signal<WeatherForecast | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly recentCities = signal<string[]>(this.loadRecentCities());

  readonly theme = computed(() => {
    const f = this.forecast();
    return resolveWeatherTheme(f?.weatherCode ?? 2, f?.isDay ?? true);
  });

  onCitySelected(city: string): void {
    this.errorMessage.set(null);
    this.weatherService.getCurrentWeather(city).subscribe({
      next: (result) => {
        this.forecast.set(result);
        this.pushRecentCity(city);
      },
      error: () => {
        this.forecast.set(null);
        this.errorMessage.set('Hava durumu alinamadi. Lutfen listeden bir il secin.');
      },
    });
  }

  private loadRecentCities(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_CITIES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private pushRecentCity(city: string): void {
    const updated = [city, ...this.recentCities().filter((c) => c !== city)].slice(0, MAX_RECENT_CITIES);
    this.recentCities.set(updated);
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
  }
}

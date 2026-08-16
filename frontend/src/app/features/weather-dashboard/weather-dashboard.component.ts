import { Component, computed, effect, inject, signal } from '@angular/core';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { resolveWeatherTheme } from '../../core/services/weather-theme.service';
import { WeatherThemeStateService } from '../../core/services/weather-theme-state.service';
import { WeatherHeroComponent } from '../../components/weather-hero/weather-hero.component';
import { ForecastStripComponent } from '../../components/forecast-strip/forecast-strip.component';
import { CityWeatherCardComponent } from '../../components/city-weather-card/city-weather-card.component';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { MultiCityWeatherService, CityWeatherSummary } from '../../core/services/multi-city-weather.service';

const RECENT_CITIES_KEY = 'weather-recent-cities';
const MAX_RECENT_CITIES = 5;

@Component({
  selector: 'app-weather-dashboard',
  imports: [WeatherHeroComponent, ForecastStripComponent, CityWeatherCardComponent],
  templateUrl: './weather-dashboard.component.html',
  styleUrl: './weather-dashboard.component.scss',
})
export class WeatherDashboardComponent {
  private readonly weatherService = inject(WeatherService);
  private readonly selectedCityService = inject(SelectedCityService);
  private readonly multiCityWeatherService = inject(MultiCityWeatherService);
  private readonly weatherThemeStateService = inject(WeatherThemeStateService);

  readonly forecast = signal<WeatherForecast | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly recentCities = signal<string[]>(this.loadRecentCities());
  readonly recentSummaries = signal<CityWeatherSummary[]>([]);

  readonly theme = computed(() => {
    const f = this.forecast();
    return resolveWeatherTheme(f?.weatherCode ?? 2, f?.isDay ?? true);
  });

  constructor() {
    effect(() => {
      const city = this.selectedCityService.cityName();
      if (city) this.onCitySelected(city);
    });

    effect(() => {
      const cities = this.recentCities();
      this.multiCityWeatherService.getSummaries(cities).subscribe((summaries) => this.recentSummaries.set(summaries));
    });

    // Push this page's derived theme up to the shell so <app-animated-background> (now
    // hoisted into App and rendered once per app, not per route) reflects live forecast data.
    effect(() => {
      this.weatherThemeStateService.setTheme(this.theme());
    });
  }

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

  onCardSelected(city: string): void {
    this.selectedCityService.select(city);
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

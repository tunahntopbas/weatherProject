import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { resolveWeatherTheme } from '../../core/services/weather-theme.service';
import { WeatherThemeStateService } from '../../core/services/weather-theme-state.service';
import { WeatherHeroComponent } from '../../components/weather-hero/weather-hero.component';
import { ForecastStripComponent } from '../../components/forecast-strip/forecast-strip.component';
import { CityWeatherCardComponent } from '../../components/city-weather-card/city-weather-card.component';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { MultiCityWeatherService, CityWeatherSummary } from '../../core/services/multi-city-weather.service';

// son aranan sehirler tarayicida localStorage'da tutuluyor, backend'e hic
// gitmiyor - sayfa yenilense de kaybolmasin diye
const RECENT_CITIES_KEY = 'weather-recent-cities';
const MAX_RECENT_CITIES = 5;

// ana sayfa (route: '') - hero karti, haftalik tahmin seridi ve son aranan
// sehirlerin ozet kartlarini bir arada gosteriyor
@Component({
  selector: 'app-weather-dashboard',
  imports: [NgTemplateOutlet, WeatherHeroComponent, ForecastStripComponent, CityWeatherCardComponent],
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

  // hava koduna ve gunduz/gece durumuna gore arka plan temasini secen computed -
  // forecast degistiginde otomatik yeniden hesaplanir, elle tetiklemeye gerek yok
  readonly theme = computed(() => {
    const f = this.forecast();
    return resolveWeatherTheme(f?.weatherCode ?? 2, f?.isDay ?? true);
  });

  constructor() {
    // sidebar/top-bar'daki sehir aramasi SelectedCityService uzerinden buraya
    // dusuyor - bu component o servisi dinleyip secilen sehri otomatik yukluyor
    effect(() => {
      const city = this.selectedCityService.cityName();
      if (city) this.onCitySelected(city);
    });

    // son aranan sehirler listesi her degistiginde, o sehirlerin ozet kartlari
    // (kucuk sicaklik/durum bilgisi) toplu bir istekle yenileniyor
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
      // backend'den hata donerse (mesela disariya API cagrisi basarisiz olursa)
      // burada kullaniciya sade bir mesaj gosteriliyor, teknik detay sizmiyor
      error: () => {
        this.forecast.set(null);
        this.errorMessage.set('Hava durumu alinamadi. Lutfen listeden bir il secin.');
      },
    });
  }

  // ozet kartlardan birine tiklaninca o sehri "secili sehir" yapiyor, boylece
  // yukaridaki effect tetiklenip o sehrin tam detayini yukluyor
  onCardSelected(city: string): void {
    this.selectedCityService.select(city);
  }

  // sayfa ilk acildiginda localStorage'dan onceki oturumun son aramalarini
  // okumaya calisiyor - veri bozuksa/yoksa sessizce bos liste donuyor
  private loadRecentCities(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_CITIES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private pushRecentCity(city: string): void {
    // ayni sehir tekrar aranirsa listede iki kere gorunmesin diye once eski
    // kaydi filtreleyip en basa yeniden ekliyoruz, sonra son 5 ile sinirliyoruz
    const updated = [city, ...this.recentCities().filter((c) => c !== city)].slice(0, MAX_RECENT_CITIES);
    this.recentCities.set(updated);
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
  }
}

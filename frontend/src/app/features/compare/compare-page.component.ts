import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { CityAutocompleteComponent } from '../../components/city-autocomplete/city-autocomplete.component';
import { ProvinceBadgeComponent } from '../../components/province-badge/province-badge.component';

// 3'ten fazla sehri yan yana koymak kucuk ekranlarda okunmaz oluyor,
// bu yuzden sabit bir ust sinir konuldu
const MAX_COMPARE_CITIES = 3;

// her slot bir "yuklendi mi / hata mi / bos mu" durumunu tutuyor - forecast
// null ise ya henuz gelmedi ya da failed=true ile basarisiz oldugu belli
export interface CompareSlot {
  cityName: string;
  forecast: WeatherForecast | null;
  failed: boolean;
}

// route: 'karsilastir' - secilen sehirleri yan yana kartlar halinde gosterip
// sicaklik/nem gibi degerleri kiyaslamayi sagliyor
@Component({
  selector: 'app-compare-page',
  imports: [DecimalPipe, CityAutocompleteComponent, ProvinceBadgeComponent],
  templateUrl: './compare-page.component.html',
  styleUrl: './compare-page.component.scss',
})
export class ComparePageComponent {
  private readonly weatherService = inject(WeatherService);

  readonly slots = signal<CompareSlot[]>([]);

  addCity(cityName: string): void {
    if (this.slots().length >= MAX_COMPARE_CITIES) return;
    if (this.slots().some((s) => s.cityName === cityName)) return;

    // once bos/yukleniyor durumuyla slot ekleniyor ki kullanici aninda geri
    // bildirim gorsun, sonra istek tamamlaninca updateSlot ile dolduruluyor
    this.slots.set([...this.slots(), { cityName, forecast: null, failed: false }]);

    this.weatherService.getCurrentWeather(cityName).subscribe({
      next: (forecast) => this.updateSlot(cityName, { cityName, forecast, failed: false }),
      error: () => this.updateSlot(cityName, { cityName, forecast: null, failed: true }),
    });
  }

  removeCity(cityName: string): void {
    this.slots.set(this.slots().filter((s) => s.cityName !== cityName));
  }

  private updateSlot(cityName: string, next: CompareSlot): void {
    this.slots.set(this.slots().map((s) => (s.cityName === cityName ? next : s)));
  }
}

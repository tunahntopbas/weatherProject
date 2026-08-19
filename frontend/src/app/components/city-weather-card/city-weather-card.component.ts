import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CityWeatherSummary } from '../../core/services/multi-city-weather.service';
import { WEATHER_CATEGORY_ICON, weatherCategoryFromCode } from '../../core/services/weather-theme.service';
import { ProvinceBadgeComponent } from '../province-badge/province-badge.component';

@Component({
  selector: 'app-city-weather-card',
  imports: [DecimalPipe, ProvinceBadgeComponent],
  templateUrl: './city-weather-card.component.html',
  styleUrl: './city-weather-card.component.scss',
})
// harita/karsilastirma sayfalarinda kucuk bir kart olarak bir sehri gosterir -
// il plakasi rozeti + sicaklik + ikon. Tiklaninca "select" ile disariya sehir
// ismini bildirir, kendi icinde navigasyon yapmaz (onu cagiran karar verir)
export class CityWeatherCardComponent {
  readonly summary = input.required<CityWeatherSummary>();
  readonly select = output<string>();

  // weatherCode null ise (ornegin veri hic gelmediyse) ikon yerine tire goster
  readonly icon = computed(() => {
    const code = this.summary().weatherCode;
    return code === null ? '—' : WEATHER_CATEGORY_ICON[weatherCategoryFromCode(code)];
  });

  onClick(): void {
    this.select.emit(this.summary().cityName);
  }
}

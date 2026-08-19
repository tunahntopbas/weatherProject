import { Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { WeatherTheme } from '../../core/services/weather-theme.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ProvinceBadgeComponent } from '../province-badge/province-badge.component';

@Component({
  selector: 'app-weather-hero',
  imports: [DecimalPipe, ProvinceBadgeComponent],
  templateUrl: './weather-hero.component.html',
  styleUrl: './weather-hero.component.scss',
})
// anasayfadaki buyuk baslik karti: sicaklik, sehir adi, ruzgar/nem ve favori
// yildizi. Kendi basina veri cekmiyor, forecast/theme'i disaridan (dashboard
// component'inden) input olarak aliyor - saf gosterim bileseni
export class WeatherHeroComponent {
  private readonly favoritesService = inject(FavoritesService);

  readonly forecast = input.required<WeatherForecast>();
  readonly theme = input.required<WeatherTheme>();

  readonly isFavorite = computed(() => this.favoritesService.isFavorite(this.forecast().cityName));

  toggleFavorite(): void {
    this.favoritesService.toggle(this.forecast().cityName);
  }
}

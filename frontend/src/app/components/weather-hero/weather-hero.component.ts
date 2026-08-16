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
export class WeatherHeroComponent {
  private readonly favoritesService = inject(FavoritesService);

  readonly forecast = input.required<WeatherForecast>();
  readonly theme = input.required<WeatherTheme>();

  readonly isFavorite = computed(() => this.favoritesService.isFavorite(this.forecast().cityName));

  toggleFavorite(): void {
    this.favoritesService.toggle(this.forecast().cityName);
  }
}

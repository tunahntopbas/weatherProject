import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { MultiCityWeatherService, CityWeatherSummary } from '../../core/services/multi-city-weather.service';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { CityWeatherCardComponent } from '../../components/city-weather-card/city-weather-card.component';

@Component({
  selector: 'app-favorites-page',
  imports: [CityWeatherCardComponent],
  templateUrl: './favorites-page.component.html',
  styleUrl: './favorites-page.component.scss',
})
export class FavoritesPageComponent {
  private readonly favoritesService = inject(FavoritesService);
  private readonly multiCityWeatherService = inject(MultiCityWeatherService);
  private readonly selectedCityService = inject(SelectedCityService);
  private readonly router = inject(Router);

  readonly summaries = signal<CityWeatherSummary[]>([]);

  constructor() {
    effect(() => {
      const cities = this.favoritesService.favorites();
      this.multiCityWeatherService.getSummaries(cities).subscribe((summaries) => this.summaries.set(summaries));
    });
  }

  onCardSelected(cityName: string): void {
    this.selectedCityService.select(cityName);
    this.router.navigate(['/']);
  }
}

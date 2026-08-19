import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { MultiCityWeatherService, CityWeatherSummary } from '../../core/services/multi-city-weather.service';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { CityWeatherCardComponent } from '../../components/city-weather-card/city-weather-card.component';

// route: 'favoriler' - FavoritesService'te (localStorage tabanli) tutulan
// favori sehirlerin ozet hava durumu kartlarini listeler
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
    // favori listesi (ekleme/cikarma) her degistiginde ozet kartlar otomatik
    // yenileniyor - baska bir sekmede/yerde favori degisse bile signal sayesinde senkron kalir
    effect(() => {
      const cities = this.favoritesService.favorites();
      this.multiCityWeatherService.getSummaries(cities).subscribe((summaries) => this.summaries.set(summaries));
    });
  }

  // favori bir sehre tiklaninca ana sayfaya donup o sehri direkt gosteriyor -
  // SelectedCityService uzerinden WeatherDashboardComponent'e haber veriliyor
  onCardSelected(cityName: string): void {
    this.selectedCityService.select(cityName);
    this.router.navigate(['/']);
  }
}

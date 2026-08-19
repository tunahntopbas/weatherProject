import { Routes } from '@angular/router';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';
import { FavoritesPageComponent } from './features/favorites/favorites-page.component';
import { ComparePageComponent } from './features/compare/compare-page.component';
import { MapPageComponent } from './features/map/map-page.component';

// route yollari bilerek Turkce (favoriler, karsilastir, harita) - kullanicinin
// adres cubugunda gorecegi URL bu, Ingilizce yerine dogrudan Turkce yazildi
export const routes: Routes = [
  { path: '', component: WeatherDashboardComponent },
  { path: 'favoriler', component: FavoritesPageComponent },
  { path: 'karsilastir', component: ComparePageComponent },
  { path: 'harita', component: MapPageComponent },
];

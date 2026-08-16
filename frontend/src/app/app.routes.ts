import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';
import { FavoritesPageComponent } from './features/favorites/favorites-page.component';
import { ComparePageComponent } from './features/compare/compare-page.component';

@Component({ selector: 'app-coming-soon', template: '<p class="coming-soon">Yakinda</p>' })
class ComingSoonPageComponent {}

export const routes: Routes = [
  { path: '', component: WeatherDashboardComponent },
  { path: 'favoriler', component: FavoritesPageComponent },
  { path: 'karsilastir', component: ComparePageComponent },
  { path: 'harita', component: ComingSoonPageComponent },
];

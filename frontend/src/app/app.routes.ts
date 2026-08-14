import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';

@Component({ selector: 'app-coming-soon', template: '<p class="coming-soon">Yakinda</p>' })
class ComingSoonPageComponent {}

export const routes: Routes = [
  { path: '', component: WeatherDashboardComponent },
  { path: 'favoriler', component: ComingSoonPageComponent },
  { path: 'karsilastir', component: ComingSoonPageComponent },
  { path: 'harita', component: ComingSoonPageComponent },
];

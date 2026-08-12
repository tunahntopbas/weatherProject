import { Component } from '@angular/core';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';

@Component({
  selector: 'app-root',
  imports: [WeatherDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

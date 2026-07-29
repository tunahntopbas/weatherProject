import { Component } from '@angular/core';
import { WeatherSearchComponent } from './features/weather-search/weather-search.component';

@Component({
  selector: 'app-root',
  imports: [WeatherSearchComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}

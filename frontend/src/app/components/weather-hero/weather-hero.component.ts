import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { WeatherTheme } from '../../core/services/weather-theme.service';

@Component({
  selector: 'app-weather-hero',
  imports: [DecimalPipe],
  templateUrl: './weather-hero.component.html',
  styleUrl: './weather-hero.component.scss',
})
export class WeatherHeroComponent {
  readonly forecast = input.required<WeatherForecast>();
  readonly theme = input.required<WeatherTheme>();
}

import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';

@Component({
  selector: 'app-weather-search',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './weather-search.component.html',
  styleUrl: './weather-search.component.scss'
})
export class WeatherSearchComponent {
  private readonly weatherService = inject(WeatherService);

  cityName = '';
  forecast = signal<WeatherForecast | null>(null);
  errorMessage = signal<string | null>(null);

  search(): void {
    if (!this.cityName.trim()) {
      return;
    }

    this.errorMessage.set(null);
    this.weatherService.getCurrentWeather(this.cityName).subscribe({
      next: (result) => this.forecast.set(result),
      error: () => {
        this.forecast.set(null);
        this.errorMessage.set('Hava durumu alinamadi. Sehir adini kontrol edin.');
      }
    });
  }
}

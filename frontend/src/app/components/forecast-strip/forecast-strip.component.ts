import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DailyForecast } from '../../core/models/weather-forecast.model';

interface DayPoint {
  label: string;
  tempMax: number;
  tempMin: number;
  x: number;
  y: number;
}

const VIEW_WIDTH = 700;
const VIEW_HEIGHT = 60;

@Component({
  selector: 'app-forecast-strip',
  imports: [DecimalPipe],
  templateUrl: './forecast-strip.component.html',
  styleUrl: './forecast-strip.component.scss',
})
export class ForecastStripComponent {
  readonly days = input.required<DailyForecast[]>();

  readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

  readonly points = computed<DayPoint[]>(() => {
    const days = this.days();
    if (days.length === 0) return [];

    const maxes = days.map((d) => d.tempMaxCelsius);
    const highest = Math.max(...maxes);
    const lowest = Math.min(...maxes);
    const range = highest - lowest || 1;

    return days.map((d, i) => {
      const x = days.length === 1 ? 0 : (i / (days.length - 1)) * VIEW_WIDTH;
      const normalized = (d.tempMaxCelsius - lowest) / range;
      const y = VIEW_HEIGHT - normalized * (VIEW_HEIGHT - 10) - 5;
      return {
        label: new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
        tempMax: d.tempMaxCelsius,
        tempMin: d.tempMinCelsius,
        x,
        y,
      };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  });
}

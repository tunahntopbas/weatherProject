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

// SVG viewBox boyutlari - gercek piksel degil, oran cizimi icin sabit bir
// koordinat alani. CSS tarafinda strip__line bunu container genisligine gore
// otomatik olcekliyor (preserveAspectRatio="none")
const VIEW_WIDTH = 700;
const VIEW_HEIGHT = 60;

@Component({
  selector: 'app-forecast-strip',
  imports: [DecimalPipe],
  templateUrl: './forecast-strip.component.html',
  styleUrl: './forecast-strip.component.scss',
})
// 7 gunluk tahmini kucuk bir cizgi grafik + gunluk min/max olarak gosteren serit.
// Herhangi bir chart kutuphanesi kullanilmiyor, SVG path'i elle hesaplaniyor
export class ForecastStripComponent {
  readonly days = input.required<DailyForecast[]>();

  readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

  // her gunun sicakligini SVG koordinatina cevirir - en yuksek/dusuk sicakliga
  // gore normalize edilir (range hesabi), boylece grafik her zaman tam yuksekligi kullanir
  readonly points = computed<DayPoint[]>(() => {
    const days = this.days();
    if (days.length === 0) return [];

    const maxes = days.map((d) => d.tempMaxCelsius);
    const highest = Math.max(...maxes);
    const lowest = Math.min(...maxes);
    // tum gunler ayni sicaklikta olursa range 0 olur, sifira bolme hatasi olmasin diye 1'e sabitlendi
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

  // points'teki noktalari SVG <path> "d" attribute'una cevirir (M=basla, L=cizgi cek)
  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  });
}

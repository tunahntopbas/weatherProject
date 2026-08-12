import { Component, computed, input } from '@angular/core';
import { WeatherTheme } from '../../core/services/weather-theme.service';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrl: './animated-background.component.scss',
})
export class AnimatedBackgroundComponent {
  readonly theme = input.required<WeatherTheme>();

  readonly skyStyle = computed(() => ({ background: this.theme().skyGradient }));
}

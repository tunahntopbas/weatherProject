import { Component, computed, input } from '@angular/core';
import { WeatherTheme } from '../../core/services/weather-theme.service';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrl: './animated-background.component.scss',
})
export class AnimatedBackgroundComponent {
  readonly theme = input.required<WeatherTheme>();

  readonly photoStyle = computed(() => ({ 'background-image': `url(${this.theme().backgroundImageUrl})` }));
  readonly scrimStyle = computed(() => ({ background: this.theme().skyGradient }));
}

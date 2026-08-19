import { Component, computed, input } from '@angular/core';
import { WeatherTheme } from '../../core/services/weather-theme.service';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrl: './animated-background.component.scss',
})
// tum sayfanin arka planindaki foto + renkli katman + parcacik animasyonu
// (yagmur/kar/yildiz vs) burada uretiliyor. Hangi resim/renk/parcacik
// gosterilecegini kendisi bilmiyor - hepsi disaridan gelen theme input'undan geliyor
export class AnimatedBackgroundComponent {
  // weather-theme.service secilen sehrin hava durumuna gore bu objeyi hesapliyor
  readonly theme = input.required<WeatherTheme>();

  // inline style objeleri computed ile turetiliyor ki theme degistiginde
  // otomatik yeniden hesaplansin, elle subscribe/effect yazmaya gerek kalmasin
  readonly photoStyle = computed(() => ({ 'background-image': `url(${this.theme().backgroundImageUrl})` }));
  readonly scrimStyle = computed(() => ({ background: this.theme().skyGradient }));
}

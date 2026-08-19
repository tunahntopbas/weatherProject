import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/app-shell/sidebar/sidebar.component';
import { TopBarComponent } from './components/app-shell/top-bar/top-bar.component';
import { AnimatedBackgroundComponent } from './components/animated-background/animated-background.component';
import { WeatherThemeStateService } from './core/services/weather-theme-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, TopBarComponent, AnimatedBackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly weatherThemeStateService = inject(WeatherThemeStateService);

  // Read-only from the shell's perspective: WeatherDashboardComponent (currently the only
  // page that derives a real theme from live forecast data) writes into this service; the
  // shell just renders whatever it currently holds so the background persists across routes.
  // sayfa degistirince arka plan animasyonu sifirlanmasin diye state buradan degil,
  // paylasilan servisten okunuyor - route degisince component yeniden kurulsa bile tema kalir
  readonly theme = this.weatherThemeStateService.theme;
}

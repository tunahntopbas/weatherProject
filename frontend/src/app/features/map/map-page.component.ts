import { AfterViewInit, Component, ElementRef, ViewEncapsulation, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { WeatherService } from '../../core/services/weather.service';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { ProvinceBadgeComponent } from '../../components/province-badge/province-badge.component';

const NON_PROVINCE_NAMES = new Set(['North Cyprus', 'South Cyprus']);

@Component({
  selector: 'app-map-page',
  imports: [DecimalPipe, ProvinceBadgeComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  // This component's styles exist ONLY to style SVG content injected via [innerHTML]. Angular's
  // emulated encapsulation scopes the host-side selector too (e.g. `.map-page__host path`
  // compiles to `.map-page__host[_ngcontent-xxx] path[_ngcontent-xxx]`), and innerHTML-injected
  // nodes never receive the `_ngcontent-*` attribute, so scoped selectors never match. Disabling
  // encapsulation is safe here because every rule below is already narrowly scoped by the
  // `.map-page__*` class names.
  encapsulation: ViewEncapsulation.None,
})
export class MapPageComponent implements AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly weatherService = inject(WeatherService);
  private readonly selectedCityService = inject(SelectedCityService);
  private readonly router = inject(Router);
  private readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  readonly svgMarkup = signal<SafeHtml | null>(null);
  readonly activeCity = signal<string | null>(null);
  readonly activeTemp = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.http.get('/images/turkey-provinces.svg', { responseType: 'text' }).subscribe((svg) => {
      this.svgMarkup.set(this.sanitizer.bypassSecurityTrustHtml(svg));
      queueMicrotask(() => this.attachClickHandler());
    });
  }

  viewOnDashboard(): void {
    const city = this.activeCity();
    if (!city) return;
    this.selectedCityService.select(city);
    this.router.navigate(['/']);
  }

  private attachClickHandler(): void {
    const host = this.mapHost()?.nativeElement;
    if (!host) return;

    host.addEventListener('click', (event) => {
      const target = (event.target as Element).closest('g[data-name]');
      if (!target) return;

      const rawName = target.getAttribute('data-name') ?? '';
      if (NON_PROVINCE_NAMES.has(rawName)) return;

      const cityName = rawName.startsWith('İstanbul') ? 'İstanbul' : rawName;
      this.selectProvince(cityName, target);
    });
  }

  private selectProvince(cityName: string, groupEl: Element): void {
    this.errorMessage.set(null);
    this.activeCity.set(cityName);
    this.activeTemp.set(null);

    this.weatherService.getCurrentWeather(cityName).subscribe({
      next: (forecast) => {
        if (this.activeCity() !== cityName) return; // stale response, a newer click superseded this one
        this.activeTemp.set(forecast.temperatureCelsius);
        this.colorProvince(groupEl, forecast.temperatureCelsius);
      },
      error: () => {
        if (this.activeCity() !== cityName) return;
        this.errorMessage.set(`${cityName} icin veri alinamadi.`);
      },
    });
  }

  private colorProvince(groupEl: Element, tempCelsius: number): void {
    const ratio = Math.min(Math.max((tempCelsius + 10) / 40, 0), 1);
    const color = `color-mix(in srgb, var(--cold) ${(1 - ratio) * 100}%, var(--warm) ${ratio * 100}%)`;
    // `var()`/`color-mix()` only resolve through real CSS (an inline `style` property or a
    // stylesheet rule) — setAttribute('fill', ...) on an SVG presentation attribute does not
    // evaluate custom properties or modern color functions in current browsers.
    groupEl.querySelectorAll<SVGElement>('path').forEach((path) => {
      path.style.fill = color;
    });
  }
}

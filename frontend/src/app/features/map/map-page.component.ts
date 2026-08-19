import { AfterViewInit, Component, ElementRef, ViewEncapsulation, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { WeatherService } from '../../core/services/weather.service';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { ProvinceBadgeComponent } from '../../components/province-badge/province-badge.component';

// SVG haritada il olmayan ama data-name'i olan bolgeler var (Kibris) -
// tiklaninca hava durumu sorgusu atmasin diye disarida tutuluyor
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

  // harita bir img degil, ham SVG dosyasi metin olarak cekilip [innerHTML] ile
  // sayfaya gomuluyor - boylece her il bir <g data-name="..."> grubu olarak
  // DOM'da gercekten var oluyor ve tiklanabiliyor/renklendirilebiliyor
  ngAfterViewInit(): void {
    this.http.get('/images/turkey-provinces.svg', { responseType: 'text' }).subscribe((svg) => {
      // bypassSecurityTrustHtml gerekli, yoksa Angular guvenlik icin SVG
      // iceriginin cogunu sessizce siler - dosya kendi projemizden geldigi
      // (kullanici girisi olmadigi) icin güvenli
      this.svgMarkup.set(this.sanitizer.bypassSecurityTrustHtml(svg));
      // queueMicrotask: [innerHTML] ile DOM'a yazma islemi bitmeden click
      // handler eklenmeye calisilirsa host henuz bos olabilir, bir sonraki
      // microtask'a birakip DOM'un gerçekten guncellenmesini garantiliyoruz
      queueMicrotask(() => this.attachClickHandler());
    });
  }

  // aktif ildeki sicakligi gordukten sonra "ana sayfada gor" butonuyla o ile
  // gecis yapmayi sagliyor
  viewOnDashboard(): void {
    const city = this.activeCity();
    if (!city) return;
    this.selectedCityService.select(city);
    this.router.navigate(['/']);
  }

  // tek bir click listener tum harita konteynerine ekleniyor (event delegation) -
  // 81 ilin her biri icin ayri ayri listener eklemek yerine, tiklanan noktanin
  // en yakin data-name'li grubunu closest() ile buluyoruz
  private attachClickHandler(): void {
    const host = this.mapHost()?.nativeElement;
    if (!host) return;

    host.addEventListener('click', (event) => {
      const target = (event.target as Element).closest('g[data-name]');
      if (!target) return;

      const rawName = target.getAttribute('data-name') ?? '';
      if (NON_PROVINCE_NAMES.has(rawName)) return;

      // SVG'de Istanbul'un data-name'i bazen ek bilgiyle geliyor (adalar vs.),
      // hepsini tek "İstanbul" ismine indirgiyoruz
      const cityName = rawName.startsWith('İstanbul') ? 'İstanbul' : rawName;
      this.selectProvince(cityName, target);
    });
  }

  // bir ile tiklaninca hava durumu cekiliyor, gelince o ilin SVG grubu sicakliga
  // gore renklendiriliyor (asagida colorProvince). Kullanici hizli hizli farkli
  // illere tiklarsa eski istekler "stale" sayilip yok sayiliyor (asagidaki kontrol)
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
    // -10 derece ile +30 derece arasini 0-1 araligina yayip soguktan sicaga
    // renk gecisi yapiyoruz (asagida color-mix ile) - araligin disina tasarsa
    // clamp (Math.min/max) ile 0 veya 1'de sabitleniyor
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

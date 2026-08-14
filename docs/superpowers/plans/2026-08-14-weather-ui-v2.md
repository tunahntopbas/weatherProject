# Weather UI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current single-page CSS-generative weather dashboard into a 4-page app (Anasayfa, Favoriler, Karsilastir, Harita) with real bundled photography, self-hosted fonts, a plaka-rozeti signature element, and real routing/sidebar navigation.

**Architecture:** Pure frontend change (Angular 22, standalone components, signals). No backend changes — every new feature is built by calling the existing `GET /api/weather/{cityName}` endpoint multiple times/ways. Angular Router is added for the first time (package already present, never wired up). A new `SelectedCityService` (signal-based) decouples the city-search input (now living in a shared top bar outside the router-outlet) from the page components that react to it.

**Tech Stack:** Angular 22 (standalone components, signals, new control flow), RxJS (`forkJoin`/`catchError` for parallel per-city fetches), SCSS, self-hosted OFL fonts (Fraunces, Manrope, IBM Plex Mono), a bundled third-party MIT-licensed SVG map.

## Global Constraints

- No backend changes. Every task is frontend-only (`frontend/`).
- No runtime CDN/network dependency for fonts, photos, or the map — everything is downloaded once during implementation and committed as a static asset under `frontend/public/`.
- Self-hosted font files are plain `.ttf` (not `.woff2`) — avoids requiring a font-conversion tool in the implementation environment. Larger download, zero extra tooling dependency.
- Preserve `docs/superpowers/specs/2026-08-14-weather-ui-v2-design.md` design tokens exactly: colors `--ink #0B0F14`, `--paper #F7F8FA`, `--stamp #C6672E`, `--cold #5B8FA8`, `--warm #D98B3F`, `--glass-border rgba(255,255,255,.14)`; fonts Fraunces (display), Manrope (body), IBM Plex Mono (utility/mono).
- `prefers-reduced-motion: reduce` must continue to disable all new animations (existing global rule in `frontend/src/styles.scss` already covers `animation`/`transition`, keep every new animation expressed through those properties, not JS-driven).
- Every new/modified Angular file gets a corresponding `.spec.ts`; run `npm test -- --watch=false` after every task and keep the suite green before committing.
- Turkish text in UI copy: no ASCII-folding required in source going forward (existing code mixes both — follow whatever the immediate surrounding file already does; new files should use correct Turkish diacritics since the codebase already does for province names).

---

## File Structure

```
frontend/public/
  fonts/                          Fraunces-Variable.ttf, Fraunces-Italic-Variable.ttf,
                                   Manrope-Variable.ttf, IBMPlexMono-{Regular,Medium,SemiBold}.ttf,
                                   OFL-{Fraunces,Manrope,IBMPlexMono}.txt
  images/weather/                 clear.jpg, cloudy.jpg, fog.jpg, rain.jpg, snow.jpg, storm.jpg
  images/turkey-provinces.svg     81-il SVG harita (bundled, MIT)
  CREDITS.md                      foto/font/harita kaynak ve lisans dokumu

frontend/src/
  styles.scss                     (MODIFY) design tokens + @font-face
  index.html                      (MODIFY) remove Google Fonts <link>/<preconnect>

frontend/src/app/
  app.routes.ts                   (NEW) 4 route
  app.config.ts                   (MODIFY) provideRouter
  app.ts / app.html / app.scss    (MODIFY) becomes shell: sidebar + top-bar + router-outlet
  app.spec.ts                     (MODIFY)

  core/data/
    turkish-province-plate-codes.ts   (NEW) il adi -> 2 haneli plaka kodu

  core/services/
    weather-theme.service.ts          (MODIFY) + backgroundImageUrl, category icon helper
    weather-theme.service.spec.ts     (MODIFY)
    selected-city.service.ts          (NEW) + spec
    favorites.service.ts              (NEW) + spec
    multi-city-weather.service.ts     (NEW) + spec

  components/
    animated-background/*             (MODIFY) photo layer + spec
    weather-hero/*                    (MODIFY) plaka rozeti + favori butonu, new spec.ts
    province-badge/*                  (NEW) reusable plaka rozeti
    city-weather-card/*               (NEW) reusable ikon+sicaklik+rozet kart
    app-shell/sidebar/*                (NEW)
    app-shell/top-bar/*                (NEW)

  features/
    weather-dashboard/*                (MODIFY) recent panel -> live cards, autocomplete removed
    favorites/*                        (NEW)
    compare/*                          (NEW)
    map/*                              (NEW)

README.md                              (MODIFY) new routes + self-hosted fonts note
```

---

### Task 1: Design tokens + self-hosted fonts

**Files:**
- Modify: `frontend/src/styles.scss`
- Modify: `frontend/src/index.html`
- Create: `frontend/public/fonts/Fraunces-Variable.ttf`, `Fraunces-Italic-Variable.ttf`, `Manrope-Variable.ttf`, `IBMPlexMono-Regular.ttf`, `IBMPlexMono-Medium.ttf`, `IBMPlexMono-SemiBold.ttf`, `OFL-Fraunces.txt`, `OFL-Manrope.txt`, `OFL-IBMPlexMono.txt`

This is a visual-only change (no component/test changes) — verified by manual `npm start` check at the end, not a unit test.

- [ ] **Step 1: Download the font files (all OFL-licensed, from the canonical `google/fonts` GitHub repo)**

Run (from repo root):

```bash
mkdir -p frontend/public/fonts
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf" -o frontend/public/fonts/Fraunces-Variable.ttf
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces-Italic%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf" -o frontend/public/fonts/Fraunces-Italic-Variable.ttf
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/Manrope%5Bwght%5D.ttf" -o frontend/public/fonts/Manrope-Variable.ttf
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf" -o frontend/public/fonts/IBMPlexMono-Regular.ttf
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf" -o frontend/public/fonts/IBMPlexMono-Medium.ttf
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf" -o frontend/public/fonts/IBMPlexMono-SemiBold.ttf
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt" -o frontend/public/fonts/OFL-Fraunces.txt
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt" -o frontend/public/fonts/OFL-Manrope.txt
curl -sL "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/OFL.txt" -o frontend/public/fonts/OFL-IBMPlexMono.txt
```

Verify: `ls -la frontend/public/fonts` shows 9 files, none 0 bytes (`find frontend/public/fonts -size 0` prints nothing).

- [ ] **Step 2: Replace `frontend/src/styles.scss` tokens + add `@font-face`**

```scss
@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/Fraunces-Variable.ttf') format('truetype-variations');
  font-weight: 300 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Fraunces';
  src: url('/fonts/Fraunces-Italic-Variable.ttf') format('truetype-variations');
  font-weight: 300 900;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'Manrope';
  src: url('/fonts/Manrope-Variable.ttf') format('truetype-variations');
  font-weight: 200 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/fonts/IBMPlexMono-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/fonts/IBMPlexMono-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/fonts/IBMPlexMono-SemiBold.ttf') format('truetype');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

:root {
  --color-bg: #e8edf0;
  --color-surface: #ffffff;
  --color-ink: #1b2430;
  --color-muted: #5a6d80;
  --color-hairline: #c7d2d9;
  --color-accent: #3e6690;
  --color-accent-hover: #325577;
  --color-ember: #b04e28;

  --font-display: 'Fraunces', ui-serif, serif;
  --font-body: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --color-glass-bg: rgba(12, 16, 22, 0.38);
  --color-on-glass: #f5f7fa;
  --color-on-glass-muted: rgba(245, 247, 250, 0.72);

  --ink: #0b0f14;
  --paper: #f7f8fa;
  --stamp: #c6672e;
  --cold: #5b8fa8;
  --warm: #d98b3f;
  --glass-border: rgba(255, 255, 255, 0.14);
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  margin: 0;
}

body {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Remove the Google Fonts CDN link from `frontend/src/index.html`**

Delete these 3 lines:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Manual check — run the dev server and confirm fonts load with no network request**

Run: `cd frontend && npm start`, open `http://localhost:4200`, open browser DevTools Network tab, filter by "fonts.googleapis" — expect zero matching requests. Filter by "Fraunces"/"Manrope"/"IBMPlexMono" — expect 200 responses from `localhost`.

- [ ] **Step 5: Commit**

```bash
git add frontend/public/fonts frontend/src/styles.scss frontend/src/index.html
git commit -m "feat(frontend): self-host Fraunces/Manrope/IBM Plex Mono, add v2 design tokens"
```

---

### Task 2: Weather-theme background photos + category icon helper

**Files:**
- Modify: `frontend/src/app/core/services/weather-theme.service.ts`
- Modify: `frontend/src/app/core/services/weather-theme.service.spec.ts`
- Create: `frontend/public/images/weather/clear.jpg`, `cloudy.jpg`, `fog.jpg`, `rain.jpg`, `snow.jpg`, `storm.jpg`
- Create: `frontend/public/CREDITS.md`

**Interfaces:**
- Produces: `WeatherTheme.backgroundImageUrl: string`, `weatherCategoryFromCode(weatherCode: number): WeatherCategory`, `WEATHER_CATEGORY_ICON: Record<WeatherCategory, string>` — consumed by Task 3 (animated-background) and Task 7 (city-weather-card).

- [ ] **Step 1: Download the 6 photos (all freely licensed, from Wikimedia Commons)**

Run:

```bash
mkdir -p frontend/public/images/weather
curl -sL "https://upload.wikimedia.org/wikipedia/commons/0/03/Sky_clouds.JPG" -o frontend/public/images/weather/clear.jpg
curl -sL "https://upload.wikimedia.org/wikipedia/commons/b/b1/Grey_cloudy_sky.jpg" -o frontend/public/images/weather/cloudy.jpg
curl -sL "https://upload.wikimedia.org/wikipedia/commons/2/2a/Fog_In_Desolate_Fields_%28Unsplash%29.jpg" -o frontend/public/images/weather/fog.jpg
curl -sL "https://upload.wikimedia.org/wikipedia/commons/d/d2/Rain_shower_after_cold_front_3.JPG" -o frontend/public/images/weather/rain.jpg
curl -sL "https://upload.wikimedia.org/wikipedia/commons/f/f2/Snowy_landscape_%2845722433174%29.jpg" -o frontend/public/images/weather/snow.jpg
curl -sL "https://upload.wikimedia.org/wikipedia/commons/7/7d/Lightning_NOAA.jpg" -o frontend/public/images/weather/storm.jpg
```

Verify: `find frontend/public/images/weather -size 0` prints nothing (no empty downloads).

- [ ] **Step 2: Write `frontend/public/CREDITS.md`**

```md
# Gorsel ve font kaynaklari

## Fotograflar (Wikimedia Commons)

- `clear.jpg` — "Sky clouds" — CC0 1.0 — https://commons.wikimedia.org/wiki/File:Sky_clouds.JPG
- `cloudy.jpg` (drizzle kategorisi de bunu kullanir) — "Grey cloudy sky" — CC-BY 4.0 — Yazar: Gnu-Bricoleur — https://commons.wikimedia.org/wiki/File:Grey_cloudy_sky.jpg
- `fog.jpg` — "Fog In Desolate Fields" — CC0 1.0 — https://commons.wikimedia.org/wiki/File:Fog_In_Desolate_Fields_(Unsplash).jpg
- `rain.jpg` — "Rain shower after cold front" — CC-BY-SA 3.0 — Yazar: Merikanto — https://commons.wikimedia.org/wiki/File:Rain_shower_after_cold_front_3.JPG
- `snow.jpg` — "Snowy landscape" — CC-BY 2.0 — Yazar: Erkki Nokso-Koivisto — https://commons.wikimedia.org/wiki/File:Snowy_landscape_(45722433174).jpg
- `storm.jpg` — "Lightning NOAA" — Public Domain (NOAA calisanin gorevi geregi cektigi foto) — https://commons.wikimedia.org/wiki/File:Lightning_NOAA.jpg

## Harita

- `turkey-provinces.svg` — kaynak: [mcanvar/svg-turkey-map](https://github.com/mcanvar/svg-turkey-map) — MIT License — (c) 2015 Dogukan Guven Nomak

## Fontlar (SIL Open Font License 1.1)

- Fraunces — https://github.com/google/fonts/tree/main/ofl/fraunces
- Manrope — https://github.com/google/fonts/tree/main/ofl/manrope
- IBM Plex Mono — https://github.com/google/fonts/tree/main/ofl/ibmplexmono
```

- [ ] **Step 3: Write the failing tests in `weather-theme.service.spec.ts`**

Add these `it` blocks inside the existing `describe('resolveWeatherTheme', ...)`, plus a new `describe` block, in the same file:

```ts
  it('includes a backgroundImageUrl derived from the category', () => {
    expect(resolveWeatherTheme(0, true).backgroundImageUrl).toBe('/images/weather/clear.jpg');
    expect(resolveWeatherTheme(95, true).backgroundImageUrl).toBe('/images/weather/storm.jpg');
  });

  it('drizzle and cloudy share the same background photo', () => {
    expect(resolveWeatherTheme(51, true).backgroundImageUrl).toBe(
      resolveWeatherTheme(2, true).backgroundImageUrl,
    );
  });
```

And, in a new `describe` block at the bottom of the same file:

```ts
import { weatherCategoryFromCode, WEATHER_CATEGORY_ICON } from './weather-theme.service';

describe('weatherCategoryFromCode', () => {
  it('maps a known code to its category', () => {
    expect(weatherCategoryFromCode(71)).toBe('snow');
  });

  it('falls back to cloudy for an unrecognized code', () => {
    expect(weatherCategoryFromCode(999)).toBe('cloudy');
  });
});

describe('WEATHER_CATEGORY_ICON', () => {
  it('has an icon entry for every category', () => {
    const categories: (keyof typeof WEATHER_CATEGORY_ICON)[] = [
      'clear', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm',
    ];
    for (const category of categories) {
      expect(WEATHER_CATEGORY_ICON[category]).toBeTruthy();
    }
  });
});
```

(Add the `weatherCategoryFromCode, WEATHER_CATEGORY_ICON` names to the existing top import instead of a second `import` statement if your editor flags duplicate imports from the same module.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `backgroundImageUrl` is `undefined`, `weatherCategoryFromCode`/`WEATHER_CATEGORY_ICON` are not exported.

- [ ] **Step 3: Implement — modify `weather-theme.service.ts`**

Replace the full file contents with:

```ts
export type WeatherCategory = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export type ParticleType = 'rain' | 'snow' | 'clouds' | 'sun-rays' | 'stars' | 'fog-bands' | 'lightning';

export interface WeatherTheme {
  category: WeatherCategory;
  isDay: boolean;
  skyGradient: string;
  particle: ParticleType;
  headlineTr: string;
  backgroundImageUrl: string;
}

const CATEGORY_BY_CODE: Record<number, WeatherCategory> = {
  0: 'clear', 1: 'clear',
  2: 'cloudy', 3: 'cloudy',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 80: 'rain', 81: 'rain', 82: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
};

const HEADLINE_TR: Record<WeatherCategory, string> = {
  clear: 'Acik',
  cloudy: 'Bulutlu',
  fog: 'Sisli',
  drizzle: 'Ciseleyen yagmurlu',
  rain: 'Yagmurlu',
  snow: 'Karli',
  storm: 'Firtinali',
};

const PARTICLE_BY_CATEGORY: Partial<Record<WeatherCategory, ParticleType>> = {
  cloudy: 'clouds',
  fog: 'fog-bands',
  drizzle: 'rain',
  rain: 'rain',
  snow: 'snow',
  storm: 'lightning',
};

const SKY_GRADIENTS: Record<WeatherCategory, { day: string; night: string }> = {
  clear: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.18) 0%, rgba(11,15,20,.55) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.45) 0%, rgba(11,15,20,.80) 100%)',
  },
  cloudy: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.30) 0%, rgba(11,15,20,.62) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.55) 0%, rgba(11,15,20,.85) 100%)',
  },
  fog: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.35) 0%, rgba(11,15,20,.65) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.58) 0%, rgba(11,15,20,.86) 100%)',
  },
  drizzle: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.38) 0%, rgba(11,15,20,.68) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.60) 0%, rgba(11,15,20,.88) 100%)',
  },
  rain: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.42) 0%, rgba(11,15,20,.72) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.62) 0%, rgba(11,15,20,.90) 100%)',
  },
  snow: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.28) 0%, rgba(11,15,20,.58) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.50) 0%, rgba(11,15,20,.80) 100%)',
  },
  storm: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.55) 0%, rgba(11,15,20,.85) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.70) 0%, rgba(11,15,20,.94) 100%)',
  },
};

const BACKGROUND_IMAGE_BY_CATEGORY: Record<WeatherCategory, string> = {
  clear: '/images/weather/clear.jpg',
  cloudy: '/images/weather/cloudy.jpg',
  fog: '/images/weather/fog.jpg',
  drizzle: '/images/weather/cloudy.jpg',
  rain: '/images/weather/rain.jpg',
  snow: '/images/weather/snow.jpg',
  storm: '/images/weather/storm.jpg',
};

export const WEATHER_CATEGORY_ICON: Record<WeatherCategory, string> = {
  clear: '☀️',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  snow: '❄️',
  storm: '⛈️',
};

export function weatherCategoryFromCode(weatherCode: number): WeatherCategory {
  return CATEGORY_BY_CODE[weatherCode] ?? 'cloudy';
}

export function resolveWeatherTheme(weatherCode: number, isDay: boolean): WeatherTheme {
  const category = weatherCategoryFromCode(weatherCode);
  const particle: ParticleType =
    category === 'clear' ? (isDay ? 'sun-rays' : 'stars') : (PARTICLE_BY_CATEGORY[category] as ParticleType);

  return {
    category,
    isDay,
    skyGradient: isDay ? SKY_GRADIENTS[category].day : SKY_GRADIENTS[category].night,
    particle,
    headlineTr: HEADLINE_TR[category],
    backgroundImageUrl: BACKGROUND_IMAGE_BY_CATEGORY[category],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (all `weather-theme.service.spec.ts` tests, including the new ones)

- [ ] **Step 5: Commit**

```bash
git add frontend/public/images/weather frontend/public/CREDITS.md frontend/src/app/core/services/weather-theme.service.ts frontend/src/app/core/services/weather-theme.service.spec.ts
git commit -m "feat(frontend): bundle weather-category background photos, add category icon helper"
```

---

### Task 3: Animated-background photo layer

**Files:**
- Modify: `frontend/src/app/components/animated-background/animated-background.component.ts`
- Modify: `frontend/src/app/components/animated-background/animated-background.component.html`
- Modify: `frontend/src/app/components/animated-background/animated-background.component.scss`
- Modify: `frontend/src/app/components/animated-background/animated-background.component.spec.ts`

**Interfaces:**
- Consumes: `WeatherTheme.backgroundImageUrl` (Task 2), `WeatherTheme.skyGradient` (now a semi-transparent scrim, not an opaque sky color — same field, same type).

- [ ] **Step 1: Update the failing test fixture and assertions**

Replace the full file with:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnimatedBackgroundComponent } from './animated-background.component';
import { WeatherTheme } from '../../core/services/weather-theme.service';

describe('AnimatedBackgroundComponent', () => {
  let fixture: ComponentFixture<AnimatedBackgroundComponent>;

  const theme: WeatherTheme = {
    category: 'rain',
    isDay: true,
    skyGradient: 'linear-gradient(180deg, rgba(11,15,20,.42) 0%, rgba(11,15,20,.72) 100%)',
    particle: 'rain',
    headlineTr: 'Yagmurlu',
    backgroundImageUrl: '/images/weather/rain.jpg',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimatedBackgroundComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AnimatedBackgroundComponent);
    fixture.componentRef.setInput('theme', theme);
    fixture.detectChanges();
  });

  it('renders a particle layer with the matching data-particle attribute', () => {
    const el: HTMLElement = fixture.nativeElement;
    const particleLayer = el.querySelector('[data-particle]');
    expect(particleLayer?.getAttribute('data-particle')).toBe('rain');
  });

  it('applies the theme backgroundImageUrl as the photo layer background-image', () => {
    const el: HTMLElement = fixture.nativeElement;
    const photo = el.querySelector('.scene__photo') as HTMLElement;
    expect(photo.style.backgroundImage).toContain('/images/weather/rain.jpg');
  });

  it('applies the theme skyGradient as the scrim layer background', () => {
    const el: HTMLElement = fixture.nativeElement;
    const scrim = el.querySelector('.scene__scrim') as HTMLElement;
    expect(scrim.style.background).toContain('linear-gradient');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `.scene__photo`/`.scene__scrim` do not exist yet.

- [ ] **Step 3: Implement — modify component/template/styles**

`animated-background.component.ts`:

```ts
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
```

`animated-background.component.html`:

```html
<div class="scene">
  <div class="scene__photo" [style]="photoStyle()"></div>
  <div class="scene__scrim" [style]="scrimStyle()"></div>
  <div class="scene__particles" [attr.data-particle]="theme().particle"></div>
</div>
```

`animated-background.component.scss` — replace the `.scene`/`.scene__particles` block at the top with:

```scss
.scene {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.scene__photo {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: background-image 0.6s ease;
}

.scene__scrim {
  position: absolute;
  inset: 0;
  transition: background 1.2s ease;
}

.scene__particles {
  position: absolute;
  inset: 0;
}
```

(Leave every rule below `.scene__particles { ... }` — the per-particle `[data-particle='...']` rules and their `@keyframes` — untouched.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/animated-background
git commit -m "feat(frontend): layer a real weather photo behind the existing gradient scrim"
```

---

### Task 4: Turkish il plaka kodu data + `ProvinceBadgeComponent`

**Files:**
- Create: `frontend/src/app/core/data/turkish-province-plate-codes.ts`
- Create: `frontend/src/app/components/province-badge/province-badge.component.ts`
- Create: `frontend/src/app/components/province-badge/province-badge.component.html`
- Create: `frontend/src/app/components/province-badge/province-badge.component.scss`
- Test: `frontend/src/app/components/province-badge/province-badge.component.spec.ts`

**Interfaces:**
- Produces: `PLATE_CODE_BY_PROVINCE: Record<string, string>`, `<app-province-badge [cityName]="..." />` — consumed by Task 8 (hero), Task 7 (city-weather-card), Task 11 (compare), Task 12 (map).

- [ ] **Step 1: Write `turkish-province-plate-codes.ts`**

```ts
export const PLATE_CODE_BY_PROVINCE: Readonly<Record<string, string>> = {
  Adana: '01', Adıyaman: '02', Afyonkarahisar: '03', Ağrı: '04', Amasya: '05',
  Ankara: '06', Antalya: '07', Artvin: '08', Aydın: '09', Balıkesir: '10',
  Bilecik: '11', Bingöl: '12', Bitlis: '13', Bolu: '14', Burdur: '15',
  Bursa: '16', Çanakkale: '17', Çankırı: '18', Çorum: '19', Denizli: '20',
  Diyarbakır: '21', Edirne: '22', Elazığ: '23', Erzincan: '24', Erzurum: '25',
  Eskişehir: '26', Gaziantep: '27', Giresun: '28', Gümüşhane: '29', Hakkâri: '30',
  Hatay: '31', Isparta: '32', Mersin: '33', İstanbul: '34', İzmir: '35',
  Kars: '36', Kastamonu: '37', Kayseri: '38', Kırklareli: '39', Kırşehir: '40',
  Kocaeli: '41', Konya: '42', Kütahya: '43', Malatya: '44', Manisa: '45',
  Kahramanmaraş: '46', Mardin: '47', Muğla: '48', Muş: '49', Nevşehir: '50',
  Niğde: '51', Ordu: '52', Rize: '53', Sakarya: '54', Samsun: '55',
  Siirt: '56', Sinop: '57', Sivas: '58', Tekirdağ: '59', Tokat: '60',
  Trabzon: '61', Tunceli: '62', Şanlıurfa: '63', Uşak: '64', Van: '65',
  Yozgat: '66', Zonguldak: '67', Aksaray: '68', Bayburt: '69', Karaman: '70',
  Kırıkkale: '71', Batman: '72', Şırnak: '73', Bartın: '74', Ardahan: '75',
  Iğdır: '76', Yalova: '77', Karabük: '78', Kilis: '79', Osmaniye: '80', Düzce: '81',
} as const;
```

- [ ] **Step 2: Write the failing spec `province-badge.component.spec.ts`**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProvinceBadgeComponent } from './province-badge.component';

describe('ProvinceBadgeComponent', () => {
  let fixture: ComponentFixture<ProvinceBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProvinceBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProvinceBadgeComponent);
  });

  it('renders the plate code for a known province', () => {
    fixture.componentRef.setInput('cityName', 'İstanbul');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('34');
  });

  it('renders a fallback dash for an unknown name', () => {
    fixture.componentRef.setInput('cityName', 'NotAProvince');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('--');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `ProvinceBadgeComponent` does not exist.

- [ ] **Step 4: Implement the component**

`province-badge.component.ts`:

```ts
import { Component, computed, input } from '@angular/core';
import { PLATE_CODE_BY_PROVINCE } from '../../core/data/turkish-province-plate-codes';

@Component({
  selector: 'app-province-badge',
  templateUrl: './province-badge.component.html',
  styleUrl: './province-badge.component.scss',
})
export class ProvinceBadgeComponent {
  readonly cityName = input.required<string>();
  readonly plateCode = computed(() => PLATE_CODE_BY_PROVINCE[this.cityName()] ?? '--');
}
```

`province-badge.component.html`:

```html
<span class="badge">{{ plateCode() }}</span>
```

`province-badge.component.scss`:

```scss
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--stamp);
  border-radius: 0.375rem;
  color: var(--stamp);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  transform: rotate(-3deg);
  animation: stamp-in 220ms ease-out;
}

@keyframes stamp-in {
  from {
    opacity: 0;
    transform: rotate(-18deg) scale(1.6);
  }
  to {
    opacity: 1;
    transform: rotate(-3deg) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge {
    animation: none;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/data/turkish-province-plate-codes.ts frontend/src/app/components/province-badge
git commit -m "feat(frontend): add il plaka kodu data + reusable ProvinceBadgeComponent"
```

---

### Task 5: Routing + app shell (sidebar, top bar, `SelectedCityService`)

**Files:**
- Create: `frontend/src/app/app.routes.ts`
- Create: `frontend/src/app/core/services/selected-city.service.ts`
- Test: `frontend/src/app/core/services/selected-city.service.spec.ts`
- Create: `frontend/src/app/components/app-shell/sidebar/sidebar.component.ts`, `.html`, `.scss`
- Create: `frontend/src/app/components/app-shell/top-bar/top-bar.component.ts`, `.html`, `.scss`
- Modify: `frontend/src/app/app.config.ts`
- Modify: `frontend/src/app/app.ts`, `app.html`, `app.scss`, `app.spec.ts`
- Modify: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.ts`, `.html`
- Modify: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.spec.ts`

Routes to `favoriler`/`karsilastir`/`harita` point at components created in Tasks 10–12; this task creates minimal placeholder standalone components inline (a one-line "Yakinda" component) so routing can be built and tested now, then Tasks 10–12 replace them with the real implementation (same file paths, so no route wiring changes needed later).

**Interfaces:**
- Produces: `SelectedCityService.cityName: Signal<string | null>`, `SelectedCityService.select(cityName: string): void` — consumed by `TopBarComponent`, `WeatherDashboardComponent`, and later by Tasks 10/12 ("view on dashboard" actions).
- Produces: routes `''`, `'favoriler'`, `'karsilastir'`, `'harita'`.

- [ ] **Step 1: Write the failing spec for `SelectedCityService`**

`selected-city.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { SelectedCityService } from './selected-city.service';

describe('SelectedCityService', () => {
  let service: SelectedCityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectedCityService);
  });

  it('starts with a null cityName', () => {
    expect(service.cityName()).toBeNull();
  });

  it('updates cityName() when select() is called', () => {
    service.select('Ankara');
    expect(service.cityName()).toBe('Ankara');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `SelectedCityService` does not exist.

- [ ] **Step 3: Implement `SelectedCityService`**

```ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SelectedCityService {
  readonly cityName = signal<string | null>(null);

  select(cityName: string): void {
    this.cityName.set(cityName);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 5: Create the sidebar component**

`sidebar.component.ts`:

```ts
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {}
```

`sidebar.component.html`:

```html
<nav class="sidebar" aria-label="Ana navigasyon">
  <span class="sidebar__logo">HD</span>
  <a
    class="sidebar__link"
    routerLink="/"
    routerLinkActive="sidebar__link--active"
    [routerLinkActiveOptions]="{ exact: true }"
    aria-label="Anasayfa"
  >🏠</a>
  <a class="sidebar__link" routerLink="/favoriler" routerLinkActive="sidebar__link--active" aria-label="Favoriler">♥</a>
  <a class="sidebar__link" routerLink="/karsilastir" routerLinkActive="sidebar__link--active" aria-label="Karsilastir">⇄</a>
  <a class="sidebar__link" routerLink="/harita" routerLinkActive="sidebar__link--active" aria-label="Harita">▦</a>
</nav>
```

`sidebar.component.scss`:

```scss
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 4.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 0;
  background: var(--color-glass-bg);
  backdrop-filter: blur(18px);
  border-right: 1px solid var(--glass-border);
  z-index: 2;
}

.sidebar__logo {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--paper);
  letter-spacing: 0.08em;
}

.sidebar__link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  font-size: 1.25rem;
  text-decoration: none;
  color: var(--color-on-glass-muted);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  &:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
  }

  &--active {
    background: var(--stamp);
    color: var(--paper);
  }
}
```

- [ ] **Step 6: Create the top-bar component**

`top-bar.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { CityAutocompleteComponent } from '../../city-autocomplete/city-autocomplete.component';
import { SelectedCityService } from '../../../core/services/selected-city.service';

@Component({
  selector: 'app-top-bar',
  imports: [CityAutocompleteComponent],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  private readonly selectedCityService = inject(SelectedCityService);

  onCitySelected(cityName: string): void {
    this.selectedCityService.select(cityName);
  }
}
```

`top-bar.component.html`:

```html
<header class="top-bar">
  <app-city-autocomplete (citySelected)="onCitySelected($event)" />
</header>
```

`top-bar.component.scss`:

```scss
.top-bar {
  padding: 1.5rem 1.5rem 0 6rem;
}
```

- [ ] **Step 7: Create `app.routes.ts` (with inline placeholder pages for the 3 not-yet-built routes)**

```ts
import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';

@Component({ selector: 'app-coming-soon', template: '<p class="coming-soon">Yakinda</p>' })
class ComingSoonPageComponent {}

export const routes: Routes = [
  { path: '', component: WeatherDashboardComponent },
  { path: 'favoriler', component: ComingSoonPageComponent },
  { path: 'karsilastir', component: ComingSoonPageComponent },
  { path: 'harita', component: ComingSoonPageComponent },
];
```

(Tasks 10, 11, 12 each replace one `ComingSoonPageComponent` route entry with the real page component and its own import — see those tasks' Step for the exact `app.routes.ts` diff.)

- [ ] **Step 8: Wire the router into `app.config.ts`**

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
  ]
};
```

- [ ] **Step 9: Turn `app.ts`/`app.html`/`app.scss` into the shell**

`app.ts`:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/app-shell/sidebar/sidebar.component';
import { TopBarComponent } from './components/app-shell/top-bar/top-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, TopBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
```

`app.html`:

```html
<app-sidebar />
<div class="shell__main">
  <app-top-bar />
  <router-outlet />
</div>
```

`app.scss`:

```scss
.shell__main {
  margin-left: 4.5rem;
  min-height: 100dvh;
}
```

- [ ] **Step 10: Remove the autocomplete from the dashboard and react to `SelectedCityService` instead**

In `weather-dashboard.component.ts`, remove the `CityAutocompleteComponent` import and remove it from the `imports` array; add `effect` to the `@angular/core` import; inject `SelectedCityService`; add a constructor:

```ts
import { Component, computed, effect, inject, signal } from '@angular/core';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { resolveWeatherTheme } from '../../core/services/weather-theme.service';
import { AnimatedBackgroundComponent } from '../../components/animated-background/animated-background.component';
import { WeatherHeroComponent } from '../../components/weather-hero/weather-hero.component';
import { ForecastStripComponent } from '../../components/forecast-strip/forecast-strip.component';
import { SelectedCityService } from '../../core/services/selected-city.service';

const RECENT_CITIES_KEY = 'weather-recent-cities';
const MAX_RECENT_CITIES = 5;

@Component({
  selector: 'app-weather-dashboard',
  imports: [AnimatedBackgroundComponent, WeatherHeroComponent, ForecastStripComponent],
  templateUrl: './weather-dashboard.component.html',
  styleUrl: './weather-dashboard.component.scss',
})
export class WeatherDashboardComponent {
  private readonly weatherService = inject(WeatherService);
  private readonly selectedCityService = inject(SelectedCityService);

  readonly forecast = signal<WeatherForecast | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly recentCities = signal<string[]>(this.loadRecentCities());

  readonly theme = computed(() => {
    const f = this.forecast();
    return resolveWeatherTheme(f?.weatherCode ?? 2, f?.isDay ?? true);
  });

  constructor() {
    effect(() => {
      const city = this.selectedCityService.cityName();
      if (city) this.onCitySelected(city);
    });
  }

  onCitySelected(city: string): void {
    this.errorMessage.set(null);
    this.weatherService.getCurrentWeather(city).subscribe({
      next: (result) => {
        this.forecast.set(result);
        this.pushRecentCity(city);
      },
      error: () => {
        this.forecast.set(null);
        this.errorMessage.set('Hava durumu alinamadi. Lutfen listeden bir il secin.');
      },
    });
  }

  private loadRecentCities(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_CITIES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private pushRecentCity(city: string): void {
    const updated = [city, ...this.recentCities().filter((c) => c !== city)].slice(0, MAX_RECENT_CITIES);
    this.recentCities.set(updated);
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
  }
}
```

In `weather-dashboard.component.html`, remove the `<app-city-autocomplete (citySelected)="onCitySelected($event)" />` line (the recent-cities chip block and the rest stay as-is for this task — Task 9 rewrites the recent-cities block itself).

- [ ] **Step 11: Update `app.spec.ts`**

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the sidebar and top bar chrome', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-top-bar')).toBeTruthy();
  });

  it('renders the weather dashboard at the root route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-weather-dashboard')).toBeTruthy();
  });
});
```

- [ ] **Step 12: Add a `SelectedCityService` reaction test to `weather-dashboard.component.spec.ts`**

Add this `it` block (and add `import { SelectedCityService } from '../../core/services/selected-city.service';` to the top of the file):

```ts
  it('loads weather for a city selected via SelectedCityService (top bar search)', async () => {
    const selectedCityService = TestBed.inject(SelectedCityService);
    fixture.detectChanges();

    selectedCityService.select('Ankara');
    await fixture.whenStable();
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`);
    req.flush(mockForecast);

    expect(component.forecast()?.cityName).toBe('Ankara');
  });
```

Also remove the now-invalid DOM assertion inside the existing "renders app-weather-hero..." test if it queries `app-city-autocomplete` (it does not, per the current file — no change needed there beyond the new test above).

- [ ] **Step 13: Run the full frontend suite and fix any red tests**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS. If the new `SelectedCityService` reaction test is flaky on effect timing, this is expected first-pass friction with Angular signal `effect()` inside Zoneless/zone-based change detection — retry with an extra `fixture.detectChanges()` call before `await fixture.whenStable()` rather than removing the test.

- [ ] **Step 14: Commit**

```bash
git add frontend/src/app/app.routes.ts frontend/src/app/app.config.ts frontend/src/app/app.ts frontend/src/app/app.html frontend/src/app/app.scss frontend/src/app/app.spec.ts frontend/src/app/core/services/selected-city.service.ts frontend/src/app/core/services/selected-city.service.spec.ts frontend/src/app/components/app-shell frontend/src/app/features/weather-dashboard/weather-dashboard.component.ts frontend/src/app/features/weather-dashboard/weather-dashboard.component.html frontend/src/app/features/weather-dashboard/weather-dashboard.component.spec.ts
git commit -m "feat(frontend): add Angular Router, sidebar/top-bar shell, SelectedCityService"
```

---

### Task 6: `MultiCityWeatherService`

**Files:**
- Create: `frontend/src/app/core/services/multi-city-weather.service.ts`
- Test: `frontend/src/app/core/services/multi-city-weather.service.spec.ts`

**Interfaces:**
- Consumes: `WeatherService.getCurrentWeather(cityName: string): Observable<WeatherForecast>` (existing).
- Produces: `MultiCityWeatherService.getSummaries(cityNames: string[]): Observable<CityWeatherSummary[]>` where `CityWeatherSummary = { cityName: string; temperatureCelsius: number | null; weatherCode: number | null; failed: boolean }` — consumed by Task 7 callers (dashboard recent panel, favorites page).

- [ ] **Step 1: Write the failing spec**

```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MultiCityWeatherService, CityWeatherSummary } from './multi-city-weather.service';
import { environment } from '../../../environments/environment';

describe('MultiCityWeatherService', () => {
  let service: MultiCityWeatherService;
  let httpMock: HttpTestingController;

  const mockForecast = {
    cityName: 'Ankara',
    date: '2026-08-14',
    temperatureCelsius: 30,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MultiCityWeatherService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MultiCityWeatherService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('emits an empty array for an empty city list without making any request', () => {
    let result: CityWeatherSummary[] | undefined;
    service.getSummaries([]).subscribe((r) => (result = r));
    expect(result).toEqual([]);
  });

  it('returns a summary per city, marking a failed city without breaking the others', () => {
    let result: CityWeatherSummary[] | undefined;
    service.getSummaries(['Ankara', 'BadCity']).subscribe((r) => (result = r));

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/BadCity`).flush('err', { status: 500, statusText: 'Server Error' });

    expect(result).toEqual([
      { cityName: 'Ankara', temperatureCelsius: 30, weatherCode: 0, failed: false },
      { cityName: 'BadCity', temperatureCelsius: null, weatherCode: null, failed: true },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `MultiCityWeatherService` does not exist.

- [ ] **Step 3: Implement**

```ts
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { WeatherService } from './weather.service';

export interface CityWeatherSummary {
  cityName: string;
  temperatureCelsius: number | null;
  weatherCode: number | null;
  failed: boolean;
}

@Injectable({ providedIn: 'root' })
export class MultiCityWeatherService {
  private readonly weatherService = inject(WeatherService);

  getSummaries(cityNames: string[]): Observable<CityWeatherSummary[]> {
    if (cityNames.length === 0) return of([]);

    const requests = cityNames.map((cityName) =>
      this.weatherService.getCurrentWeather(cityName).pipe(
        map((forecast) => ({
          cityName,
          temperatureCelsius: forecast.temperatureCelsius,
          weatherCode: forecast.weatherCode,
          failed: false,
        })),
        catchError(() => of({ cityName, temperatureCelsius: null, weatherCode: null, failed: true })),
      ),
    );

    return forkJoin(requests);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/core/services/multi-city-weather.service.ts frontend/src/app/core/services/multi-city-weather.service.spec.ts
git commit -m "feat(frontend): add MultiCityWeatherService for parallel per-city fetches with isolated failures"
```

---

### Task 7: `CityWeatherCardComponent`

**Files:**
- Create: `frontend/src/app/components/city-weather-card/city-weather-card.component.ts`
- Create: `frontend/src/app/components/city-weather-card/city-weather-card.component.html`
- Create: `frontend/src/app/components/city-weather-card/city-weather-card.component.scss`
- Test: `frontend/src/app/components/city-weather-card/city-weather-card.component.spec.ts`

**Interfaces:**
- Consumes: `CityWeatherSummary` (Task 6), `ProvinceBadgeComponent` (Task 4), `WEATHER_CATEGORY_ICON`/`weatherCategoryFromCode` (Task 2).
- Produces: `<app-city-weather-card [summary]="..." />`, output `select = output<string>()` (emits `cityName` on click) — consumed by Task 9 (dashboard recent panel), Task 10 (favorites page).

- [ ] **Step 1: Write the failing spec**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CityWeatherCardComponent } from './city-weather-card.component';
import { CityWeatherSummary } from '../../core/services/multi-city-weather.service';

describe('CityWeatherCardComponent', () => {
  let fixture: ComponentFixture<CityWeatherCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CityWeatherCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(CityWeatherCardComponent);
  });

  it('renders the city name, temperature, and plate badge for a successful summary', () => {
    const summary: CityWeatherSummary = { cityName: 'Ankara', temperatureCelsius: 24, weatherCode: 0, failed: false };
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ankara');
    expect(text).toContain('24');
    expect(text).toContain('06');
  });

  it('renders a failed state without a temperature for a failed summary', () => {
    const summary: CityWeatherSummary = { cityName: 'BadCity', temperatureCelsius: null, weatherCode: null, failed: true };
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Yuklenemedi');
  });

  it('emits select with the city name on click', () => {
    const summary: CityWeatherSummary = { cityName: 'Ankara', temperatureCelsius: 24, weatherCode: 0, failed: false };
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.select.subscribe((c: string) => (emitted = c));
    (fixture.nativeElement.querySelector('.city-card') as HTMLElement).click();

    expect(emitted).toBe('Ankara');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `CityWeatherCardComponent` does not exist.

- [ ] **Step 3: Implement**

`city-weather-card.component.ts`:

```ts
import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CityWeatherSummary } from '../../core/services/multi-city-weather.service';
import { WEATHER_CATEGORY_ICON, weatherCategoryFromCode } from '../../core/services/weather-theme.service';
import { ProvinceBadgeComponent } from '../province-badge/province-badge.component';

@Component({
  selector: 'app-city-weather-card',
  imports: [DecimalPipe, ProvinceBadgeComponent],
  templateUrl: './city-weather-card.component.html',
  styleUrl: './city-weather-card.component.scss',
})
export class CityWeatherCardComponent {
  readonly summary = input.required<CityWeatherSummary>();
  readonly select = output<string>();

  readonly icon = computed(() => {
    const code = this.summary().weatherCode;
    return code === null ? '—' : WEATHER_CATEGORY_ICON[weatherCategoryFromCode(code)];
  });

  onClick(): void {
    this.select.emit(this.summary().cityName);
  }
}
```

`city-weather-card.component.html`:

```html
<button type="button" class="city-card" (click)="onClick()">
  <app-province-badge [cityName]="summary().cityName" />
  <span class="city-card__name">{{ summary().cityName }}</span>
  @if (summary().failed) {
    <span class="city-card__failed">Yuklenemedi</span>
  } @else {
    <span class="city-card__icon">{{ icon() }}</span>
    <span class="city-card__temp">{{ summary().temperatureCelsius | number: '1.0-0' }}°</span>
  }
</button>
```

`city-weather-card.component.scss`:

```scss
.city-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  border: 1px solid var(--glass-border);
  border-radius: 0.875rem;
  padding: 0.625rem 0.875rem;
  background: var(--color-glass-bg);
  backdrop-filter: blur(12px);
  color: var(--paper);
  font-family: var(--font-body);
  cursor: pointer;
  transition: transform 150ms ease, background 150ms ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.14);
  }

  &:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
  }
}

.city-card__name {
  flex: 1;
  text-align: left;
  font-size: 0.875rem;
}

.city-card__icon {
  font-size: 1rem;
}

.city-card__temp {
  font-family: var(--font-mono);
  font-weight: 600;
}

.city-card__failed {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--warm);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/components/city-weather-card
git commit -m "feat(frontend): add reusable CityWeatherCardComponent"
```

---

### Task 8: Weather-hero upgrades — plaka rozeti + favori butonu

**Files:**
- Create: `frontend/src/app/core/services/favorites.service.ts`
- Test: `frontend/src/app/core/services/favorites.service.spec.ts`
- Modify: `frontend/src/app/components/weather-hero/weather-hero.component.ts`
- Modify: `frontend/src/app/components/weather-hero/weather-hero.component.html`
- Modify: `frontend/src/app/components/weather-hero/weather-hero.component.scss`
- Create: `frontend/src/app/components/weather-hero/weather-hero.component.spec.ts` (did not exist before)

**Interfaces:**
- Produces: `FavoritesService.favorites: Signal<string[]>`, `FavoritesService.isFavorite(cityName): boolean`, `FavoritesService.toggle(cityName): void` — consumed here and by Task 10 (favorites page).

- [ ] **Step 1: Write the failing spec for `FavoritesService`**

```ts
import { TestBed } from '@angular/core/testing';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('starts empty when localStorage has nothing stored', () => {
    const service = TestBed.inject(FavoritesService);
    expect(service.favorites()).toEqual([]);
  });

  it('toggle() adds a city, isFavorite() reflects it, and it persists to localStorage', () => {
    const service = TestBed.inject(FavoritesService);
    service.toggle('Ankara');

    expect(service.favorites()).toEqual(['Ankara']);
    expect(service.isFavorite('Ankara')).toBe(true);
    expect(JSON.parse(localStorage.getItem('weather-favorite-cities')!)).toEqual(['Ankara']);
  });

  it('toggle() removes a city already in favorites', () => {
    const service = TestBed.inject(FavoritesService);
    service.toggle('Ankara');
    service.toggle('Ankara');

    expect(service.favorites()).toEqual([]);
    expect(service.isFavorite('Ankara')).toBe(false);
  });

  it('a fresh instance loads previously persisted favorites', () => {
    localStorage.setItem('weather-favorite-cities', JSON.stringify(['İzmir']));
    const service = TestBed.inject(FavoritesService);
    expect(service.favorites()).toEqual(['İzmir']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `FavoritesService` does not exist.

- [ ] **Step 3: Implement `FavoritesService`**

```ts
import { Injectable, signal } from '@angular/core';

const FAVORITES_KEY = 'weather-favorite-cities';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly favorites = signal<string[]>(this.load());

  isFavorite(cityName: string): boolean {
    return this.favorites().includes(cityName);
  }

  toggle(cityName: string): void {
    const current = this.favorites();
    const next = current.includes(cityName)
      ? current.filter((c) => c !== cityName)
      : [...current, cityName];
    this.favorites.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  private load(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 4: Run tests to verify `FavoritesService` passes**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (FavoritesService tests)

- [ ] **Step 5: Write the failing spec for the upgraded `WeatherHeroComponent`**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeatherHeroComponent } from './weather-hero.component';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { WeatherTheme } from '../../core/services/weather-theme.service';
import { FavoritesService } from '../../core/services/favorites.service';

describe('WeatherHeroComponent', () => {
  let fixture: ComponentFixture<WeatherHeroComponent>;

  const forecast: WeatherForecast = {
    cityName: 'Ankara',
    date: '2026-08-14',
    temperatureCelsius: 24,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [],
  };

  const theme: WeatherTheme = {
    category: 'clear',
    isDay: true,
    skyGradient: 'linear-gradient(180deg, rgba(11,15,20,.18) 0%, rgba(11,15,20,.55) 100%)',
    particle: 'sun-rays',
    headlineTr: 'Acik',
    backgroundImageUrl: '/images/weather/clear.jpg',
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [WeatherHeroComponent] }).compileComponents();
    fixture = TestBed.createComponent(WeatherHeroComponent);
    fixture.componentRef.setInput('forecast', forecast);
    fixture.componentRef.setInput('theme', theme);
    fixture.detectChanges();
  });

  it('renders the province plate badge for the forecast city', () => {
    expect(fixture.nativeElement.querySelector('app-province-badge')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('06');
  });

  it('shows a not-favorited toggle by default and marks it favorited after a click', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.hero__favorite');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    const favoritesService = TestBed.inject(FavoritesService);
    expect(favoritesService.isFavorite('Ankara')).toBe(true);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — no `app-province-badge`/`.hero__favorite` in the current template.

- [ ] **Step 7: Implement — modify `weather-hero.component.ts`/`.html`/`.scss`**

`weather-hero.component.ts`:

```ts
import { Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { WeatherTheme } from '../../core/services/weather-theme.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ProvinceBadgeComponent } from '../province-badge/province-badge.component';

@Component({
  selector: 'app-weather-hero',
  imports: [DecimalPipe, ProvinceBadgeComponent],
  templateUrl: './weather-hero.component.html',
  styleUrl: './weather-hero.component.scss',
})
export class WeatherHeroComponent {
  private readonly favoritesService = inject(FavoritesService);

  readonly forecast = input.required<WeatherForecast>();
  readonly theme = input.required<WeatherTheme>();

  readonly isFavorite = computed(() => this.favoritesService.isFavorite(this.forecast().cityName));

  toggleFavorite(): void {
    this.favoritesService.toggle(this.forecast().cityName);
  }
}
```

`weather-hero.component.html`:

```html
<div class="hero">
  <div class="hero__city-row">
    <p class="hero__city">{{ forecast().cityName }}</p>
    <app-province-badge [cityName]="forecast().cityName" />
    <button
      type="button"
      class="hero__favorite"
      [attr.aria-pressed]="isFavorite()"
      [attr.aria-label]="isFavorite() ? 'Favorilerden cikar' : 'Favorilere ekle'"
      (click)="toggleFavorite()"
    >{{ isFavorite() ? '♥' : '♡' }}</button>
  </div>
  <p class="hero__temp">{{ forecast().temperatureCelsius | number: '1.0-0' }}°</p>
  <h1 class="hero__headline">{{ theme().headlineTr }}</h1>
  <div class="hero__stats">
    <span class="hero__stat">
      <span class="hero__stat-label">Ruzgar</span>
      {{ forecast().windSpeedKmh | number: '1.0-0' }} km/s
    </span>
    <span class="hero__stat">
      <span class="hero__stat-label">Nem</span>
      %{{ forecast().humidityPercent | number: '1.0-0' }}
    </span>
  </div>
</div>
```

Add to `weather-hero.component.scss` (append, don't remove existing rules):

```scss
.hero__city-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
}

.hero__city {
  margin: 0;
}

.hero__favorite {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--stamp);
  font-size: 1.25rem;
  cursor: pointer;
  line-height: 1;

  &:focus-visible {
    outline: 2px solid var(--paper);
    outline-offset: 2px;
  }
}
```

Remove the old standalone `.hero__city { margin: 0 0 0.5rem; ... }` rule's `margin` line conflict by keeping only one `.hero__city` rule — merge: the pre-existing `.hero__city` rule keeps its `font-family`/`font-size`/etc., just drop its `margin` declaration (now `margin: 0` lives on the row instead). Concretely, change the existing `.hero__city` rule from `margin: 0 0 0.5rem;` to `margin: 0;`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/core/services/favorites.service.ts frontend/src/app/core/services/favorites.service.spec.ts frontend/src/app/components/weather-hero
git commit -m "feat(frontend): add FavoritesService, plaka rozeti + favori toggle to weather-hero"
```

---

### Task 9: Dashboard recent panel — live cards

**Files:**
- Modify: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.ts`
- Modify: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.html`
- Modify: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.scss`
- Modify: `frontend/src/app/features/weather-dashboard/weather-dashboard.component.spec.ts`

**Interfaces:**
- Consumes: `MultiCityWeatherService.getSummaries` (Task 6), `CityWeatherCardComponent` (Task 7).
- Produces: `WeatherDashboardComponent.recentSummaries: Signal<CityWeatherSummary[]>`.

- [ ] **Step 1: Update the spec — replace every `.dashboard__recent-chip` assertion with `CityWeatherCardComponent`-based ones**

This replaces (not appends to) the "renders recent-city chips..." and "caps recentCities()..." tests in `weather-dashboard.component.spec.ts`. Replace those two `it` blocks with:

```ts
  it('fetches and renders a live city-weather-card for each recent city (DOM)', () => {
    component.onCitySelected('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    // recentCities effect triggers a MultiCityWeatherService fetch for the 1 recent city
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-city-weather-card');
    expect(cards.length).toBe(1);
  });

  it('caps recentCities() at MAX_RECENT_CITIES (5)', () => {
    const cities = ['City1', 'City2', 'City3', 'City4', 'City5', 'City6'];
    for (const city of cities) {
      component.onCitySelected(city);
      httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/${city}`).flush({ ...mockForecast, cityName: city });
    }

    expect(component.recentCities()).toEqual(['City6', 'City5', 'City4', 'City3', 'City2']);
  });
```

Also delete the now-obsolete "renders recent-city chips and re-triggers a real HTTP search when a chip is clicked (DOM)" test (superseded by the two above) — the chip click behavior is replaced by `CityWeatherCardComponent`'s `select` output, covered by Task 7's own spec.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `app-city-weather-card` not present in the dashboard template yet.

- [ ] **Step 3: Implement — modify the component**

In `weather-dashboard.component.ts`, add imports and a `recentSummaries` computed-from-effect pattern (recent cities fetch happens whenever `recentCities()` changes):

```ts
import { Component, computed, effect, inject, signal } from '@angular/core';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { resolveWeatherTheme } from '../../core/services/weather-theme.service';
import { AnimatedBackgroundComponent } from '../../components/animated-background/animated-background.component';
import { WeatherHeroComponent } from '../../components/weather-hero/weather-hero.component';
import { ForecastStripComponent } from '../../components/forecast-strip/forecast-strip.component';
import { CityWeatherCardComponent } from '../../components/city-weather-card/city-weather-card.component';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { MultiCityWeatherService, CityWeatherSummary } from '../../core/services/multi-city-weather.service';

const RECENT_CITIES_KEY = 'weather-recent-cities';
const MAX_RECENT_CITIES = 5;

@Component({
  selector: 'app-weather-dashboard',
  imports: [AnimatedBackgroundComponent, WeatherHeroComponent, ForecastStripComponent, CityWeatherCardComponent],
  templateUrl: './weather-dashboard.component.html',
  styleUrl: './weather-dashboard.component.scss',
})
export class WeatherDashboardComponent {
  private readonly weatherService = inject(WeatherService);
  private readonly selectedCityService = inject(SelectedCityService);
  private readonly multiCityWeatherService = inject(MultiCityWeatherService);

  readonly forecast = signal<WeatherForecast | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly recentCities = signal<string[]>(this.loadRecentCities());
  readonly recentSummaries = signal<CityWeatherSummary[]>([]);

  readonly theme = computed(() => {
    const f = this.forecast();
    return resolveWeatherTheme(f?.weatherCode ?? 2, f?.isDay ?? true);
  });

  constructor() {
    effect(() => {
      const city = this.selectedCityService.cityName();
      if (city) this.onCitySelected(city);
    });

    effect(() => {
      const cities = this.recentCities();
      this.multiCityWeatherService.getSummaries(cities).subscribe((summaries) => this.recentSummaries.set(summaries));
    });
  }

  onCitySelected(city: string): void {
    this.errorMessage.set(null);
    this.weatherService.getCurrentWeather(city).subscribe({
      next: (result) => {
        this.forecast.set(result);
        this.pushRecentCity(city);
      },
      error: () => {
        this.forecast.set(null);
        this.errorMessage.set('Hava durumu alinamadi. Lutfen listeden bir il secin.');
      },
    });
  }

  onCardSelected(city: string): void {
    this.selectedCityService.select(city);
  }

  private loadRecentCities(): string[] {
    try {
      const raw = localStorage.getItem(RECENT_CITIES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private pushRecentCity(city: string): void {
    const updated = [city, ...this.recentCities().filter((c) => c !== city)].slice(0, MAX_RECENT_CITIES);
    this.recentCities.set(updated);
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
  }
}
```

In `weather-dashboard.component.html`, replace the `@if (recentCities().length > 0) { ... }` chip block with:

```html
  @if (recentSummaries().length > 0) {
    <div class="dashboard__recent">
      @for (summary of recentSummaries(); track summary.cityName) {
        <app-city-weather-card [summary]="summary" (select)="onCardSelected($event)" />
      }
    </div>
  }
```

In `weather-dashboard.component.scss`, replace the `.dashboard__recent-chip { ... }` rule block with:

```scss
.dashboard__recent {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.625rem;
}
```

(Keep `.dashboard`, `.dashboard__hint`, `.dashboard__error` rules unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/weather-dashboard
git commit -m "feat(frontend): dashboard recent-cities panel shows live temperature cards"
```

---

### Task 10: Favoriler sayfasi

**Files:**
- Create: `frontend/src/app/features/favorites/favorites-page.component.ts`
- Create: `frontend/src/app/features/favorites/favorites-page.component.html`
- Create: `frontend/src/app/features/favorites/favorites-page.component.scss`
- Test: `frontend/src/app/features/favorites/favorites-page.component.spec.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `FavoritesService.favorites` (Task 8), `MultiCityWeatherService.getSummaries` (Task 6), `CityWeatherCardComponent` (Task 7), `SelectedCityService.select` (Task 5).

- [ ] **Step 1: Write the failing spec**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { FavoritesPageComponent } from './favorites-page.component';
import { FavoritesService } from '../../core/services/favorites.service';
import { environment } from '../../../environments/environment';

describe('FavoritesPageComponent', () => {
  let fixture: ComponentFixture<FavoritesPageComponent>;
  let httpMock: HttpTestingController;

  const mockForecast = {
    cityName: 'Ankara',
    date: '2026-08-14',
    temperatureCelsius: 24,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [],
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [FavoritesPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows an empty-state hint when there are no favorites', () => {
    fixture = TestBed.createComponent(FavoritesPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Henuz favori sehir eklenmedi');
  });

  it('renders a city-weather-card per favorite city', () => {
    TestBed.inject(FavoritesService).toggle('Ankara');
    fixture = TestBed.createComponent(FavoritesPageComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-city-weather-card').length).toBe(1);
  });

  it('navigates to the dashboard and selects the city when a card is clicked', () => {
    TestBed.inject(FavoritesService).toggle('Ankara');
    fixture = TestBed.createComponent(FavoritesPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    (fixture.nativeElement.querySelector('.city-card') as HTMLElement).click();

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `FavoritesPageComponent` does not exist.

- [ ] **Step 3: Implement**

`favorites-page.component.ts`:

```ts
import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { MultiCityWeatherService, CityWeatherSummary } from '../../core/services/multi-city-weather.service';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { CityWeatherCardComponent } from '../../components/city-weather-card/city-weather-card.component';

@Component({
  selector: 'app-favorites-page',
  imports: [CityWeatherCardComponent],
  templateUrl: './favorites-page.component.html',
  styleUrl: './favorites-page.component.scss',
})
export class FavoritesPageComponent {
  private readonly favoritesService = inject(FavoritesService);
  private readonly multiCityWeatherService = inject(MultiCityWeatherService);
  private readonly selectedCityService = inject(SelectedCityService);
  private readonly router = inject(Router);

  readonly summaries = signal<CityWeatherSummary[]>([]);

  constructor() {
    effect(() => {
      const cities = this.favoritesService.favorites();
      this.multiCityWeatherService.getSummaries(cities).subscribe((summaries) => this.summaries.set(summaries));
    });
  }

  onCardSelected(cityName: string): void {
    this.selectedCityService.select(cityName);
    this.router.navigate(['/']);
  }
}
```

`favorites-page.component.html`:

```html
<div class="favorites-page">
  <h1 class="favorites-page__title">Favoriler</h1>
  @if (summaries().length === 0) {
    <p class="favorites-page__hint">Henuz favori sehir eklenmedi, bir sehri arayip kalp ikonuna tiklayin.</p>
  } @else {
    <div class="favorites-page__grid">
      @for (summary of summaries(); track summary.cityName) {
        <app-city-weather-card [summary]="summary" (select)="onCardSelected($event)" />
      }
    </div>
  }
</div>
```

`favorites-page.component.scss`:

```scss
.favorites-page {
  padding: 1.5rem 1.5rem 3rem 6rem;
  color: var(--paper);
}

.favorites-page__title {
  font-family: var(--font-display);
  font-weight: 600;
}

.favorites-page__hint {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--color-on-glass-muted);
}

.favorites-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}
```

- [ ] **Step 4: Wire the real route in `app.routes.ts`**

```ts
import { Routes } from '@angular/router';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';
import { FavoritesPageComponent } from './features/favorites/favorites-page.component';

@Component({ selector: 'app-coming-soon', template: '<p class="coming-soon">Yakinda</p>' })
class ComingSoonPageComponent {}

export const routes: Routes = [
  { path: '', component: WeatherDashboardComponent },
  { path: 'favoriler', component: FavoritesPageComponent },
  { path: 'karsilastir', component: ComingSoonPageComponent },
  { path: 'harita', component: ComingSoonPageComponent },
];
```

(Keep the `Component`/`ComingSoonPageComponent` import/declaration until Task 11 removes the `karsilastir` placeholder too.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/favorites frontend/src/app/app.routes.ts
git commit -m "feat(frontend): add Favoriler page"
```

---

### Task 11: Karsilastirma sayfasi

**Files:**
- Create: `frontend/src/app/features/compare/compare-page.component.ts`
- Create: `frontend/src/app/features/compare/compare-page.component.html`
- Create: `frontend/src/app/features/compare/compare-page.component.scss`
- Test: `frontend/src/app/features/compare/compare-page.component.spec.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `WeatherService.getCurrentWeather` (existing), `CityAutocompleteComponent` (existing), `ProvinceBadgeComponent` (Task 4).

- [ ] **Step 1: Write the failing spec**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComparePageComponent } from './compare-page.component';
import { environment } from '../../../environments/environment';

describe('ComparePageComponent', () => {
  let fixture: ComponentFixture<ComparePageComponent>;
  let component: ComparePageComponent;
  let httpMock: HttpTestingController;

  const forecastFor = (city: string) => ({
    cityName: city,
    date: '2026-08-14',
    temperatureCelsius: 20,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [],
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ComparePageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('addCity() fetches and adds a slot', () => {
    component.addCity('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(forecastFor('Ankara'));

    expect(component.slots().length).toBe(1);
    expect(component.slots()[0].forecast?.cityName).toBe('Ankara');
  });

  it('does not add more than 3 cities', () => {
    component.addCity('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(forecastFor('Ankara'));
    component.addCity('İzmir');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/%C4%B0zmir`).flush(forecastFor('İzmir'));
    component.addCity('Bursa');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Bursa`).flush(forecastFor('Bursa'));

    component.addCity('Konya');

    expect(component.slots().length).toBe(3);
    httpMock.expectNone(`${environment.apiBaseUrl}/api/weather/Konya`);
  });

  it('marks a slot as failed without removing the others on request error', () => {
    component.addCity('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush('err', { status: 500, statusText: 'Server Error' });

    expect(component.slots()[0].failed).toBe(true);
    expect(component.slots()[0].forecast).toBeNull();
  });

  it('removeCity() removes the matching slot', () => {
    component.addCity('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(forecastFor('Ankara'));

    component.removeCity('Ankara');

    expect(component.slots().length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `ComparePageComponent` does not exist.

- [ ] **Step 3: Implement**

`compare-page.component.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherForecast } from '../../core/models/weather-forecast.model';
import { CityAutocompleteComponent } from '../../components/city-autocomplete/city-autocomplete.component';
import { ProvinceBadgeComponent } from '../../components/province-badge/province-badge.component';

const MAX_COMPARE_CITIES = 3;

export interface CompareSlot {
  cityName: string;
  forecast: WeatherForecast | null;
  failed: boolean;
}

@Component({
  selector: 'app-compare-page',
  imports: [DecimalPipe, CityAutocompleteComponent, ProvinceBadgeComponent],
  templateUrl: './compare-page.component.html',
  styleUrl: './compare-page.component.scss',
})
export class ComparePageComponent {
  private readonly weatherService = inject(WeatherService);

  readonly slots = signal<CompareSlot[]>([]);

  addCity(cityName: string): void {
    if (this.slots().length >= MAX_COMPARE_CITIES) return;
    if (this.slots().some((s) => s.cityName === cityName)) return;

    this.slots.set([...this.slots(), { cityName, forecast: null, failed: false }]);

    this.weatherService.getCurrentWeather(cityName).subscribe({
      next: (forecast) => this.updateSlot(cityName, { cityName, forecast, failed: false }),
      error: () => this.updateSlot(cityName, { cityName, forecast: null, failed: true }),
    });
  }

  removeCity(cityName: string): void {
    this.slots.set(this.slots().filter((s) => s.cityName !== cityName));
  }

  private updateSlot(cityName: string, next: CompareSlot): void {
    this.slots.set(this.slots().map((s) => (s.cityName === cityName ? next : s)));
  }
}
```

`compare-page.component.html`:

```html
<div class="compare-page">
  <h1 class="compare-page__title">Karsilastir</h1>

  @if (slots().length < 3) {
    <app-city-autocomplete (citySelected)="addCity($event)" />
  }

  <div class="compare-page__grid">
    @for (slot of slots(); track slot.cityName) {
      <div class="compare-card">
        <div class="compare-card__header">
          <app-province-badge [cityName]="slot.cityName" />
          <span class="compare-card__name">{{ slot.cityName }}</span>
          <button type="button" class="compare-card__remove" (click)="removeCity(slot.cityName)" aria-label="Kaldir">×</button>
        </div>

        @if (slot.failed) {
          <p class="compare-card__failed">Yuklenemedi</p>
        } @else if (slot.forecast; as forecast) {
          <p class="compare-card__temp">{{ forecast.temperatureCelsius | number: '1.0-0' }}°</p>
          <div class="compare-card__stats">
            <span>Ruzgar: {{ forecast.windSpeedKmh | number: '1.0-0' }} km/s</span>
            <span>Nem: %{{ forecast.humidityPercent | number: '1.0-0' }}</span>
          </div>
        } @else {
          <p class="compare-card__loading">Yukleniyor...</p>
        }
      </div>
    }
  </div>
</div>
```

`compare-page.component.scss`:

```scss
.compare-page {
  padding: 1.5rem 1.5rem 3rem 6rem;
  color: var(--paper);
}

.compare-page__title {
  font-family: var(--font-display);
  font-weight: 600;
}

.compare-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.compare-card {
  border: 1px solid var(--glass-border);
  border-radius: 1rem;
  padding: 1.25rem;
  background: var(--color-glass-bg);
  backdrop-filter: blur(14px);
}

.compare-card__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.compare-card__name {
  flex: 1;
  font-weight: 600;
}

.compare-card__remove {
  border: none;
  background: none;
  color: var(--color-on-glass-muted);
  font-size: 1.125rem;
  cursor: pointer;
}

.compare-card__temp {
  font-family: var(--font-display);
  font-size: 2.5rem;
  margin: 0.5rem 0;
}

.compare-card__stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-on-glass-muted);
}

.compare-card__failed {
  color: var(--warm);
  font-family: var(--font-mono);
}
```

- [ ] **Step 4: Wire the real route in `app.routes.ts`**

```ts
import { Routes } from '@angular/router';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';
import { FavoritesPageComponent } from './features/favorites/favorites-page.component';
import { ComparePageComponent } from './features/compare/compare-page.component';

@Component({ selector: 'app-coming-soon', template: '<p class="coming-soon">Yakinda</p>' })
class ComingSoonPageComponent {}

export const routes: Routes = [
  { path: '', component: WeatherDashboardComponent },
  { path: 'favoriler', component: FavoritesPageComponent },
  { path: 'karsilastir', component: ComparePageComponent },
  { path: 'harita', component: ComingSoonPageComponent },
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/compare frontend/src/app/app.routes.ts
git commit -m "feat(frontend): add Karsilastir page"
```

---

### Task 12: Harita sayfasi

**Files:**
- Create: `frontend/public/images/turkey-provinces.svg`
- Create: `frontend/src/app/features/map/map-page.component.ts`
- Create: `frontend/src/app/features/map/map-page.component.html`
- Create: `frontend/src/app/features/map/map-page.component.scss`
- Test: `frontend/src/app/features/map/map-page.component.spec.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `WeatherService.getCurrentWeather` (existing), `SelectedCityService.select` (Task 5), `ProvinceBadgeComponent` (Task 4).

- [ ] **Step 1: Download and extract the map SVG (MIT-licensed, from `mcanvar/svg-turkey-map`)**

Run:

```bash
mkdir -p frontend/public/images
curl -sL "https://raw.githubusercontent.com/mcanvar/svg-turkey-map/master/public/index.html" -o /tmp/turkey-map-source.html
sed -n '/<svg id="map-svg"/,/<\/svg>/p' /tmp/turkey-map-source.html > frontend/public/images/turkey-provinces.svg
```

Verify: `grep -c 'data-name=' frontend/public/images/turkey-provinces.svg` prints `84` (81 il — Istanbul split into `istanbul-anatolia`/`istanbul-thrace`, both plate code 34 — plus `north-cyprus` and `south-cyprus`, which the component below explicitly excludes from click handling).
Verify: first line of the file contains `<svg id="map-svg"`; last line is `</svg>`.

- [ ] **Step 2: Write the failing spec**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { MapPageComponent } from './map-page.component';
import { SelectedCityService } from '../../core/services/selected-city.service';
import { environment } from '../../../environments/environment';

describe('MapPageComponent', () => {
  let fixture: ComponentFixture<MapPageComponent>;
  let httpMock: HttpTestingController;

  const sampleSvg = `<svg id="map-svg" viewBox="0 0 10 10">
    <g><g id="ankara" data-plate-code="06" data-name="Ankara"><path d="M0,0 L1,1"/></g></g>
  </svg>`;

  const mockForecast = {
    cityName: 'Ankara',
    date: '2026-08-14',
    temperatureCelsius: 24,
    description: 'clear sky',
    weatherCode: 0,
    isDay: true,
    windSpeedKmh: 10,
    humidityPercent: 40,
    daily: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(MapPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne('/images/turkey-provinces.svg').flush(sampleSvg);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('fetches weather for the clicked province and shows its temperature', () => {
    const path: SVGElement = fixture.nativeElement.querySelector('path');
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    expect(fixture.componentInstance.activeCity()).toBe('Ankara');
    expect(fixture.componentInstance.activeTemp()).toBe(24);
  });

  it('viewOnDashboard() selects the active city and navigates to /', () => {
    const path: SVGElement = fixture.nativeElement.querySelector('path');
    path.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(mockForecast);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    const selectedCityService = TestBed.inject(SelectedCityService);

    fixture.componentInstance.viewOnDashboard();

    expect(selectedCityService.cityName()).toBe('Ankara');
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `MapPageComponent` does not exist.

- [ ] **Step 4: Implement**

`map-page.component.ts`:

```ts
import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
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
        this.activeTemp.set(forecast.temperatureCelsius);
        this.colorProvince(groupEl, forecast.temperatureCelsius);
      },
      error: () => this.errorMessage.set(`${cityName} icin veri alinamadi.`),
    });
  }

  private colorProvince(groupEl: Element, tempCelsius: number): void {
    const ratio = Math.min(Math.max((tempCelsius + 10) / 40, 0), 1);
    const color = `color-mix(in srgb, var(--cold) ${(1 - ratio) * 100}%, var(--warm) ${ratio * 100}%)`;
    groupEl.querySelectorAll('path').forEach((path) => path.setAttribute('fill', color));
  }
}
```

`map-page.component.html`:

```html
<div class="map-page">
  <h1 class="map-page__title">Harita</h1>
  <p class="map-page__hint">Bir ile tiklayin.</p>

  <div class="map-page__host" #mapHost [innerHTML]="svgMarkup()"></div>

  @if (activeCity(); as city) {
    <div class="map-page__panel">
      <app-province-badge [cityName]="city" />
      <span class="map-page__panel-city">{{ city }}</span>
      @if (activeTemp(); as temp) {
        <span class="map-page__panel-temp">{{ temp | number: '1.0-0' }}°</span>
        <button type="button" class="map-page__panel-action" (click)="viewOnDashboard()">Anasayfada gor</button>
      } @else if (!errorMessage()) {
        <span class="map-page__panel-loading">Yukleniyor...</span>
      }
    </div>
  }

  @if (errorMessage(); as msg) {
    <p class="map-page__error" role="alert">{{ msg }}</p>
  }
</div>
```

`map-page.component.scss`:

```scss
.map-page {
  padding: 1.5rem 1.5rem 3rem 6rem;
  color: var(--paper);
  position: relative;
}

.map-page__title {
  font-family: var(--font-display);
  font-weight: 600;
}

.map-page__hint {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-on-glass-muted);
}

.map-page__host {
  max-width: 60rem;

  svg {
    width: 100%;
    height: auto;
  }

  path {
    fill: rgba(255, 255, 255, 0.18);
    stroke: var(--ink);
    stroke-width: 0.5;
    cursor: pointer;
    transition: fill 200ms ease;
  }

  g[id='north-cyprus'],
  g[id='south-cyprus'] {
    pointer-events: none;

    path {
      fill: rgba(255, 255, 255, 0.06);
      cursor: default;
    }
  }
}

.map-page__panel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--glass-border);
  border-radius: 1rem;
  background: var(--color-glass-bg);
  backdrop-filter: blur(14px);
  width: fit-content;
}

.map-page__panel-temp {
  font-family: var(--font-display);
  font-size: 1.5rem;
}

.map-page__panel-action {
  border: 1px solid var(--stamp);
  background: none;
  color: var(--stamp);
  border-radius: 0.5rem;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  font-family: var(--font-body);
}

.map-page__error {
  color: var(--warm);
  font-family: var(--font-mono);
}
```

Note: `.map-page__host svg`/`path`/`g[id='...']` above are plain nested SCSS selectors targeting content injected via `[innerHTML]` — Angular's default emulated view encapsulation does not scope into `[innerHTML]`-injected markup, so no special `:host`/`::ng-deep`/global escape syntax is needed; the nested selectors apply directly.

- [ ] **Step 5: Wire the real route in `app.routes.ts`** (this removes the now-unused `ComingSoonPageComponent`/`Component` import entirely)

```ts
import { Routes } from '@angular/router';
import { WeatherDashboardComponent } from './features/weather-dashboard/weather-dashboard.component';
import { FavoritesPageComponent } from './features/favorites/favorites-page.component';
import { ComparePageComponent } from './features/compare/compare-page.component';
import { MapPageComponent } from './features/map/map-page.component';

export const routes: Routes = [
  { path: '', component: WeatherDashboardComponent },
  { path: 'favoriler', component: FavoritesPageComponent },
  { path: 'karsilastir', component: ComparePageComponent },
  { path: 'harita', component: MapPageComponent },
];
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/public/images/turkey-provinces.svg frontend/src/app/features/map frontend/src/app/app.routes.ts
git commit -m "feat(frontend): add Harita page with clickable 81-il SVG map"
```

---

### Task 13: Final integration pass

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the full frontend suite one more time**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS, 0 failures.

- [ ] **Step 2: Manual smoke test via the dev server**

Run: `cd frontend && npm start`, open `http://localhost:4200`, and check:
- Sidebar shows 4 icons; each navigates to its page (`/`, `/favoriler`, `/karsilastir`, `/harita`).
- Search a city from the top bar on any page — dashboard updates, background photo matches the weather category, plaka rozeti shows the correct 2-digit code next to the city name.
- Click the heart icon on the hero — Favoriler page shows the city with a live temperature.
- Karsilastir: add up to 3 cities, remove one, confirm the 4th slot is blocked.
- Harita: click a couple of provinces, confirm color changes and "Anasayfada gor" navigates back to `/` with that city loaded.
- DevTools Network tab: no request to `fonts.googleapis.com` or any other external host.

- [ ] **Step 3: Update `README.md`**

Add a short section (placement: after the existing frontend description) documenting the new routes and the self-hosted-assets decision:

```md
### Sayfalar

- `/` — Anasayfa (hava durumu arama + haftalik tahmin)
- `/favoriler` — Favori sehirler (kalici, canli sicaklik kartlari)
- `/karsilastir` — 2-3 sehri yan yana karsilastirma
- `/harita` — Turkiye'nin 81 iline tiklanabilir harita

Tum fontlar ve foto/harita gorselleri derleme zamaninda `frontend/public/` altina
gomulu (bkz. `frontend/public/CREDITS.md` kaynak/lisans listesi icin) — calisma
zamaninda hicbir CDN/dis kaynak istegi yapilmaz.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document new frontend routes and self-hosted asset policy"
```

---

## Self-Review Notes

- **Spec coverage:** Renk/font tokens (Task 1), gercek foto arka planlar (Task 2-3), il plaka rozeti imza ogesi (Task 4, wired in Task 8), routing/sidebar/top-bar (Task 5), favoriler (Task 8+10), karsilastirma (Task 11), harita (Task 12), backend degisikligi yok (confirmed — no task touches `backend/`) — every spec section maps to a task.
- **Type consistency:** `CityWeatherSummary` (Task 6) is used with identical shape in Task 7, 9, 10. `PLATE_CODE_BY_PROVINCE` (Task 4) is the single source of truth consumed by `ProvinceBadgeComponent` everywhere (hero, city-weather-card, compare, map) — the map page does not read `data-plate-code` from the SVG itself, avoiding two sources of truth.
- **No placeholders:** all download URLs, file destinations, and license/attribution text are literal and were verified live during planning (HTTP-fetched license pages, `gh api` file listings) rather than guessed.

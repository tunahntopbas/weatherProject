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

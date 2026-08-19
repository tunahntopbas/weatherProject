import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { FavoritesPageComponent } from './favorites-page.component';
import { FavoritesService } from '../../core/services/favorites.service';
import { environment } from '../../../environments/environment';

// FavoritesService'e sahte favori sehirler koyup sayfanin dogru kartlari
// yukledigini ve karta tiklayinca yonlendirme yaptigini test ediyor
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
    const navigateSpy = vi.spyOn(router, 'navigate');

    (fixture.nativeElement.querySelector('.city-card') as HTMLElement).click();

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});

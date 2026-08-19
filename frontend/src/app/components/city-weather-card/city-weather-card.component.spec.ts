import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CityWeatherCardComponent } from './city-weather-card.component';
import { CityWeatherSummary } from '../../core/services/multi-city-weather.service';

// basarili ve basarisiz (failed:true) durumlarda kartin dogru icerigi
// gosterdigini kontrol ediyor
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

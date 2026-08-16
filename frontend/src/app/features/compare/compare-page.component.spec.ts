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

  it('addCity() called twice with the same city only creates one slot and fires one HTTP request', () => {
    component.addCity('Ankara');
    component.addCity('Ankara');

    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(forecastFor('Ankara'));

    expect(component.slots().length).toBe(1);
  });

  // --- Rendered-template coverage (added on review: no test previously called detectChanges()) ---

  it('renders the added city name in the DOM and hides the autocomplete once 3 slots are filled', () => {
    fixture.detectChanges();

    component.addCity('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush(forecastFor('Ankara'));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ankara');
    expect(fixture.nativeElement.querySelector('app-city-autocomplete')).toBeTruthy();

    component.addCity('İzmir');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/%C4%B0zmir`).flush(forecastFor('İzmir'));
    fixture.detectChanges();

    component.addCity('Bursa');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Bursa`).flush(forecastFor('Bursa'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.compare-card').length).toBe(3);
    expect(fixture.nativeElement.querySelector('app-city-autocomplete')).toBeFalsy();
  });

  it('renders the failed state in the DOM when a request errors', () => {
    fixture.detectChanges();

    component.addCity('Ankara');
    httpMock.expectOne(`${environment.apiBaseUrl}/api/weather/Ankara`).flush('err', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Yuklenemedi');
  });
});

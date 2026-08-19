import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForecastStripComponent } from './forecast-strip.component';
import { DailyForecast } from '../../core/models/weather-forecast.model';

// gunluk noktalarin dogru hesaplandigi ve SVG path'inin olustugu test ediliyor
describe('ForecastStripComponent', () => {
  let fixture: ComponentFixture<ForecastStripComponent>;
  let component: ForecastStripComponent;

  const days: DailyForecast[] = [
    { date: '2026-08-12', weatherCode: 0, tempMaxCelsius: 30, tempMinCelsius: 20 },
    { date: '2026-08-13', weatherCode: 61, tempMaxCelsius: 26, tempMinCelsius: 19 },
    { date: '2026-08-14', weatherCode: 2, tempMaxCelsius: 28, tempMinCelsius: 18 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForecastStripComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ForecastStripComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('days', days);
  });

  it('produces one point per day', () => {
    expect(component.points().length).toBe(3);
  });

  it('gives the hottest day the smallest y (visually highest point)', () => {
    const points = component.points();
    const hottestPoint = points[0]; // 30° is the max
    const coolestPoint = points[1]; // 26° is the min
    expect(hottestPoint.y).toBeLessThan(coolestPoint.y);
  });

  it('builds an SVG path string starting with M and one L per remaining day', () => {
    const path = component.linePath();
    expect(path.startsWith('M ')).toBe(true);
    expect(path.match(/L /g)?.length).toBe(2);
  });

  it('returns an empty path when there are no days', () => {
    fixture.componentRef.setInput('days', []);
    expect(component.linePath()).toBe('');
    expect(component.points()).toEqual([]);
  });

  it('renders one day card in the DOM per input day, with max/min temps shown', () => {
    fixture.detectChanges();
    const dayCards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.strip__day');
    expect(dayCards.length).toBe(3);
    expect(dayCards[0].querySelector('.strip__day-max')?.textContent).toContain('30');
    expect(dayCards[0].querySelector('.strip__day-min')?.textContent).toContain('20');
  });

  it('re-renders the DOM day cards and SVG path when the days input changes', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.strip__day').length).toBe(3);

    fixture.componentRef.setInput('days', [days[0]]);
    fixture.detectChanges();

    const dayCards: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.strip__day');
    expect(dayCards.length).toBe(1);
    const path = fixture.nativeElement.querySelector('path.strip__path') as SVGPathElement;
    expect(path.getAttribute('d')).toBe(component.linePath());
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnimatedBackgroundComponent } from './animated-background.component';
import { WeatherTheme } from '../../core/services/weather-theme.service';

describe('AnimatedBackgroundComponent', () => {
  let fixture: ComponentFixture<AnimatedBackgroundComponent>;

  const theme: WeatherTheme = {
    category: 'rain',
    isDay: true,
    skyGradient: 'linear-gradient(180deg, #445566 0%, #6b7d8c 55%, #98a8b3 100%)',
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

  it('applies the theme skyGradient as the scene background', () => {
    const el: HTMLElement = fixture.nativeElement;
    const scene = el.querySelector('.scene') as HTMLElement;
    expect(scene.style.background).toContain('linear-gradient');
  });
});

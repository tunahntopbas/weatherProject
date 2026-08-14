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

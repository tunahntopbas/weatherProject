import { resolveWeatherTheme } from './weather-theme.service';

describe('resolveWeatherTheme', () => {
  it('maps clear-sky code (0) with isDay true to clear/day/sun-rays', () => {
    const theme = resolveWeatherTheme(0, true);
    expect(theme.category).toBe('clear');
    expect(theme.particle).toBe('sun-rays');
    expect(theme.headlineTr).toBe('Acik');
  });

  it('maps clear-sky code (1) with isDay false to clear/night/stars', () => {
    const theme = resolveWeatherTheme(1, false);
    expect(theme.category).toBe('clear');
    expect(theme.particle).toBe('stars');
  });

  it('maps all rain codes to the rain category with rain particle', () => {
    for (const code of [61, 63, 65, 80, 81, 82]) {
      const theme = resolveWeatherTheme(code, true);
      expect(theme.category).toBe('rain');
      expect(theme.particle).toBe('rain');
    }
  });

  it('maps snow codes to the snow category with snow particle', () => {
    const theme = resolveWeatherTheme(71, true);
    expect(theme.category).toBe('snow');
    expect(theme.particle).toBe('snow');
  });

  it('maps thunderstorm codes to the storm category with lightning particle', () => {
    for (const code of [95, 96, 99]) {
      const theme = resolveWeatherTheme(code, true);
      expect(theme.category).toBe('storm');
      expect(theme.particle).toBe('lightning');
    }
  });

  it('falls back to cloudy for an unrecognized code', () => {
    expect(resolveWeatherTheme(999, true).category).toBe('cloudy');
  });

  it('produces a different skyGradient for day vs night of the same category', () => {
    const day = resolveWeatherTheme(2, true);
    const night = resolveWeatherTheme(2, false);
    expect(day.skyGradient).not.toBe(night.skyGradient);
  });
});

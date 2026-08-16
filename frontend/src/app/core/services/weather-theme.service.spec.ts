import { resolveWeatherTheme, weatherCategoryFromCode, WEATHER_CATEGORY_ICON } from './weather-theme.service';

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

  it('includes a backgroundImageUrl derived from the category', () => {
    expect(resolveWeatherTheme(0, true).backgroundImageUrl).toBe('/images/weather/clear.jpg');
    expect(resolveWeatherTheme(95, true).backgroundImageUrl).toBe('/images/weather/storm.jpg');
  });

  it('drizzle and cloudy share the same background photo', () => {
    expect(resolveWeatherTheme(51, true).backgroundImageUrl).toBe(
      resolveWeatherTheme(2, true).backgroundImageUrl,
    );
  });
});

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

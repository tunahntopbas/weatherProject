export type WeatherCategory = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export type ParticleType = 'rain' | 'snow' | 'clouds' | 'sun-rays' | 'stars' | 'fog-bands' | 'lightning';

export interface WeatherTheme {
  category: WeatherCategory;
  isDay: boolean;
  skyGradient: string;
  particle: ParticleType;
  headlineTr: string;
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
    day: 'linear-gradient(180deg, #4a90d9 0%, #a8d4f0 60%, #e8f4fb 100%)',
    night: 'linear-gradient(180deg, #0b1026 0%, #1a2456 55%, #2c3a6b 100%)',
  },
  cloudy: {
    day: 'linear-gradient(180deg, #7c8a9a 0%, #a7b3bf 55%, #cdd5db 100%)',
    night: 'linear-gradient(180deg, #1c222c 0%, #2c3440 55%, #3a4451 100%)',
  },
  fog: {
    day: 'linear-gradient(180deg, #9aa3a8 0%, #c3cacd 60%, #dfe4e6 100%)',
    night: 'linear-gradient(180deg, #22262a 0%, #383e42 60%, #4c5257 100%)',
  },
  drizzle: {
    day: 'linear-gradient(180deg, #5f7180 0%, #8a9aa6 55%, #b6c2ca 100%)',
    night: 'linear-gradient(180deg, #141a20 0%, #232c34 55%, #333e47 100%)',
  },
  rain: {
    day: 'linear-gradient(180deg, #445566 0%, #6b7d8c 55%, #98a8b3 100%)',
    night: 'linear-gradient(180deg, #0e1318 0%, #1c242c 55%, #2a333c 100%)',
  },
  snow: {
    day: 'linear-gradient(180deg, #93a5b8 0%, #c9d6e0 55%, #eef3f6 100%)',
    night: 'linear-gradient(180deg, #1a2028 0%, #2c3542 55%, #414f5e 100%)',
  },
  storm: {
    day: 'linear-gradient(180deg, #232b34 0%, #3d4a56 55%, #5c6b78 100%)',
    night: 'linear-gradient(180deg, #05070a 0%, #10151c 55%, #1c232c 100%)',
  },
};

export function resolveWeatherTheme(weatherCode: number, isDay: boolean): WeatherTheme {
  const category = CATEGORY_BY_CODE[weatherCode] ?? 'cloudy';
  const particle: ParticleType =
    category === 'clear' ? (isDay ? 'sun-rays' : 'stars') : (PARTICLE_BY_CATEGORY[category] as ParticleType);

  return {
    category,
    isDay,
    skyGradient: isDay ? SKY_GRADIENTS[category].day : SKY_GRADIENTS[category].night,
    particle,
    headlineTr: HEADLINE_TR[category],
  };
}

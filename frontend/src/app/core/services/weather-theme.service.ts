export type WeatherCategory = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export type ParticleType = 'rain' | 'snow' | 'clouds' | 'sun-rays' | 'stars' | 'fog-bands' | 'lightning';

export interface WeatherTheme {
  category: WeatherCategory;
  isDay: boolean;
  skyGradient: string;
  particle: ParticleType;
  headlineTr: string;
  backgroundImageUrl: string;
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
    day: 'linear-gradient(180deg, rgba(11,15,20,.18) 0%, rgba(11,15,20,.55) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.45) 0%, rgba(11,15,20,.80) 100%)',
  },
  cloudy: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.30) 0%, rgba(11,15,20,.62) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.55) 0%, rgba(11,15,20,.85) 100%)',
  },
  fog: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.35) 0%, rgba(11,15,20,.65) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.58) 0%, rgba(11,15,20,.86) 100%)',
  },
  drizzle: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.38) 0%, rgba(11,15,20,.68) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.60) 0%, rgba(11,15,20,.88) 100%)',
  },
  rain: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.42) 0%, rgba(11,15,20,.72) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.62) 0%, rgba(11,15,20,.90) 100%)',
  },
  snow: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.28) 0%, rgba(11,15,20,.58) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.50) 0%, rgba(11,15,20,.80) 100%)',
  },
  storm: {
    day: 'linear-gradient(180deg, rgba(11,15,20,.55) 0%, rgba(11,15,20,.85) 100%)',
    night: 'linear-gradient(180deg, rgba(11,15,20,.70) 0%, rgba(11,15,20,.94) 100%)',
  },
};

const BACKGROUND_IMAGE_BY_CATEGORY: Record<WeatherCategory, string> = {
  clear: '/images/weather/clear.jpg',
  cloudy: '/images/weather/cloudy.jpg',
  fog: '/images/weather/fog.jpg',
  drizzle: '/images/weather/cloudy.jpg',
  rain: '/images/weather/rain.jpg',
  snow: '/images/weather/snow.jpg',
  storm: '/images/weather/storm.jpg',
};

export const WEATHER_CATEGORY_ICON: Record<WeatherCategory, string> = {
  clear: '☀️',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  snow: '❄️',
  storm: '⛈️',
};

export function weatherCategoryFromCode(weatherCode: number): WeatherCategory {
  return CATEGORY_BY_CODE[weatherCode] ?? 'cloudy';
}

export function resolveWeatherTheme(weatherCode: number, isDay: boolean): WeatherTheme {
  const category = weatherCategoryFromCode(weatherCode);
  const particle: ParticleType =
    category === 'clear' ? (isDay ? 'sun-rays' : 'stars') : (PARTICLE_BY_CATEGORY[category] as ParticleType);

  return {
    category,
    isDay,
    skyGradient: isDay ? SKY_GRADIENTS[category].day : SKY_GRADIENTS[category].night,
    particle,
    headlineTr: HEADLINE_TR[category],
    backgroundImageUrl: BACKGROUND_IMAGE_BY_CATEGORY[category],
  };
}

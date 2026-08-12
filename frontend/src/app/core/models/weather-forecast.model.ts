export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMaxCelsius: number;
  tempMinCelsius: number;
}

export interface WeatherForecast {
  cityName: string;
  date: string;
  temperatureCelsius: number;
  description: string;
  weatherCode: number;
  isDay: boolean;
  windSpeedKmh: number;
  humidityPercent: number;
  daily: DailyForecast[];
}

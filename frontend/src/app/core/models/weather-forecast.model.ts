// backend'deki WeatherForecast/DailyForecast entity'lerinin (Domain katmani)
// JSON karsiligi - alan adlari birebir ayni tutuldu, backend'in donduugu JSON
// dogrudan bu interface'e map ediliyor, ayri bir donusum katmani yok
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

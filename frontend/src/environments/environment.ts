// apiBaseUrl bos birakildi: WeatherService istekleri hep goreceli yol (/api/...)
// ile atiyor, boylece istek her zaman sayfayi sunan ayni origin'e gidiyor - o da
// nginx.conf uzerinden backend'e proxy'leniyor. Boylece dev/prod icin ayri
// backend adresi tanimlamaya hic gerek kalmiyor, CORS derdi de olmuyor.
export const environment = {
  production: false,
  apiBaseUrl: ''
};

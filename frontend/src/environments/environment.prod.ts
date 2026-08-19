// build sirasinda angular.json'daki fileReplacements ile environment.ts yerine
// bu dosya kullaniliyor (ng build --configuration production) - ayni mantik
// (bkz. environment.ts), sadece production:true farkli
export const environment = {
  production: true,
  apiBaseUrl: ''
};

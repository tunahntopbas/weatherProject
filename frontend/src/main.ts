import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// standalone bootstrap - eski NgModule tabanli platformBrowserDynamic yerine
// dogrudan App component'i ve appConfig'i veriyoruz, Angular'in yeni (modul-suz) usulu
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// standalone component yapisinda NgModule yok, tum uygulama seviyesi servisler
// (router, http client) burada tek yerden saglaniyor - main.ts bootstrapApplication
// cagirirken bu config'i kullaniyor
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
  ]
};

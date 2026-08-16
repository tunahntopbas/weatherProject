import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SelectedCityService {
  readonly cityName = signal<string | null>(null);

  select(cityName: string): void {
    this.cityName.set(cityName);
  }
}

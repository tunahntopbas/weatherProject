import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SelectedCityService {
  // `equal: () => false` disables Angular's default Object.is value-equality check, so
  // selecting the same city twice in a row still notifies consumers (e.g. the dashboard's
  // effect()). Without this, WritableSignal.set() with an unchanged value is a silent no-op.
  readonly cityName = signal<string | null>(null, { equal: () => false });

  select(cityName: string): void {
    this.cityName.set(cityName);
  }
}

import { Injectable, signal } from '@angular/core';

const FAVORITES_KEY = 'weather-favorite-cities';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly favorites = signal<string[]>(this.load());

  isFavorite(cityName: string): boolean {
    return this.favorites().includes(cityName);
  }

  toggle(cityName: string): void {
    const current = this.favorites();
    const next = current.includes(cityName)
      ? current.filter((c) => c !== cityName)
      : [...current, cityName];
    this.favorites.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  private load(): string[] {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}

import { TestBed } from '@angular/core/testing';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('starts empty when localStorage has nothing stored', () => {
    const service = TestBed.inject(FavoritesService);
    expect(service.favorites()).toEqual([]);
  });

  it('toggle() adds a city, isFavorite() reflects it, and it persists to localStorage', () => {
    const service = TestBed.inject(FavoritesService);
    service.toggle('Ankara');

    expect(service.favorites()).toEqual(['Ankara']);
    expect(service.isFavorite('Ankara')).toBe(true);
    expect(JSON.parse(localStorage.getItem('weather-favorite-cities')!)).toEqual(['Ankara']);
  });

  it('toggle() removes a city already in favorites', () => {
    const service = TestBed.inject(FavoritesService);
    service.toggle('Ankara');
    service.toggle('Ankara');

    expect(service.favorites()).toEqual([]);
    expect(service.isFavorite('Ankara')).toBe(false);
  });

  it('a fresh instance loads previously persisted favorites', () => {
    localStorage.setItem('weather-favorite-cities', JSON.stringify(['İzmir']));
    const service = TestBed.inject(FavoritesService);
    expect(service.favorites()).toEqual(['İzmir']);
  });
});

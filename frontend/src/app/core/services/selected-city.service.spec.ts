import { effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SelectedCityService } from './selected-city.service';

describe('SelectedCityService', () => {
  let service: SelectedCityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectedCityService);
  });

  it('starts with a null cityName', () => {
    expect(service.cityName()).toBeNull();
  });

  it('updates cityName() when select() is called', () => {
    service.select('Ankara');
    expect(service.cityName()).toBe('Ankara');
  });

  it('notifies effects on select() even when re-selecting the same city (no silent no-op)', () => {
    const emissions: (string | null)[] = [];
    TestBed.runInInjectionContext(() => {
      effect(() => {
        emissions.push(service.cityName());
      });
    });
    TestBed.tick();

    service.select('Ankara');
    TestBed.tick();

    // Re-selecting the same city (e.g. searching "Ankara" again from the top bar) must still
    // notify consumers, not be swallowed by WritableSignal.set()'s default Object.is no-op.
    service.select('Ankara');
    TestBed.tick();

    expect(emissions).toEqual([null, 'Ankara', 'Ankara']);
  });
});

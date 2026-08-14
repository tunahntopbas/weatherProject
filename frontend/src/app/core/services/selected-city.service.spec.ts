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
});

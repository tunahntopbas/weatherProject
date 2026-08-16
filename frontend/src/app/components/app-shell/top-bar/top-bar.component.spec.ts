import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { TopBarComponent } from './top-bar.component';
import { CityAutocompleteComponent } from '../../city-autocomplete/city-autocomplete.component';
import { SelectedCityService } from '../../../core/services/selected-city.service';

describe('TopBarComponent', () => {
  let fixture: ComponentFixture<TopBarComponent>;
  let selectedCityService: SelectedCityService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    selectedCityService = TestBed.inject(SelectedCityService);
    fixture.detectChanges();
  });

  it('renders the city autocomplete', () => {
    const autocomplete = fixture.debugElement.query(By.directive(CityAutocompleteComponent));
    expect(autocomplete).toBeTruthy();
  });

  it('forwards a citySelected event from the city autocomplete into SelectedCityService.select()', () => {
    const selectSpy = vi.spyOn(selectedCityService, 'select');

    const autocomplete = fixture.debugElement.query(By.directive(CityAutocompleteComponent))
      .componentInstance as CityAutocompleteComponent;
    autocomplete.citySelected.emit('Ankara');

    expect(selectSpy).toHaveBeenCalledWith('Ankara');
    expect(selectedCityService.cityName()).toBe('Ankara');
  });
});

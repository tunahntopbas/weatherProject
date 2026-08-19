import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { TopBarComponent } from './top-bar.component';
import { CityAutocompleteComponent } from '../../city-autocomplete/city-autocomplete.component';
import { SelectedCityService } from '../../../core/services/selected-city.service';

// sehir secilince SelectedCityService'e dogru isim gidiyor mu ve anasayfaya
// yonlendirme (navigate) tetikleniyor mu diye kontrol ediliyor
describe('TopBarComponent', () => {
  let fixture: ComponentFixture<TopBarComponent>;
  let selectedCityService: SelectedCityService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopBarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBarComponent);
    selectedCityService = TestBed.inject(SelectedCityService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('renders the city autocomplete', () => {
    const autocomplete = fixture.debugElement.query(By.directive(CityAutocompleteComponent));
    expect(autocomplete).toBeTruthy();
  });

  it('forwards a citySelected event from the city autocomplete into SelectedCityService.select() and navigates to /', () => {
    const selectSpy = vi.spyOn(selectedCityService, 'select');
    const navigateSpy = vi.spyOn(router, 'navigate');

    const autocomplete = fixture.debugElement.query(By.directive(CityAutocompleteComponent))
      .componentInstance as CityAutocompleteComponent;
    autocomplete.citySelected.emit('Ankara');

    expect(selectSpy).toHaveBeenCalledWith('Ankara');
    expect(selectedCityService.cityName()).toBe('Ankara');
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});

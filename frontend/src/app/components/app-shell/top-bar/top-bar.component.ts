import { Component, inject } from '@angular/core';
import { CityAutocompleteComponent } from '../../city-autocomplete/city-autocomplete.component';
import { SelectedCityService } from '../../../core/services/selected-city.service';

@Component({
  selector: 'app-top-bar',
  imports: [CityAutocompleteComponent],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  private readonly selectedCityService = inject(SelectedCityService);

  onCitySelected(cityName: string): void {
    this.selectedCityService.select(cityName);
  }
}

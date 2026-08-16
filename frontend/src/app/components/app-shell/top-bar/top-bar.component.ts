import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);

  onCitySelected(cityName: string): void {
    this.selectedCityService.select(cityName);
    // The dashboard is the only page that reacts to SelectedCityService; without navigating,
    // a search from /harita, /favoriler, or /karsilastir would silently do nothing.
    this.router.navigate(['/']);
  }
}

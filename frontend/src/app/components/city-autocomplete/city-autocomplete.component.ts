import { Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TURKISH_PROVINCES } from '../../core/data/turkish-provinces';

@Component({
  selector: 'app-city-autocomplete',
  imports: [FormsModule],
  templateUrl: './city-autocomplete.component.html',
  styleUrl: './city-autocomplete.component.scss',
})
export class CityAutocompleteComponent {
  readonly citySelected = output<string>();

  query = '';
  readonly isOpen = signal(false);
  readonly activeIndex = signal(-1);

  readonly suggestions = computed(() => {
    const q = this.query.trim().toLocaleLowerCase('tr');
    if (!q) return [] as string[];
    return TURKISH_PROVINCES.filter((city) => city.toLocaleLowerCase('tr').startsWith(q)).slice(0, 8);
  });

  onInput(): void {
    this.isOpen.set(true);
    this.activeIndex.set(-1);
  }

  onArrowDown(event: Event): void {
    event.preventDefault();
    const max = this.suggestions().length - 1;
    this.activeIndex.set(Math.min(this.activeIndex() + 1, max));
  }

  onArrowUp(event: Event): void {
    event.preventDefault();
    this.activeIndex.set(Math.max(this.activeIndex() - 1, -1));
  }

  onEnter(event: Event): void {
    const index = this.activeIndex();
    const options = this.suggestions();
    if (index >= 0 && index < options.length) {
      event.preventDefault();
      this.select(options[index]);
      return;
    }

    const exact = TURKISH_PROVINCES.find(
      (city) => city.toLocaleLowerCase('tr') === this.query.trim().toLocaleLowerCase('tr'),
    );
    if (exact) {
      this.select(exact);
    }
  }

  select(city: string): void {
    this.query = city;
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.citySelected.emit(city);
  }

  close(): void {
    this.isOpen.set(false);
  }
}

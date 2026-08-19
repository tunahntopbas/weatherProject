import { Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TURKISH_PROVINCES } from '../../core/data/turkish-provinces';

@Component({
  selector: 'app-city-autocomplete',
  imports: [FormsModule],
  templateUrl: './city-autocomplete.component.html',
  styleUrl: './city-autocomplete.component.scss',
})
// 81 il listesinden yaziya gore filtreleyip acilir liste gosteren arama kutusu.
// Backend'e istek atmiyor, tamamen client-side calisiyor (TURKISH_PROVINCES
// sabit dizisi uzerinde filtreleme) - sehir secilince disariya citySelected ile bildiriyor
export class CityAutocompleteComponent {
  readonly citySelected = output<string>();

  readonly query = signal('');
  readonly isOpen = signal(false);
  // ok tuslariyla gezinilen secili oneri - hicbiri secili degilken -1
  readonly activeIndex = signal(-1);

  readonly suggestions = computed(() => {
    // toLocaleLowerCase('tr') onemli: normal toLowerCase() Turkce "I" harfini
    // yanlis kucultur ("i" degil "ı" olmali), tr locale bunu dogru yapiyor
    const q = this.query().trim().toLocaleLowerCase('tr');
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
    // once ok tuslariyla bir oneri secilmis mi diye bak
    const index = this.activeIndex();
    const options = this.suggestions();
    if (index >= 0 && index < options.length) {
      event.preventDefault();
      this.select(options[index]);
      return;
    }

    // hicbir oneri secilmemisse, kullanici il adini birebir yazip direkt Enter'a
    // basmis olabilir - listeden secmeden de arama yapabilsin diye tam eslesme kontrolu
    const exact = TURKISH_PROVINCES.find(
      (city) => city.toLocaleLowerCase('tr') === this.query().trim().toLocaleLowerCase('tr'),
    );
    if (exact) {
      this.select(exact);
    }
  }

  select(city: string): void {
    this.query.set(city);
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.citySelected.emit(city);
  }

  close(): void {
    this.isOpen.set(false);
  }
}

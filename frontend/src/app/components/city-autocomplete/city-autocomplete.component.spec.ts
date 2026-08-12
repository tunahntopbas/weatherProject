import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CityAutocompleteComponent } from './city-autocomplete.component';

describe('CityAutocompleteComponent', () => {
  let fixture: ComponentFixture<CityAutocompleteComponent>;
  let component: CityAutocompleteComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CityAutocompleteComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CityAutocompleteComponent);
    component = fixture.componentInstance;
  });

  it('shows no suggestions for an empty query', () => {
    component.query.set('');
    expect(component.suggestions()).toEqual([]);
  });

  it('filters provinces by prefix, case-insensitively', () => {
    component.query.set('ist');
    expect(component.suggestions()).toContain('İstanbul');
  });

  it('matches Turkish dotted capital İ correctly against a plain "i" query', () => {
    component.query.set('izm');
    expect(component.suggestions()).toContain('İzmir');
  });

  it('emits citySelected with the exact province name on select()', () => {
    let selected: string | undefined;
    component.citySelected.subscribe((value) => (selected = value));

    component.select('Ankara');

    expect(selected).toBe('Ankara');
    expect(component.query()).toBe('Ankara');
  });

  it('selects the highlighted suggestion when Enter is pressed', () => {
    component.query.set('ada');
    component.onInput();
    component.activeIndex.set(0);
    let selected: string | undefined;
    component.citySelected.subscribe((value) => (selected = value));

    component.onEnter(new KeyboardEvent('keydown'));

    expect(selected).toBe(component.suggestions()[0]);
  });

  it('updates rendered suggestions across successive keystrokes, not just the first render', () => {
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    // First keystroke: broad prefix 'i' matches several provinces (İstanbul, İzmir, Iğdır, Isparta, ...).
    // This forces the `suggestions` computed to be read for the first time here.
    input.value = 'i';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Second keystroke narrows the prefix to 'ist', which only İstanbul matches.
    // If `suggestions` never recomputes after the first read (Finding 1), the DOM
    // would still show the stale multi-result list from the 'i' query.
    input.value = 'ist';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const optionTexts = Array.from(
      fixture.nativeElement.querySelectorAll('li.autocomplete__option') as NodeListOf<HTMLLIElement>,
    ).map((el) => el.textContent?.trim());
    expect(optionTexts).toEqual(['İstanbul']);
  });
});

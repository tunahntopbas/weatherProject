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
    component.query = '';
    expect(component.suggestions()).toEqual([]);
  });

  it('filters provinces by prefix, case-insensitively', () => {
    component.query = 'ist';
    expect(component.suggestions()).toContain('İstanbul');
  });

  it('matches Turkish dotted capital İ correctly against a plain "i" query', () => {
    component.query = 'izm';
    expect(component.suggestions()).toContain('İzmir');
  });

  it('emits citySelected with the exact province name on select()', () => {
    let selected: string | undefined;
    component.citySelected.subscribe((value) => (selected = value));

    component.select('Ankara');

    expect(selected).toBe('Ankara');
    expect(component.query).toBe('Ankara');
  });

  it('selects the highlighted suggestion when Enter is pressed', () => {
    component.query = 'ada';
    component.onInput();
    component.activeIndex.set(0);
    let selected: string | undefined;
    component.citySelected.subscribe((value) => (selected = value));

    component.onEnter(new KeyboardEvent('keydown'));

    expect(selected).toBe(component.suggestions()[0]);
  });
});

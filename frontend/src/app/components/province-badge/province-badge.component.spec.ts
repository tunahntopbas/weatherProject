import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProvinceBadgeComponent } from './province-badge.component';

describe('ProvinceBadgeComponent', () => {
  let fixture: ComponentFixture<ProvinceBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProvinceBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProvinceBadgeComponent);
  });

  it('renders the plate code for a known province', () => {
    fixture.componentRef.setInput('cityName', 'İstanbul');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('34');
  });

  it('renders a fallback dash for an unknown name', () => {
    fixture.componentRef.setInput('cityName', 'NotAProvince');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('--');
  });
});

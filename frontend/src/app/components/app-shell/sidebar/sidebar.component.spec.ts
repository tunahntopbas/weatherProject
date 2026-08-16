import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  });

  it('renders exactly 4 navigation links with the expected routerLink targets', () => {
    const linkDebugEls = fixture.debugElement.queryAll(By.directive(RouterLink));
    expect(linkDebugEls.length).toBe(4);

    const hrefs = linkDebugEls.map((el) => el.injector.get(RouterLink).href);
    expect(hrefs).toEqual(['/', '/favoriler', '/karsilastir', '/harita']);
  });

  it('only the root ("/") link uses exact-match routerLinkActiveOptions', () => {
    const activeDirectives = fixture.debugElement
      .queryAll(By.directive(RouterLinkActive))
      .map((el) => el.injector.get(RouterLinkActive));

    expect(activeDirectives.length).toBe(4);
    expect(activeDirectives[0].routerLinkActiveOptions).toEqual({ exact: true });

    for (const dir of activeDirectives.slice(1)) {
      expect(dir.routerLinkActiveOptions).toEqual({ exact: false });
    }
  });
});

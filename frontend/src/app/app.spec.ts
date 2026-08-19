import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

// shell'in (sidebar, top bar, arka plan) dogru render oldugunu ve route
// degisince arka plan animasyonunun yeniden kurulmadigini (tek instance kaldigini) test eder
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  // varsayilan 5sn timeout, ilk componentin agir TestBed derlemesini
  // karsilamaya yetmiyor - CI makinesi yukluyken flaky timeout aliyordu
  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  }, 15000);

  it('renders the sidebar, top bar chrome, and animated background', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-top-bar')).toBeTruthy();
    expect(compiled.querySelector('app-animated-background')).toBeTruthy();
  });

  it('renders the weather dashboard at the root route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-weather-dashboard')).toBeTruthy();
  });

  it('keeps a single app-animated-background instance mounted when navigating to a non-root route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();

    await router.navigateByUrl('/favoriler');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('app-animated-background').length).toBe(1);
  });
});

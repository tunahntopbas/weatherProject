import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
// sol tarafta sabit duran ince navigasyon cubugu - state/logic yok, sadece
// routerLink'lerle sayfalar arasi gecis. Butun mantik HTML/scss tarafinda
export class SidebarComponent {}

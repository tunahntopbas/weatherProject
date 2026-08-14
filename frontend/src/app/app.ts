import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/app-shell/sidebar/sidebar.component';
import { TopBarComponent } from './components/app-shell/top-bar/top-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, TopBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

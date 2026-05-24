import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, NavigationEnd, Router } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { filter } from 'rxjs/operators';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, NavbarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  mostrarNavbar: boolean = false;

  // Rutas donde NO mostrar el navbar
  private rutasSinNavbar = ['/login', '/registro'];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.mostrarNavbar = !this.rutasSinNavbar.includes(e.urlAfterRedirects);
      });
  }
}

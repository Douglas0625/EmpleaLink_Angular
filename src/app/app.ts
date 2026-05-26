import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, NavigationEnd, Router } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { filter } from 'rxjs/operators';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  mostrarNavbar: boolean = false;
  mostrarFooter: boolean = false;

  // Rutas donde NO mostrar navbar/footer
  private rutasSinLayout = ['/login', '/registro'];

  constructor(private router: Router) {
    // Verificar la ruta actual al arrancar
    const urlActual = this.router.url;
    const mostrarInicial = !this.rutasSinLayout.some(r => urlActual.startsWith(r));
    this.mostrarNavbar = mostrarInicial;
    this.mostrarFooter = mostrarInicial;

    // Actualizar en cada navegación
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects;
        const mostrar = !this.rutasSinLayout.some(r => url.startsWith(r));
        this.mostrarNavbar = mostrar;
        this.mostrarFooter = mostrar;
      });
  }
}

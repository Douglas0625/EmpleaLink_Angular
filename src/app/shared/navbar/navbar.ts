import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SesionUsuario } from '../../models/sesion.model';

interface Notificacion {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const API = 'https://portal-empleo-api-production.up.railway.app/api';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {

  sesion: SesionUsuario | null = null;
  notificaciones: Notificacion[] = [];
  notificacionesNoLeidas: number = 0;

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.sesion = this.auth.getSesion();
    if (this.sesion) this.cargarNotificaciones();
  }

  get rol(): string {
    return this.sesion?.role_name ?? 'publico';
  }

  get avatarUrl(): string {
    const nombre = this.sesion?.displayName ?? 'U';
    const foto = this.sesion?.profile_image_url ?? '';
    return foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;
  }

  get inicialesEmpresa(): string {
    const texto = this.sesion?.displayName ?? '';
    const palabras = texto.trim().split(' ');
    return ((palabras[0]?.[0] ?? '') + (palabras[1]?.[0] ?? '')).toUpperCase();
  }

  logout(): void {
    this.auth.logout();
  }

  private cargarNotificaciones(): void {
    this.http.get<Notificacion[] | { data: Notificacion[] }>(`${API}/notifications`).subscribe({
      next: (resp) => {
        const todas = Array.isArray(resp) ? resp : (resp as any)?.data ?? [];
        this.notificaciones = todas
          .filter((n: Notificacion) => Number(n.user_id) === Number(this.sesion!.id))
          .sort((a: Notificacion, b: Notificacion) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
          );
        this.notificacionesNoLeidas = this.notificaciones.filter(n => !n.is_read).length;
      },
      error: () => {
        this.notificaciones = [];
        this.notificacionesNoLeidas = 0;
      }
    });
  }

  marcarLeida(notif: Notificacion): void {
    if (notif.is_read) return;

    this.http.patch(`${API}/notifications/${notif.id}`, { is_read: true }).subscribe({
      next: () => {
        notif.is_read = true;
        this.notificacionesNoLeidas = this.notificaciones.filter(n => !n.is_read).length;
      },
      error: () => {
        this.http.put(`${API}/notifications/${notif.id}`, { is_read: true }).subscribe({
          next: () => {
            notif.is_read = true;
            this.notificacionesNoLeidas = this.notificaciones.filter(n => !n.is_read).length;
          }
        });
      }
    });
  }

  formatearTiempo(fecha: string): string {
    if (!fecha) return 'Hace un momento';
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return 'Hace un momento';
    const ms = Date.now() - f.getTime();
    const min = Math.floor(ms / 60000);
    const hrs = Math.floor(min / 60);
    const dias = Math.floor(hrs / 24);
    if (min < 1) return 'Hace un momento';
    if (min < 60) return `Hace ${min} min`;
    if (hrs < 24) return `Hace ${hrs} h`;
    if (dias < 7) return `Hace ${dias} día${dias === 1 ? '' : 's'}`;
    return f.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

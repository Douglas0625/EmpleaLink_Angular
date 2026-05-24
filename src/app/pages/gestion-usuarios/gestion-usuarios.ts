import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-gestion-usuarios',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css'
})
export class GestionUsuarios implements OnInit {

  usuariosOriginales: any[] = [];
  usuariosFiltrados: any[] = [];

  textoBusqueda = '';
  estadoFiltro = 'estado de usuario';

  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.loading = true;

    Promise.all([
      this.adminService.getProfiles().toPromise(),
      this.adminService.getUsers().toPromise()
    ]).then(([perfiles, usuarios]) => {
      const listaPerfiles = Array.isArray(perfiles) ? perfiles : (perfiles as any).data || [];
      const listaUsuarios = Array.isArray(usuarios) ? usuarios : (usuarios as any).data || [];

      const mapaUsuarios = Object.fromEntries(
        listaUsuarios.map((u: any) => [u.id, u])
      );

      this.usuariosOriginales = listaPerfiles.map((profile: any) => {
        const user = mapaUsuarios[profile.user_id];
        return {
          id: profile.id,
          user_id: profile.user_id,
          nombre: `${profile.first_name} ${profile.last_name}`,
          profesion: profile.professional_title || 'Sin profesión',
          email: user?.email || 'Sin email',
          is_blocked: user?.is_blocked ?? false,
          iniciales: `${profile.first_name?.charAt(0)}${profile.last_name?.charAt(0)}`
        };
      });

      this.usuariosFiltrados = [...this.usuariosOriginales];
      this.loading = false;
    }).catch(err => {
      console.error('Error cargando usuarios:', err);
      this.loading = false;
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.usuariosOriginales];

    const texto = this.textoBusqueda.toLowerCase();
    if (texto) {
      resultado = resultado.filter(u =>
        u.nombre.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto)
      );
    }

    if (this.estadoFiltro === 'Activo') {
      resultado = resultado.filter(u => !u.is_blocked);
    } else if (this.estadoFiltro === 'Bloqueado') {
      resultado = resultado.filter(u => u.is_blocked);
    }

    this.usuariosFiltrados = resultado;
  }

  bloquearUsuario(usuario: any): void {
    const nuevoEstado = !usuario.is_blocked;
    this.adminService.updateUser(usuario.user_id, { is_blocked: nuevoEstado }).subscribe({
      next: () => {
        usuario.is_blocked = nuevoEstado;
        this.aplicarFiltros();
      },
      error: () => alert('Error al actualizar usuario')
    });
  }

  verPerfil(userId: number): void {
    localStorage.setItem('usuarioSeleccionado', String(userId));
    // navegar a perfil cuando ese componente esté listo
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-gestion-empresas',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestion-empresas.html',
  styleUrl: './gestion-empresas.css'
})
export class GestionEmpresas implements OnInit {

  empresasOriginales: any[] = [];
  empresasFiltradas: any[] = [];

  textoBusqueda = '';
  estadoFiltro = 'estado de empresa';

  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.loading = true;

    Promise.all([
      this.adminService.getCompanies().toPromise(),
      this.adminService.getUsers().toPromise()
    ]).then(([empresas, usuarios]) => {
      const listaEmpresas = Array.isArray(empresas) ? empresas : (empresas as any).data || [];
      const listaUsuarios = Array.isArray(usuarios) ? usuarios : (usuarios as any).data || [];

      const mapaUsuarios = Object.fromEntries(
        listaUsuarios.map((u: any) => [u.id, u])
      );

      this.empresasOriginales = listaEmpresas.map((empresa: any) => {
        const user = mapaUsuarios[empresa.user_id];
        return {
          id: empresa.id,
          user_id: empresa.user_id,
          nombre: empresa.company_name || 'Sin nombre',
          telefono: empresa.phone || 'No disponible',
          email: user?.email || 'Sin email',
          is_blocked: user?.is_blocked ?? false,
          iniciales: this.obtenerIniciales(empresa.company_name)
        };
      });

      this.empresasFiltradas = [...this.empresasOriginales];
      this.loading = false;
    }).catch(err => {
      console.error('Error cargando empresas:', err);
      this.loading = false;
    });
  }

  obtenerIniciales(nombre: string): string {
    if (!nombre) return 'NA';
    return nombre.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  aplicarFiltros(): void {
    let resultado = [...this.empresasOriginales];

    const texto = this.textoBusqueda.toLowerCase();
    if (texto) {
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(texto) ||
        e.email.toLowerCase().includes(texto)
      );
    }

    if (this.estadoFiltro === 'Activo') {
      resultado = resultado.filter(e => !e.is_blocked);
    } else if (this.estadoFiltro === 'Bloqueado') {
      resultado = resultado.filter(e => e.is_blocked);
    }

    this.empresasFiltradas = resultado;
  }

  bloquearEmpresa(empresa: any): void {
    const nuevoEstado = !empresa.is_blocked;
    this.adminService.updateUser(empresa.user_id, { is_blocked: nuevoEstado }).subscribe({
      next: () => {
        empresa.is_blocked = nuevoEstado;
        this.aplicarFiltros();
      },
      error: () => alert('Error al actualizar empresa')
    });
  }

  verPerfil(empresaId: number): void {
    localStorage.setItem('empresaSeleccionada', String(empresaId));
    // navegar a perfil empresa cuando esté listo
  }
}
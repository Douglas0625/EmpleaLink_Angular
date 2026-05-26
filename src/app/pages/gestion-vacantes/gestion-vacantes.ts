import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-gestion-vacantes',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestion-vacantes.html',
  styleUrl: './gestion-vacantes.css'
})
export class GestionVacantes implements OnInit {

  vacantesOriginales: any[] = [];
  vacantesFiltradas: any[] = [];

  textoBusqueda = '';
  modalidadFiltro = 'modalidad';
  tipoFiltro = 'tipo de vacante';

  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarVacantes();
  }

  cargarVacantes(): void {
    this.loading = true;
    this.adminService.getJobs().subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : data.data || [];
        this.vacantesOriginales = lista.map((v: any) => ({
          id: v.id,
          titulo: v.title || 'Sin título',
          descripcion: v.description || 'Sin descripción',
          modalidad: v.modality || 'No definida',
          tipo: v.job_type || 'No definido',
          iniciales: this.obtenerIniciales(v.title)
        }));
        this.vacantesFiltradas = [...this.vacantesOriginales];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando vacantes:', err);
        this.loading = false;
      }
    });
  }

  obtenerIniciales(texto: string): string {
    if (!texto) return 'NA';
    return texto.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  aplicarFiltros(): void {
    let resultado = [...this.vacantesOriginales];

    const texto = this.textoBusqueda.toLowerCase();
    if (texto) {
      resultado = resultado.filter(v =>
        v.titulo.toLowerCase().includes(texto)
      );
    }

    if (this.modalidadFiltro !== 'modalidad') {
      resultado = resultado.filter(v =>
        v.modalidad.toLowerCase() === this.modalidadFiltro.toLowerCase()
      );
    }

    if (this.tipoFiltro !== 'tipo de vacante') {
      resultado = resultado.filter(v =>
        v.tipo.toLowerCase() === this.tipoFiltro.toLowerCase()
      );
    }

    this.vacantesFiltradas = resultado;
  }

  verOferta(vacanteId: number): void {
    localStorage.setItem('vacanteSeleccionada', String(vacanteId));
    // navegar a detalle oferta cuando esté listo
  }
}

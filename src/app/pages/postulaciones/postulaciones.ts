import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PostulacionesService } from '../../services/postulaciones';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-postulaciones',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './postulaciones.html',
  styleUrl: './postulaciones.css',
})
export class Postulaciones implements OnInit {
  postulaciones: any[] = [];
  filteredPostulaciones: any[] = [];
  loading = true;

  private logoPalette = [
    '#5b6df6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#14b8a6', '#ec4899', '#3b82f6'
  ];

  stats = {
    total: 0,
    enProceso: 0,
    entrevistas: 0,
    rechazadas: 0
  };

  filtros = {
    busqueda: '',
    estado: ''
  };

  constructor(
    private postulacionesService: PostulacionesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const sesion = this.authService.getSesion();
    const profileId = sesion?.profile_id || 2; // default to 2 if not found or testing

    forkJoin({
      applications: this.postulacionesService.getApplications(),
      jobPosts: this.postulacionesService.getJobPosts(),
      companies: this.postulacionesService.getCompanyProfiles()
    }).subscribe({
      next: (res) => {
        const userApps = res.applications.filter((app: any) => app.profile_id === profileId);

        this.postulaciones = userApps.map((app: any) => {
          const job = res.jobPosts.find((j: any) => j.id === app.job_post_id) || {};
          const company = res.companies.find((c: any) => c.id === job.company_profile_id) || {};

          let badgeText = 'Aplicado';
          let badgeClass = 'badge-aplicado';

          switch (app.application_status) {
            case 'in_review':  badgeText = 'En proceso';  badgeClass = 'badge-proceso';    break;
            case 'interview':  badgeText = 'Entrevista';  badgeClass = 'badge-entrevista'; break;
            case 'accepted':   badgeText = 'Aceptado';    badgeClass = 'badge-aceptado';   break;
            case 'rejected':   badgeText = 'Rechazado';   badgeClass = 'badge-rechazado';  break;
            default:           badgeText = 'Aplicado';    badgeClass = 'badge-aplicado';   break;
          }

          const colorIdx = (company.id || job.id || 0) % this.logoPalette.length;
          const initials = company.company_name
            ? company.company_name.substring(0, 2).toUpperCase()
            : 'EM';

          return {
            id: app.id,
            jobTitle: job.title || 'Puesto Desconocido',
            companyName: company.company_name || 'Empresa Desconocida',
            initials,
            logoBg: this.logoPalette[colorIdx],
            location: job.location || 'No especificado',
            modality: job.modality === 'remote' ? 'Remoto' : (job.modality === 'hybrid' ? 'Híbrido' : 'Presencial'),
            date: app.application_date,
            status: app.application_status,
            description: job.description || 'Sin descripción',
            badgeText,
            badgeClass
          };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        this.filteredPostulaciones = [...this.postulaciones];
        this.calcularStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando postulaciones', err);
        this.loading = false;
      }
    });
  }

  calcularStats(): void {
    this.stats.total = this.postulaciones.length;
    this.stats.enProceso = this.postulaciones.filter(p => p.status === 'in_review').length;
    this.stats.entrevistas = this.postulaciones.filter(p => p.status === 'accepted' || p.status === 'interview').length;
    this.stats.rechazadas = this.postulaciones.filter(p => p.status === 'rejected').length;
  }

  onSearch(event: any): void {
    this.filtros.busqueda = event.target.value.toLowerCase();
    this.aplicarFiltros();
  }

  onEstadoChange(event: any): void {
    this.filtros.estado = event.target.value;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.filteredPostulaciones = this.postulaciones.filter(p => {
      const matchBusqueda = p.jobTitle.toLowerCase().includes(this.filtros.busqueda) || 
                            p.companyName.toLowerCase().includes(this.filtros.busqueda);
      const matchEstado = this.filtros.estado ? p.status === this.filtros.estado : true;
      return matchBusqueda && matchEstado;
    });
  }

  limpiarFiltros(): void {
    this.filtros = { busqueda: '', estado: '' };
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    const statusSelect = document.getElementById('status-select') as HTMLSelectElement;
    if (statusSelect) statusSelect.value = '';
    this.aplicarFiltros();
  }
}

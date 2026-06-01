import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ofertas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ofertas.html',
  styleUrls: ['./ofertas.css']
})
export class OfertasComponent implements OnInit {
  ofertas: any[] = [];
  filteredOfertas: any[] = [];  // todos los filtrados
  paginatedOfertas: any[] = []; // solo la página actual
  loading = true;

  readonly PAGE_SIZE = 5;
  currentPage = 1;
  totalPages = 1;

  filtros = {
    busqueda: '',
    ubicacion: '',
    tipoEmpleo: '',
    modalidad: '',
    experiencia: '',
    ordenarPor: 'desc'
  };

  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  private logoPalette = [
    '#5b6df6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#14b8a6', '#ec4899', '#3b82f6'
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    forkJoin({
      jobPosts: this.http.get<any[]>(`${this.apiUrl}/job-posts`),
      companies: this.http.get<any[]>(`${this.apiUrl}/company-profiles`)
    }).subscribe({
      next: (res) => {
        // Mapear los job posts con sus respectivas empresas
        this.ofertas = res.jobPosts.filter((job: any) => Number(job.status_id) === 2).map(job => {
          const company = res.companies.find(c => c.id === job.company_profile_id) || {};
          
          // Generar iniciales si no hay logo
          let initials = 'C';
          if (company.company_name) {
            initials = company.company_name.substring(0, 2).toUpperCase();
          }

          // Color de fondo del logo por índice
          const colorIdx = (company.id || job.id || 0) % this.logoPalette.length;
          const logoBg = this.logoPalette[colorIdx];

          // Generar tags basados en modalidad, tipo y palabras del título
          const tags: string[] = [];
          if (job.modality === 'remote') tags.push('Remoto');
          if (job.modality === 'hybrid') tags.push('Híbrido');
          if (job.modality === 'onsite') tags.push('Presencial');
          if (job.job_type === 'full_time') tags.push('Full-time');
          if (job.job_type === 'part_time') tags.push('Part-time');
          if (job.job_type === 'freelance') tags.push('Freelance');
          const titleLower = (job.title || '').toLowerCase();
          const descLower = (job.description || '').toLowerCase();
          if (titleLower.includes('react') || descLower.includes('react')) tags.push('React');
          if (titleLower.includes('node') || descLower.includes('node')) tags.push('Node.js');
          if (titleLower.includes('angular') || descLower.includes('angular')) tags.push('Angular');
          if (titleLower.includes('figma') || descLower.includes('figma')) tags.push('Figma');
          if (titleLower.includes('sql') || descLower.includes('postgresql')) tags.push('PostgreSQL');
          if (descLower.includes('typescript')) tags.push('TypeScript');
          if (descLower.includes('tailwind')) tags.push('Tailwind');
          if (descLower.includes('python')) tags.push('Python');
          if (descLower.includes('aws')) tags.push('AWS');

          return {
            id: job.id,
            title: job.title || 'Puesto Desconocido',
            companyName: company.company_name || 'Empresa Confidencial',
            companyLogo: null, // usamos initials para consistencia visual
            initials: initials,
            logoBg: logoBg,
            location: job.location || 'No especificado',
            modality: job.modality,
            jobType: job.job_type,
            salaryMin: job.min_salary,
            salaryMax: job.max_salary,
            date: job.created_at,
            description: job.description || '',
            tags: tags.slice(0, 5), // máximo 5 tags
            experience: this.mapExperience(job.experience_required_timelapse_id)
          };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        this.filteredOfertas = [...this.ofertas];
        this.currentPage = 1;
        this.updatePagination();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando ofertas:', err);
        this.loading = false;
      }
    });
  }

  mapExperience(expId: number): string {
    if (expId === 1) return 'junior';
    if (expId === 2) return 'mid-level';
    if (expId === 3) return 'senior';
    if (expId === 4) return 'manager';
    return '';
  }

  getDaysAgo(dateString: string): string {
    const today = new Date();
    const past = new Date(dateString);
    const diffTime = Math.abs(today.getTime() - past.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 día';
    return `Hace ${diffDays} días`;
  }

  formatSalary(min: string, max: string): string {
    if (!min && !max) return 'A convenir';
    if (min && !max) return `$${Number(min).toLocaleString()}`;
    if (!min && max) return `Hasta $${Number(max).toLocaleString()}`;
    return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`;
  }

  aplicarFiltros(): void {
    let temp = [...this.ofertas];

    // Búsqueda por texto (título, empresa, descripción)
    if (this.filtros.busqueda) {
      const q = this.filtros.busqueda.toLowerCase();
      temp = temp.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.companyName.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q)
      );
    }

    // Ubicación (barra de búsqueda) — filtra por modalidad igual que el sidebar
    // Si hay valor en ubicacion Y en modalidad del sidebar, el sidebar tiene prioridad
    const modalidadActiva = this.filtros.modalidad || this.filtros.ubicacion;
    if (modalidadActiva) {
      temp = temp.filter(o => o.modality === modalidadActiva);
    }

    // Tipo Empleo
    if (this.filtros.tipoEmpleo) {
      temp = temp.filter(o => o.jobType === this.filtros.tipoEmpleo);
    }

    // Experiencia
    if (this.filtros.experiencia) {
      temp = temp.filter(o => o.experience === this.filtros.experiencia);
    }

    // Ordenamiento
    if (this.filtros.ordenarPor === 'desc') {
      temp.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      temp.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    this.filteredOfertas = temp;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredOfertas.length / this.PAGE_SIZE));
    this.paginatedOfertas = this.filteredOfertas.slice(
      (this.currentPage - 1) * this.PAGE_SIZE,
      this.currentPage * this.PAGE_SIZE
    );
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 3;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  limpiarFiltros(): void {
    this.filtros = {
      busqueda: '',
      ubicacion: '',
      tipoEmpleo: '',
      modalidad: '',
      experiencia: '',
      ordenarPor: 'desc'
    };
    this.aplicarFiltros();
  }

  setFiltroCampo(campo: 'modalidad' | 'tipoEmpleo' | 'experiencia', val: string): void {
    if (this.filtros[campo] === val) {
      this.filtros[campo] = '';
    } else {
      this.filtros[campo] = val;
    }
    this.aplicarFiltros();
  }

  setModalidad(val: string): void {
    this.filtros.modalidad = this.filtros.modalidad === val ? '' : val;
    this.aplicarFiltros();
  }

  setTipoEmpleo(val: string): void {
    this.filtros.tipoEmpleo = this.filtros.tipoEmpleo === val ? '' : val;
    this.aplicarFiltros();
  }

  setExperiencia(val: string): void {
    this.filtros.experiencia = this.filtros.experiencia === val ? '' : val;
    this.aplicarFiltros();
  }
}
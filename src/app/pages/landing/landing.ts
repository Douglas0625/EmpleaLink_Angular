import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class LandingComponent implements OnInit {

  busqueda = '';
  ubicacion = '';

  featuredJobs: any[] = [];
  reviews: any[] = [];
  loadingJobs = true;

  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  private logoPalette = [
    '#5b6df6','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#14b8a6','#ec4899','#3b82f6'
  ];

  popularTags = ['React', 'Angular', 'Node.js', 'Python', 'Data', 'Marketing', 'Diseño UX'];

  recursos = [
    {
      icon: 'cv',
      title: 'Cómo mejorar tu CV',
      desc: 'Aprende a redactar un currículum que capture la atención de los reclutadores.',
      link: '/foro'
    },
    {
      icon: 'interview',
      title: 'Consejos para entrevistas',
      desc: 'Prepárate para superar cualquier entrevista técnica y de recursos humanos.',
      link: '/foro'
    },
    {
      icon: 'sectors',
      title: 'Sectores profesionales',
      desc: 'Conoce los sectores con mayor demanda laboral y sus perspectivas de crecimiento.',
      link: '/foro'
    }
  ];

  foroDestacados = [
    { num: 1, titulo: 'Nuevas herramientas de teletrabajo en LATAM 2024', comentarios: 14, fecha: 'Hace 2 horas' },
    { num: 2, titulo: 'Top 10 habilidades más buscadas en la actualidad', comentarios: 9, fecha: 'Hace 5 horas' },
    { num: 3, titulo: 'Cómo negociar tu salario en Empresas Abiertas', comentarios: 7, fecha: 'Hace 1 día' }
  ];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    forkJoin({
      jobs: this.http.get<any[]>(`${this.apiUrl}/job-posts`),
      companies: this.http.get<any[]>(`${this.apiUrl}/company-profiles`),
      reviews: this.http.get<any[]>(`${this.apiUrl}/company-reviews`)
    }).subscribe({
      next: (res) => {
        // 6 ofertas más recientes
        const sorted = [...res.jobs].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        this.featuredJobs = sorted.slice(0, 6).map(job => {
          const company = res.companies.find(c => c.id === job.company_profile_id) || {};
          const colorIdx = (company.id || job.id || 0) % this.logoPalette.length;
          return {
            id: job.id,
            title: job.title || 'Puesto sin nombre',
            companyName: company.company_name || 'Empresa',
            location: job.location || 'No especificado',
            modality: this.mapModality(job.modality),
            jobType: this.mapJobType(job.job_type),
            salaryMin: job.min_salary,
            salaryMax: job.max_salary,
            logoBg: this.logoPalette[colorIdx],
            initials: company.company_name ? company.company_name.substring(0, 2).toUpperCase() : 'EM',
            date: job.created_at
          };
        });

        // Valoraciones con nombre de empresa
        this.reviews = res.reviews.slice(0, 4).map(r => {
          const company = res.companies.find(c => c.id === r.company_profile_id) || {};
          const colorIdx = (company.id || r.id || 0) % this.logoPalette.length;
          return {
            companyName: company.company_name || 'Empresa',
            initials: company.company_name ? company.company_name.substring(0, 2).toUpperCase() : 'EM',
            logoBg: this.logoPalette[colorIdx],
            rating: Number(r.rating),
            comment: r.comment
          };
        });

        this.loadingJobs = false;
      },
      error: () => { this.loadingJobs = false; }
    });
  }

  buscar(): void {
    this.router.navigate(['/ofertas'], {
      queryParams: {
        q: this.busqueda || undefined,
        ubicacion: this.ubicacion || undefined
      }
    });
  }

  buscarTag(tag: string): void {
    this.router.navigate(['/ofertas'], { queryParams: { q: tag } });
  }

  formatSalary(min: string, max: string): string {
    if (!min && !max) return 'A convenir';
    if (min && max) return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`;
    if (min) return `Desde $${Number(min).toLocaleString()}`;
    return `Hasta $${Number(max).toLocaleString()}`;
  }

  mapModality(m: string): string {
    if (m === 'remote') return 'Remoto';
    if (m === 'hybrid') return 'Híbrido';
    if (m === 'onsite') return 'Presencial';
    return m || '';
  }

  mapJobType(t: string): string {
    if (t === 'full_time') return 'Full-time';
    if (t === 'part_time') return 'Part-time';
    if (t === 'freelance') return 'Freelance';
    return t || '';
  }

  getStars(rating: number): string[] {
    return Array(5).fill(0).map((_, i) => {
      if (i < Math.floor(rating)) return 'full';
      if (i < rating) return 'half';
      return 'empty';
    });
  }
}

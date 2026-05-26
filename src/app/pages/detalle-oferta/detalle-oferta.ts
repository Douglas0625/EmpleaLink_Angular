import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-detalle-oferta',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-oferta.html',
  styleUrl: './detalle-oferta.css',
})
export class DetalleOferta implements OnInit {
  oferta: any = null;
  reviews: any[] = [];
  ratingPromedio: number = 0;
  loading = true;
  aplicado = false;
  aplicando = false;
  errorAplicar = '';
  applicationStatus: string = ''; // estado real de la API

  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  private logoPalette = [
    '#5b6df6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#14b8a6', '#ec4899', '#3b82f6'
  ];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const sesion = this.authService.getSesion();
    const profileId = sesion?.profile_id ?? null;

    forkJoin({
      job: this.http.get<any>(`${this.apiUrl}/job-posts/${id}`),
      companies: this.http.get<any[]>(`${this.apiUrl}/company-profiles`),
      applications: this.http.get<any[]>(`${this.apiUrl}/applications`),
      reviews: this.http.get<any[]>(`${this.apiUrl}/company-reviews`)
    }).subscribe({
      next: (res) => {
        const job = res.job;
        const company = res.companies.find(c => c.id === job.company_profile_id) || {};

        // Aplicantes reales
        const applicants = res.applications.filter(a => a.job_post_id === job.id).length;

        // Verificar si el usuario ya se postuló y obtener su estado real
        if (profileId) {
          const miPostulacion = res.applications.find(
            a => a.job_post_id === job.id && a.profile_id === profileId
          );
          if (miPostulacion) {
            this.aplicado = true;
            this.applicationStatus = miPostulacion.application_status;
          }
        }

        // Valoraciones reales de la empresa
        const companyReviews = res.reviews.filter(r => r.company_profile_id === company.id);
        this.reviews = companyReviews;
        if (companyReviews.length > 0) {
          const sum = companyReviews.reduce((acc, r) => acc + Number(r.rating), 0);
          this.ratingPromedio = parseFloat((sum / companyReviews.length).toFixed(1));
        }

        const colorIdx = (company.id || Number(id)) % this.logoPalette.length;

        const tags: string[] = [];
        if (job.job_type === 'full_time') tags.push('Full-time');
        if (job.job_type === 'part_time') tags.push('Part-time');
        if (job.job_type === 'freelance') tags.push('Freelance');
        if (job.modality === 'remote') tags.push('Remoto');
        if (job.modality === 'hybrid') tags.push('Híbrido');
        if (job.modality === 'onsite') tags.push('Presencial');

        this.oferta = {
          id: job.id,
          title: job.title || 'Puesto Desconocido',
          description: job.description || 'Sin descripción disponible.',
          location: job.location || 'No especificado',
          modality: this.mapModality(job.modality),
          jobType: this.mapJobType(job.job_type),
          salaryMin: job.min_salary,
          salaryMax: job.max_salary,
          date: job.created_at,
          tags,
          logoBg: this.logoPalette[colorIdx],
          initials: company.company_name ? company.company_name.substring(0, 2).toUpperCase() : 'EM',
          companyId: company.id,
          companyName: company.company_name || 'Empresa Confidencial',
          companyPhone: company.phone || null,
          companyWebsite: company.website_url || null,
          companyLogo: null,
          applicants
        };

        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando oferta:', err);
        this.loading = false;
      }
    });
  }

  aplicar(): void {
    const sesion = this.authService.getSesion();

    if (!sesion) {
      this.errorAplicar = 'Debes iniciar sesión para postularte.';
      return;
    }

    if (!sesion.profile_id) {
      this.errorAplicar = 'Tu perfil no está completo. Completa tu perfil antes de postularte.';
      return;
    }

    if (this.aplicado || this.aplicando) return;

    this.aplicando = true;
    this.errorAplicar = '';

    const payload = {
      profile_id: sesion.profile_id,
      job_post_id: this.oferta.id,
      application_status: 'submitted',
      notes: 'Postulación desde EmpleaLink'
    };

    this.http.post(`${this.apiUrl}/applications`, payload).subscribe({
      next: () => {
        this.aplicado = true;
        this.applicationStatus = 'submitted';
        this.aplicando = false;
        this.oferta.applicants += 1;
      },
      error: (err) => {
        console.error('Error al postularse:', err);
        this.errorAplicar = 'Hubo un error al enviar tu postulación. Inténtalo de nuevo.';
        this.aplicando = false;
      }
    });
  }

  getStatusLabel(): string {
    switch (this.applicationStatus) {
      case 'submitted':  return '📨 Postulación enviada';
      case 'in_review':  return '🔍 En revisión';
      case 'interview':  return '📅 Entrevista programada';
      case 'accepted':   return '✅ Aceptado';
      case 'rejected':   return '❌ No aceptado';
      default:           return '✓ Postulado';
    }
  }

  getStatusClass(): string {
    switch (this.applicationStatus) {
      case 'accepted':  return 'status-accepted';
      case 'rejected':  return 'status-rejected';
      case 'in_review': return 'status-review';
      case 'interview': return 'status-interview';
      default:          return 'status-submitted';
    }
  }

  mapModality(m: string): string {
    if (m === 'remote') return 'Remoto';
    if (m === 'hybrid') return 'Híbrido';
    if (m === 'onsite') return 'Presencial';
    return m || 'No especificado';
  }

  mapJobType(t: string): string {
    if (t === 'full_time') return 'Full-time';
    if (t === 'part_time') return 'Part-time';
    if (t === 'freelance') return 'Freelance';
    if (t === 'internship') return 'Prácticas';
    return t || 'No especificado';
  }

  formatSalary(min: string, max: string): string {
    if (!min && !max) return 'A convenir';
    if (min && max) return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()} USD / mes`;
    if (min) return `$${Number(min).toLocaleString()} USD / mes`;
    return `Hasta $${Number(max).toLocaleString()} USD / mes`;
  }

  getDaysAgo(dateString: string): string {
    const today = new Date();
    const past = new Date(dateString);
    const diffDays = Math.ceil(Math.abs(today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'hace 1 día';
    return `hace ${diffDays} días`;
  }

  getStarArray(rating: number): string[] {
    return Array(5).fill(0).map((_, i) => {
      if (i < Math.floor(rating)) return 'full';
      if (i < rating) return 'half';
      return 'empty';
    });
  }
}

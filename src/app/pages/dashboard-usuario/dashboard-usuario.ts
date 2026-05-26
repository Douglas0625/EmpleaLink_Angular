import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../services/admin';
import { UsuarioService } from '../../services/usuario';

@Component({
  selector: 'app-dashboard-usuario',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-usuario.html',
  styleUrl: './dashboard-usuario.css'
})
export class DashboardUsuario implements OnInit {

  sesion: any = null;

  // Datos perfil
  primerNombre = 'Usuario';
  nombreCompleto = 'Usuario';
  tituloUbicacion = 'Candidato • Ubicación no disponible';
  fotoPerfil = 'https://ui-avatars.com/api/?name=Usuario&background=random';
  cvUrl = '';

  // Stats
  statPostulaciones = 0;
  statEntrevistas = 0;
  statGuardadas = 0;
  statComentarios = 0;

  // Listas
  postulacionesRecientes: any[] = [];
  postsForoRecientes: any[] = [];
  ofertasRecomendadas: any[] = [];

  loading = true;

  constructor(private usuarioService: UsuarioService, private router: Router) {}

  ngOnInit(): void {
    this.sesion = this.obtenerSesion();
    if (!this.sesion) { this.router.navigate(['/login']); return; }
    this.llenarDatosBasicos();
    this.cargarDashboard();
  }

  obtenerSesion(): any {
    try {
      const s = localStorage.getItem('usuarioLoggeado');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  llenarDatosBasicos(): void {
    const nombre = this.sesion.displayName ||
      `${this.sesion.first_name || ''} ${this.sesion.last_name || ''}`.trim() ||
      'Usuario';
    const titulo = this.sesion.professional_title || 'Candidato';
    const ubicacion = this.sesion.location || 'Ubicación no disponible';

    this.primerNombre = nombre.trim().split(' ')[0] || 'Usuario';
    this.nombreCompleto = nombre;
    this.tituloUbicacion = `${titulo} • ${ubicacion}`;
    this.cvUrl = this.sesion.cv_url || '';
    this.fotoPerfil = this.sesion.profile_image_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;
  }

  cargarDashboard(): void {
    this.loading = true;
    forkJoin({
      applications: this.usuarioService.getApplications(),
      jobPosts: this.usuarioService.getJobs(),
      companies: this.usuarioService.getCompanies(),
      savedJobs: this.usuarioService.getSavedJobs(),
      posts: this.usuarioService.getPosts(),
      comments: this.usuarioService.getComments()
    }).subscribe({
      next: (data) => {
        const applications = this.normalizar(data.applications);
        const jobPosts     = this.normalizar(data.jobPosts);
        const companies    = this.normalizar(data.companies);
        const savedJobs    = this.normalizar(data.savedJobs);
        const posts        = this.normalizar(data.posts);
        const comments     = this.normalizar(data.comments);

        const profileId = this.sesion.profile_id;
        const userId    = this.sesion.id;

        // Stats
        const misApps = applications.filter((a: any) => Number(a.profile_id) === Number(profileId));
        const misGuardadas = savedJobs.filter((s: any) => Number(s.profile_id) === Number(profileId));
        const entrevistas = misApps.filter((a: any) => (a.application_status || '').toLowerCase() === 'interview');
        const misComentarios = comments.filter((c: any) => Number(c.user_id) === Number(userId));

        this.statPostulaciones = misApps.length;
        this.statEntrevistas   = entrevistas.length;
        this.statGuardadas     = misGuardadas.length;
        this.statComentarios   = misComentarios.length;

        // Postulaciones recientes
        this.postulacionesRecientes = [...misApps]
          .sort((a: any, b: any) => new Date(b.application_date || 0).getTime() - new Date(a.application_date || 0).getTime())
          .slice(0, 3)
          .map((app: any) => {
            const oferta  = jobPosts.find((j: any) => Number(j.id) === Number(app.job_post_id));
            const empresa = companies.find((c: any) => Number(c.id) === Number(oferta?.company_profile_id));
            return {
              titulo: oferta?.title || 'Oferta no disponible',
              empresa: empresa?.company_name || 'Empresa no disponible',
              fecha: this.formatearFecha(app.application_date),
              estadoInfo: this.obtenerEstado(app.application_status)
            };
          });

        // Posts foro recientes
        this.postsForoRecientes = [...posts]
          .filter((p: any) => !p.is_hidden)
          .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 2)
          .map((post: any) => ({
            ...post,
            cantidadComentarios: comments.filter((c: any) => Number(c.post_id) === Number(post.id)).length,
            fechaFormateada: this.formatearFecha(post.created_at),
            contenidoCorto: this.recortarTexto(post.content || '', 120)
          }));

        // Ofertas recomendadas
        this.ofertasRecomendadas = jobPosts
          .filter((j: any) => Number(j.status_id) === 2)
          .slice(0, 2)
          .map((j: any) => ({
            ...j,
            modalidadTexto: this.traducirModalidad(j.modality),
            tipoTexto: this.traducirTipo(j.job_type)
          }));

        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando dashboard:', err);
        this.loading = false;
      }
    });
  }

  normalizar(data: any): any[] {
    return Array.isArray(data) ? data : data?.data || [];
  }

  verCV(): void {
    if (this.cvUrl) { window.open(this.cvUrl, '_blank'); }
    else { alert('Aún no tienes CV registrado.'); }
  }

  verOferta(id: number): void {
    this.router.navigate(['/ofertas', id]);
  }

  obtenerEstado(estado: string): { texto: string; clase: string } {
    const v = (estado || '').toLowerCase();
    if (v === 'submitted')  return { texto: 'Aplicado',    clase: 'badge-aplicado' };
    if (v === 'reviewed')   return { texto: 'En proceso',  clase: 'badge-proceso' };
    if (v === 'interview')  return { texto: 'Entrevista',  clase: 'badge-proceso' };
    if (v === 'rejected')   return { texto: 'Rechazado',   clase: 'badge-rechazado' };
    if (v === 'accepted')   return { texto: 'Aceptado',    clase: 'badge-aplicado' };
    return { texto: 'Aplicado', clase: 'badge-aplicado' };
  }

  traducirModalidad(v: string): string {
    if (v === 'remote') return 'Remoto';
    if (v === 'onsite') return 'Presencial';
    if (v === 'hybrid') return 'Híbrido';
    return 'No especificada';
  }

  traducirTipo(v: string): string {
    if (v === 'full_time')  return 'Full-time';
    if (v === 'part_time')  return 'Medio tiempo';
    if (v === 'internship') return 'Prácticas';
    return 'No especificado';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    return new Date(fecha).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  recortarTexto(texto: string, limite: number): string {
    if (!texto) return '';
    return texto.length <= limite ? texto : texto.slice(0, limite) + '...';
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UsuarioLoggeado {
  id: number;
  role_name: string;
  company_profile_id: number;
  displayName: string;
  email?: string;
}

export interface CompanyProfile {
  id: number;
  user_id: number;
  company_name: string;
  industry_id?: number;
  location?: string;
  logo_url?: string;
  website?: string;
  description?: string;
}

export interface JobPost {
  id: number;
  company_profile_id: number;
  title: string;
  description?: string;
  location?: string;
  modality?: string;
  job_type?: string;
  experience_required_timelapse_id?: number;
  min_salary?: number;
  max_salary?: number;
  status_id: number;
  created_at?: string;
}

export interface Application {
  id: number;
  job_post_id: number;
  profile_id?: number;
  application_status?: string;
  created_at?: string;
}

export interface JobPostConStats extends JobPost {
  cantidadPostulantes: number;
  estadoTexto: string;
  estadoColor: string;
  fechaFormateada: string;
}

export interface ForumPost {
  id: number;
  title?: string;
  content?: string;
  created_at?: string;
  is_hidden?: boolean;
  cantidadComentarios?: number;
  fechaFormateada?: string;
  contenidoCorto?: string;
}

// ── NUEVA interfaz para valoraciones ──────────────────────────────────────────
export interface CompanyReview {
  id: number;
  company_profile_id: number;
  profile_id?: number;
  rating: number;
  comment?: string;
  created_at?: string;
  // campos calculados
  fechaFormateada?: string;
  estrellas?: number[];           // array [1..5] para renderizar iconos
  inicialesAutor?: string;
}

export interface NuevaOfertaForm {
  titulo: string;
  experiencia: string;
  modalidad: 'remote' | 'onsite' | 'hybrid';
  tipo: 'full_time' | 'part_time' | 'internship';
  salarioMin: string;
  salarioMax: string;
  descripcion: string;
  responsabilidades: string;
  requisitos: string;
  estado: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard-empresa',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './dashboard-empresa.html',
  styleUrls: ['./dashboard-empresa.css']
})
export class DashboardEmpresa implements OnInit {

  private readonly API = 'https://portal-empleo-api-production-481e.up.railway.app';

  // ── Estado general ──
  cargando = true;
  error = '';

  // ── Sesión ──
  sesion: UsuarioLoggeado | null = null;

  // ── Empresa ──
  empresa: CompanyProfile | null = null;
  empresaNombre    = 'Empresa';
  empresaIndustria = 'Industria';
  empresaUbicacion = 'Ubicación no disponible';
  empresaEmail     = 'correo@empresa.com';
  empresaIniciales = 'EM';

  // ── Estadísticas ──
  statVacantesActivas   = 0;
  statTotalPostulantes  = 0;
  statEntrevistas       = 0;
  statVacantesCerradas  = 0;

  // ── Ofertas ──
  misOfertas: JobPostConStats[] = [];

  // ── Foro ──
  postsForoRecientes: ForumPost[] = [];

  // ── Valoraciones ──────────────────────────────────────────────────────────
  valoraciones: CompanyReview[] = [];           // máx. 3 más recientes
  promedioRating    = 0;                        // promedio calculado
  totalValoraciones = 0;                        // total de reviews

  // ── Modal Crear Oferta ──
  mostrarModal       = false;
  mensajeOferta      = '';
  mensajeOfertaError = true;
  enviandoOferta     = false;

  nuevaOferta: NuevaOfertaForm = {
    titulo: '', experiencia: '', modalidad: 'remote', tipo: 'full_time',
    salarioMin: '', salarioMax: '', descripcion: '',
    responsabilidades: '', requisitos: '', estado: '2'
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    const sesionGuardada = this.validarAcceso();
    if (!sesionGuardada) return;
    this.sesion = sesionGuardada;
    this.cargarDashboard();
  }

  // ─── Validación de sesión ──────────────────────────────────────────────────

  private validarAcceso(): UsuarioLoggeado | null {
    const raw = localStorage.getItem('usuarioLoggeado');
    if (!raw) { this.router.navigate(['/inicio-registro']); return null; }
    try {
      const sesion: UsuarioLoggeado = JSON.parse(raw);
      if (sesion.role_name !== 'company') { this.router.navigate(['/']); return null; }
      return sesion;
    } catch {
      localStorage.removeItem('usuarioLoggeado');
      this.router.navigate(['/inicio-registro']);
      return null;
    }
  }

  // ─── Carga de datos con forkJoin ──────────────────────────────────────────

  cargarDashboard(): void {
    this.cargando = true;

    forkJoin({
      empresas:     this.get<any>('/company-profiles'),
      ofertas:      this.get<any>('/job-posts'),
      aplicaciones: this.get<any>('/applications'),
      posts:        this.get<any>('/forum/posts'),
      comments:     this.get<any>('/forum/comments'),
      reviews:      this.get<any>('/company-reviews')   // ← igual que en recursos.ts
    }).subscribe({
      next: ({ empresas, ofertas, aplicaciones, posts, comments, reviews }) => {

        const listaEmpresas:     CompanyProfile[]  = this.normalizar(empresas);
        const listaOfertas:      JobPost[]          = this.normalizar(ofertas);
        const listaAplicaciones: Application[]      = this.normalizar(aplicaciones);
        const listaPosts:        any[]              = this.normalizar(posts);
        const listaComments:     any[]              = this.normalizar(comments);
        const listaReviews:      any[]              = this.normalizar(reviews);

        this.empresa = listaEmpresas.find(
          e => Number(e.user_id) === Number(this.sesion!.id)
        ) ?? null;

        if (!this.empresa) {
          this.error   = 'No se encontró el perfil de empresa.';
          this.cargando = false;
          return;
        }

        const misOfertas = listaOfertas.filter(
          o => Number(o.company_profile_id) === Number(this.empresa!.id)
        );

        this.llenarDatosEmpresa();
        this.calcularStats(misOfertas, listaAplicaciones);
        this.construirOfertas(misOfertas, listaAplicaciones);
        this.construirForo(listaPosts, listaComments);
        this.construirValoraciones(listaReviews);   // ← nuevo
        this.cargando = false;
      },
      error: () => {
        this.error    = 'No se pudo cargar la información del dashboard.';
        this.cargando = false;
      }
    });
  }

  // ─── Helpers de datos ─────────────────────────────────────────────────────

  private llenarDatosEmpresa(): void {
    if (!this.empresa) return;
    this.empresaNombre    = this.empresa.company_name || 'Empresa';
    this.empresaIndustria = this.getIndustria(this.empresa.industry_id);
    this.empresaUbicacion = this.empresa.location || 'Ubicación no disponible';
    this.empresaEmail     = this.sesion?.email || 'correo@empresa.com';
    this.empresaIniciales = this.getIniciales(this.empresaNombre);
  }

  private calcularStats(ofertas: JobPost[], aplicaciones: Application[]): void {
    this.statVacantesActivas  = ofertas.filter(o => Number(o.status_id) === 2).length;
    this.statVacantesCerradas = ofertas.filter(o => Number(o.status_id) === 3).length;

    const idsOfertas = ofertas.map(o => Number(o.id));
    const misAplicaciones = aplicaciones.filter(a => idsOfertas.includes(Number(a.job_post_id)));

    this.statTotalPostulantes = misAplicaciones.length;
    this.statEntrevistas = misAplicaciones.filter(
      a => (a.application_status || '').toLowerCase() === 'interview'
    ).length;
  }

  private construirOfertas(ofertas: JobPost[], aplicaciones: Application[]): void {
    const ordenadas = [...ofertas]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 3);

    this.misOfertas = ordenadas.map(o => {
      const cantidadPostulantes = aplicaciones.filter(
        a => Number(a.job_post_id) === Number(o.id)
      ).length;
      const estado = this.getEstado(o.status_id);
      return {
        ...o,
        cantidadPostulantes,
        estadoTexto:     estado.texto,
        estadoColor:     estado.color,
        fechaFormateada: this.formatFecha(o.created_at)
      };
    });
  }

  private construirForo(posts: any[], comments: any[]): void {
    this.postsForoRecientes = [...posts]
      .filter(p => !p.is_hidden)
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 2)
      .map(post => ({
        ...post,
        cantidadComentarios: comments.filter(c => Number(c.post_id) === Number(post.id)).length,
        fechaFormateada:     this.formatFecha(post.created_at),
        contenidoCorto:      this.recortarTexto(post.content ?? '', 140)
      }));
  }

  // ── NUEVA: construye las valoraciones de la empresa loggeada ──────────────
  private construirValoraciones(reviews: any[]): void {
    // Filtra solo las reviews que pertenecen al perfil de esta empresa
    const misReviews = reviews.filter(
      r => Number(r.company_profile_id) === Number(this.empresa!.id)
    );

    this.totalValoraciones = misReviews.length;

    // Promedio redondeado a 1 decimal
    if (misReviews.length > 0) {
      const suma = misReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      this.promedioRating = Math.round((suma / misReviews.length) * 10) / 10;
    } else {
      this.promedioRating = 0;
    }

    // Mostramos las 3 más recientes
    this.valoraciones = [...misReviews]
      .sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )
      .slice(0, 3)
      .map(r => ({
        ...r,
        rating:         Number(r.rating) || 0,
        fechaFormateada: this.formatFecha(r.created_at),
        // Array [1,2,3,4,5] → en el HTML iteramos para pintar estrellas llenas/vacías
        estrellas:      [1, 2, 3, 4, 5],
        // Iniciales del autor: si la API devuelve nombre del candidato úsalo,
        // si no, fallback genérico. Ajusta el campo según tu respuesta real.
        inicialesAutor: this.getIniciales(r.candidate_name || r.profile?.name || 'Usuario')
      }));
  }

  // Helper: array de enteros para ngFor de estrellas
  esFull(estrella: number, rating: number): boolean {
    return estrella <= Math.round(rating);
  }

  private recortarTexto(texto: string, limite: number): string {
    if (!texto) return '';
    return texto.length <= limite ? texto : texto.slice(0, limite) + '...';
  }

  // ─── Modal crear oferta ───────────────────────────────────────────────────

  abrirModal(): void {
    this.nuevaOferta = {
      titulo: '', experiencia: '', modalidad: 'remote', tipo: 'full_time',
      salarioMin: '', salarioMax: '', descripcion: '',
      responsabilidades: '', requisitos: '', estado: '2'
    };
    this.mensajeOferta = '';
    this.mostrarModal  = true;
    document.body.classList.add('modal-open');
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    document.body.classList.remove('modal-open');
  }

  async crearOferta(): Promise<void> {
    this.mensajeOferta = '';
    const { titulo, experiencia, modalidad, tipo, salarioMin, salarioMax, descripcion } = this.nuevaOferta;

    if (!titulo || !experiencia || !modalidad || !tipo || !salarioMin || !salarioMax || !descripcion) {
      this.mensajeOferta      = 'Completa todos los campos obligatorios.';
      this.mensajeOfertaError = true;
      return;
    }
    if (!this.empresa?.id) {
      this.mensajeOferta      = 'No se encontró el perfil de empresa.';
      this.mensajeOfertaError = true;
      return;
    }

    const descripcionCompleta = [
      descripcion,
      this.nuevaOferta.responsabilidades ? `Responsabilidades: ${this.nuevaOferta.responsabilidades}` : '',
      this.nuevaOferta.requisitos        ? `Requisitos: ${this.nuevaOferta.requisitos}`                : ''
    ].filter(Boolean).join('\n\n');

    const payload = {
      company_profile_id:                  this.empresa.id,
      title:                               titulo,
      description:                         descripcionCompleta,
      location:                            this.empresa.location || 'No especificada',
      modality:                            modalidad,
      job_type:                            tipo,
      experience_required_timelapse_id:    this.mapearExperiencia(experiencia),
      min_salary:                          Number(salarioMin),
      max_salary:                          Number(salarioMax),
      status_id:                           Number(this.nuevaOferta.estado)
    };

    this.enviandoOferta = true;

    this.http.post(`${this.API}/job-posts`, payload).subscribe({
      next: () => {
        this.mensajeOferta      = '¡Oferta creada con éxito!';
        this.mensajeOfertaError = false;
        this.enviandoOferta     = false;
        setTimeout(() => { this.cerrarModal(); this.cargarDashboard(); }, 900);
      },
      error: () => {
        this.mensajeOferta      = 'No se pudo crear la oferta. Intenta de nuevo.';
        this.mensajeOfertaError = true;
        this.enviandoOferta     = false;
      }
    });
  }

  // ─── Navegación ───────────────────────────────────────────────────────────

  irADetalle(id: number): void   { this.router.navigate(['/detalle-oferta', id]); }
  irAGestion(): void             { this.router.navigate(['/gestion-ofertas']); }
  irAEditarPerfil(): void        { this.router.navigate(['/perfil-empresa']); }

  // ─── Utilidades ───────────────────────────────────────────────────────────

  private get<T>(endpoint: string) {
    return this.http.get<T>(`${this.API}${endpoint}`).pipe(
      catchError(() => of([]))
    );
  }

  private normalizar<T>(data: any): T[] {
    return Array.isArray(data) ? data : data?.data ?? [];
  }

  private getEstado(statusId: number): { texto: string; color: string } {
    switch (Number(statusId)) {
      case 2:  return { texto: 'Activa',   color: '#22C55E' };
      case 3:  return { texto: 'Cerrada',  color: '#EF4444' };
      default: return { texto: 'Pausada',  color: '#F59E0B' };
    }
  }

  private getIndustria(id?: number): string {
    const map: Record<number, string> = {
      1: 'Tecnología', 2: 'Educación', 3: 'Salud', 4: 'Finanzas', 5: 'Retail'
    };
    return id ? (map[id] ?? 'Industria') : 'Industria';
  }

  private getIniciales(nombre: string): string {
    const palabras = (nombre ?? '').trim().split(' ');
    return ((palabras[0]?.[0] ?? '') + (palabras[1]?.[0] ?? '')).toUpperCase() || '??';
  }

  private mapearExperiencia(texto: string): number {
    const v = texto.toLowerCase();
    if (v.includes('sin')) return 1;
    if (v.includes('1'))   return 2;
    if (v.includes('2') || v.includes('3')) return 3;
    if (v.includes('5'))   return 4;
    return 2;
  }

  formatFecha(fecha?: string): string {
    if (!fecha) return 'Fecha no disponible';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'Fecha no disponible';
    return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackById(_: number, item: { id: number }): number { return item.id; }
}
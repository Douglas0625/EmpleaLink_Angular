import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PostulacionesService } from '../../services/postulaciones';
import { UsuarioService } from '../../services/usuario';

interface Candidato {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  location: string;
  workMode: string;
  avatar?: string;
  profesionalProfile: string;
  experiencia: ExperienciaLaboral[];
  educacion: Educacion[];
  habilidades: string[];
  cv?: string;
}

interface ExperienciaLaboral {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description: string;
  isCurrent: boolean;
}

interface Educacion {
  id: string;
  title: string;
  institution: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-detalle-candidato',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-candidato.html',
  styleUrl: './detalle-candidato.css',
})
export class DetalleCandidato implements OnInit {
  // Datos
  candidato: Candidato | null = null;
  aplicacionId: string = '';
  jobPostId: string = '';

  // Estados
  cargando = true;
  guardando = false;
  mostrarConfirmacion = false;
  tipoAccion: 'aceptar' | 'rechazar' | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private postulacionesService: PostulacionesService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const userId = params['userId'];
      const applicationId = params['applicationId'];
      const jobPostId = params['jobPostId'];

      this.aplicacionId = applicationId || '1';
      this.jobPostId = jobPostId || '1';

      // Si tenemos userId, cargar directamente por usuario (más eficiente)
      if (userId) {
        this.cargarCandidatoPorUserId(userId);
      } else {
        // Fallback: obtener userId de la aplicación
        this.cargarCandidato();
      }
    });
  }

  /**
   * Carga los datos del candidato por userId (método optimizado)
   */
  private cargarCandidatoPorUserId(userId: string): void {
    this.cargando = true;

    // Cargar perfil del usuario y experiencia, educación, habilidades
    forkJoin({
      usuario: this.usuarioService.getUserProfile(userId),
      perfil: this.http.get(`https://portal-empleo-api-production-481e.up.railway.app/profiles/${userId}`).pipe(
        catchError(err => {
          console.error('Error loading profile:', err);
          return of(null);
        })
      ),
      experiencia: this.http.get(`https://portal-empleo-api-production-481e.up.railway.app/profiles/${userId}/work-experiences`).pipe(
        catchError(err => of([]))
      ),
      educacion: this.http.get(`https://portal-empleo-api-production-481e.up.railway.app/profiles/${userId}/educational-info`).pipe(
        catchError(err => of([]))
      ),
      habilidades: this.http.get(`https://portal-empleo-api-production-481e.up.railway.app/profiles/${userId}/skills`).pipe(
        catchError(err => of([]))
      )
    }).subscribe({
      next: (datos: any) => {
        this.candidato = this.mapearCandidatoOptimizado(datos.usuario, datos.perfil, datos.experiencia || [], datos.educacion || [], datos.habilidades || []);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error loading candidate data:', err);
        this.cargarCandidatoMock();
      }
    });
  }

  /**
   * Mapea datos optimizados del candidato desde perfil y datos relacionados
   */
  private mapearCandidatoOptimizado(usuario: any, perfil: any, experiencia: any[], educacion: any[], habilidades: any[]): Candidato {
    const exp = (experiencia || []).map((e: any) => ({
      id: e.id || '1',
      title: e.position_title || e.title || 'Posición',
      company: e.company_name || e.company || 'Empresa',
      startDate: e.start_date || e.startDate || '',
      endDate: e.end_date || e.endDate,
      description: e.description || e.job_description || '',
      isCurrent: !e.end_date || e.is_current === true
    }));

    const edu = (educacion || []).map((e: any) => ({
      id: e.id || '1',
      title: e.degree_name || e.title || 'Grado',
      institution: e.institution_name || e.institution || 'Institución',
      startDate: e.start_date || e.startDate || '',
      endDate: e.end_date || e.endDate || ''
    }));

    const habs = (habilidades || []).map((h: any) => h.skill_name || h.name || h.title || 'Habilidad');

    return {
      id: usuario?.id || perfil?.id || '1',
      name: usuario?.name || `${perfil?.first_name || ''} ${perfil?.last_name || ''}`.trim() || 'Candidato',
      email: usuario?.email || perfil?.email || 'email@ejemplo.com',
      phone: usuario?.phone || perfil?.phone || '+34 987 345 078',
      title: usuario?.professional_title || perfil?.professional_title || 'Profesional',
      location: usuario?.location || perfil?.location || 'Ubicación no definida',
      workMode: usuario?.work_preference || perfil?.work_preference || 'Remote / Híbrido',
      avatar: usuario?.profile_image_url || perfil?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario?.name || 'Usuario')}&background=5b6df6&color=fff&size=150`,
      profesionalProfile: usuario?.professional_summary || perfil?.professional_summary || 'Profesional con experiencia.',
      experiencia: exp.length > 0 ? exp : [{
        id: '1',
        title: 'Profesional Experimentado',
        company: 'En el campo',
        startDate: '2020',
        description: 'Trabajador en diferentes empresas',
        isCurrent: true
      }],
      educacion: edu.length > 0 ? edu : [{
        id: '1',
        title: 'Formación Profesional',
        institution: 'Institución Educativa',
        startDate: '2015',
        endDate: '2020'
      }],
      habilidades: habs.length > 0 ? habs : ['Experiencia', 'Profesionalismo', 'Comunicación'],
      cv: usuario?.cv_url || perfil?.cv_url || '#'
    };
  }

  /**
   * Carga los datos del candidato
   */
  private cargarCandidato(): void {
    this.cargando = true;

    this.postulacionesService.getApplicationById(this.aplicacionId).subscribe({
      next: (aplicacion) => {
        if (aplicacion && aplicacion.user_id) {
          this.usuarioService.getUserProfile(aplicacion.user_id).subscribe({
            next: (usuario) => {
              this.candidato = this.mapearCandidato(usuario, aplicacion);
              this.cargando = false;
            },
            error: (err) => {
              console.error('Error loading user profile:', err);
              this.cargarCandidatoMock();
            }
          });
        } else {
          this.cargarCandidatoMock();
        }
      },
      error: (err) => {
        console.error('Error loading application:', err);
        this.cargarCandidatoMock();
      }
    });
  }

  /**
   * Mapea datos del usuario a estructura de candidato
   */
  private mapearCandidato(usuario: any, aplicacion: any): Candidato {
    return {
      id: usuario.id || '1',
      name: usuario.name || 'Ana Martínez',
      email: usuario.email || 'ana.martinez@gmail.com',
      phone: usuario.phone || '+34 987 345 078',
      title: usuario.title || 'Senior UI/UX Designer',
      location: usuario.location || 'Madrid, España',
      workMode: usuario.work_mode || 'Remote / Híbrido',
      avatar: usuario.avatar || 'https://ui-avatars.com/api/?name=Ana+Martinez&background=5b6df6&color=fff&size=150',
      profesionalProfile: usuario.professional_summary || 'Diseñadora visual con más de 8 años de experiencia creando interfaces intuitivas y sistemas de diseño escalables...',
      experiencia: usuario.experience || [
        {
          id: '1',
          title: 'Senior Product Designer',
          company: 'Globant',
          startDate: '2021',
          endDate: undefined,
          description: 'Liderazgo del rediseño de la plataforma de banca online, mejorando la tasa de conversión en un 25%.',
          isCurrent: true
        }
      ],
      educacion: usuario.education || [
        {
          id: '1',
          title: 'Máster en Diseño de Interacción',
          institution: 'IED Madrid',
          startDate: '2017',
          endDate: '2018'
        }
      ],
      habilidades: usuario.skills || ['Figma', 'Adobe XD', 'Prototipado', 'Sistemas de Diseño', 'HTML/CSS', 'Metodologías Ágiles', 'Inglés C1'],
      cv: usuario.cv_url || '#'
    };
  }

  /**
   * Carga datos mock cuando falla la API
   */
  private cargarCandidatoMock(): void {
    this.candidato = {
      id: '1',
      name: 'Ana Martínez',
      email: 'ana.martinez@gmail.com',
      phone: '+34 987 345 078',
      title: 'Senior UI/UX Designer',
      location: 'Madrid, España',
      workMode: 'Remote / Híbrido',
      avatar: 'https://ui-avatars.com/api/?name=Ana+Martinez&background=5b6df6&color=fff&size=150',
      profesionalProfile: 'Diseñadora visual con más de 8 años de experiencia creando interfaces intuitivas y sistemas de diseño escalables. Apasionada por resolver problemas complejos a través del diseño centrado en el usuario y la colaboración interdisciplinaria.',
      experiencia: [
        {
          id: '1',
          title: 'Senior Product Designer',
          company: 'Globant',
          startDate: '2021',
          endDate: undefined,
          description: 'Liderazgo del rediseño de la plataforma de banca online, mejorando la tasa de conversión en un 25%.',
          isCurrent: true
        },
        {
          id: '2',
          title: 'UX Designer',
          company: 'TechFlow Solutions',
          startDate: '2018',
          endDate: '2021',
          description: 'Creación y mantenimiento del sistema de diseño interno utilizado por más de 10 equipos de desarrollo.',
          isCurrent: false
        }
      ],
      educacion: [
        {
          id: '1',
          title: 'Máster en Diseño de Interacción',
          institution: 'IED Madrid',
          startDate: '2017',
          endDate: '2018'
        },
        {
          id: '2',
          title: 'Grado en Diseño Gráfico',
          institution: 'Universidad Complutense',
          startDate: '2013',
          endDate: '2017'
        }
      ],
      habilidades: ['Figma', 'Adobe XD', 'Prototipado', 'Sistemas de Diseño', 'HTML/CSS', 'Metodologías Ágiles', 'Inglés C1'],
      cv: '#'
    };
    this.cargando = false;
  }

  /**
   * Aceptar candidato
   */
  aceptarCandidato(): void {
    this.tipoAccion = 'aceptar';
    this.mostrarConfirmacion = true;
  }

  /**
   * Rechazar candidato
   */
  rechazarCandidato(): void {
    this.tipoAccion = 'rechazar';
    this.mostrarConfirmacion = true;
  }

  /**
   * Confirmar acción
   */
  confirmarAccion(): void {
    if (!this.tipoAccion) return;

    this.guardando = true;
    const estado = this.tipoAccion === 'aceptar' ? 'accepted' : 'rejected';

    this.postulacionesService.updateApplicationStatus(this.aplicacionId, estado).subscribe({
      next: () => {
        alert(
          this.tipoAccion === 'aceptar'
            ? 'Candidato aceptado exitosamente'
            : 'Candidato rechazado'
        );
        this.mostrarConfirmacion = false;
        this.guardando = false;
        this.volverAtras();
      },
      error: (err) => {
        console.error('Error updating application:', err);
        alert('Error al procesar la solicitud');
        this.mostrarConfirmacion = false;
        this.guardando = false;
      }
    });
  }

  /**
   * Cancelar confirmación
   */
  cancelarConfirmacion(): void {
    this.mostrarConfirmacion = false;
    this.tipoAccion = null;
  }

  /**
   * Descargar CV
   */
  descargarCV(): void {
    if (this.candidato?.cv) {
      window.open(this.candidato.cv, '_blank');
    } else {
      alert('No hay CV disponible para descargar');
    }
  }

  /**
   * Volver a la vista anterior
   */
  volverAtras(): void {
    this.router.navigate(['/gestion-vacantes']);
  }

  /**
   * Formatea fechas
   */
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const date = new Date(fecha);
    return `${meses[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Mensaje de confirmación
   */
  get mensajeConfirmacion(): string {
    if (this.tipoAccion === 'aceptar') {
      return `¿Estás seguro de que deseas aceptar a ${this.candidato?.name}?`;
    }
    return `¿Estás seguro de que deseas rechazar a ${this.candidato?.name}?`;
  }
}

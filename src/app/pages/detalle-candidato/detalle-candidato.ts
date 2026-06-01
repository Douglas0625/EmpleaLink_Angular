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
    const API = 'https://portal-empleo-api-production-481e.up.railway.app';

    forkJoin({
      usuarios:     this.http.get<any>(`${API}/users`),
      perfiles:     this.http.get<any>(`${API}/profiles`),
      experiencias: this.http.get<any>(`${API}/work-experiences`),
      educacion:    this.http.get<any>(`${API}/educational-info`),
      profileSkills:this.http.get<any>(`${API}/profile-skills`),
      skills:       this.http.get<any>(`${API}/skills`)
    }).subscribe({
      next: (datos: any) => {
        const norm = (d: any) => Array.isArray(d) ? d : d?.data || [];

        const usuarios      = norm(datos.usuarios);
        const perfiles      = norm(datos.perfiles);
        const experiencias  = norm(datos.experiencias);
        const educacion     = norm(datos.educacion);
        const profileSkills = norm(datos.profileSkills);
        const skills        = norm(datos.skills);

        // Buscar usuario y perfil por user_id
        const usuario = usuarios.find((u: any) => Number(u.id) === Number(userId)) || null;
        const perfil  = perfiles.find((p: any) => Number(p.user_id) === Number(userId)) || null;

        if (!perfil) {
          this.cargarCandidatoMock();
          return;
        }

        // Filtrar experiencias y educación por profile_id
        const misExp = experiencias.filter((e: any) => Number(e.profile_id) === Number(perfil.id));
        const misEdu = educacion.filter((e: any) => Number(e.profile_id) === Number(perfil.id));

        // Cruzar profile-skills con skills para obtener nombres reales
        const misProfileSkills = profileSkills.filter((ps: any) => Number(ps.profile_id) === Number(perfil.id));
        const misHabilidades = misProfileSkills
          .map((ps: any) => {
            const skill = skills.find((s: any) => Number(s.id) === Number(ps.skill_id));
            return skill?.skill_name || null;
          })
          .filter(Boolean);

        this.candidato = this.mapearCandidatoOptimizado(
          usuario, perfil, misExp, misEdu, misHabilidades
        );
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando candidato:', err);
        this.cargarCandidatoMock();
      }
    });
  }

  /**
   * Mapea datos optimizados del candidato desde perfil y datos relacionados
   */
  private mapearCandidatoOptimizado(
    usuario: any, perfil: any,
    experiencia: any[], educacion: any[], habilidades: string[]
  ): Candidato {

    const exp = experiencia.map((e: any) => ({
      id: String(e.id || '1'),
      title: e.job_title || e.position_title || e.title || 'Posición',
      company: e.company_name || e.company || 'Empresa',
      startDate: e.start_date || '',
      endDate: e.end_date,
      description: e.description || '',
      isCurrent: !!e.is_current || !e.end_date
    }));

    const edu = educacion.map((e: any) => ({
      id: String(e.id || '1'),
      title: e.custom_degree_name || e.degree_name || e.title || 'Grado',
      institution: e.institution || 'Institución',
      startDate: e.start_date || '',
      endDate: e.end_date || ''
    }));

    const nombre = `${perfil?.first_name || ''} ${perfil?.last_name || ''}`.trim() || 'Candidato';

    return {
      id: String(usuario?.id || perfil?.id || '1'),
      name: nombre,
      email: usuario?.email || 'Sin correo',   // <-- viene del usuario, no del perfil
      phone: perfil?.phone || 'Sin teléfono',
      title: perfil?.professional_title || 'Profesional',
      location: perfil?.location || 'Ubicación no definida',
      workMode: 'No especificado',
      avatar: perfil?.profile_image_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=5b6df6&color=fff&size=150`,
      profesionalProfile: perfil?.about_me || 'Profesional con experiencia.',
      experiencia: exp.length > 0 ? exp : [],
      educacion: edu.length > 0 ? edu : [],
      habilidades: habilidades.length > 0 ? habilidades : [],  // <-- ya son strings
      cv: perfil?.cv_url || '#'
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

    // Si la acción es aceptar, validar límite antes de proceder
    if (estado === 'accepted') {
      this.validarLimiteYAceptar();
    } else {
      this.ejecutarCambioEstado(estado);
    }
  }

  /**
   * Valida el límite de candidatos y ejecuta la aceptación si hay cupo
   */
  private validarLimiteYAceptar(): void {
    const API = 'https://portal-empleo-api-production-481e.up.railway.app';

    // Obtener la oferta para conocer max_candidates
    this.http.get<any>(`${API}/job-posts/${this.jobPostId}`).subscribe({
      next: (oferta) => {
        const maxCandidatos = oferta?.max_candidates ? Number(oferta.max_candidates) : null;

        // Sin límite definido: aceptar directamente
        if (!maxCandidatos) {
          this.ejecutarCambioEstado('accepted');
          return;
        }

        // Contar candidatos ya aceptados para esta oferta
        this.http.get<any[]>(`${API}/applications`).subscribe({
          next: (apps: any) => {
            const lista: any[] = Array.isArray(apps) ? apps : (apps?.data ?? []);
            const aceptados = lista.filter((a: any) =>
              Number(a.job_post_id) === Number(this.jobPostId) &&
              (a.application_status || '').toLowerCase() === 'accepted'
            ).length;

            if (aceptados >= maxCandidatos) {
              // Límite alcanzado: bloquear acción
              alert('Ya se alcanzó el número máximo de candidatos para esta oferta.');
              this.mostrarConfirmacion = false;
              this.guardando = false;
              return;
            }

            // Hay cupo: aceptar y verificar si se debe cerrar la oferta
            this.ejecutarCambioEstado('accepted', oferta, aceptados + 1, maxCandidatos);
          },
          error: () => {
            // Si falla la consulta, aceptar sin bloquear (fail-open)
            this.ejecutarCambioEstado('accepted');
          }
        });
      },
      error: () => {
        // Si no se puede obtener la oferta, aceptar sin bloquear
        this.ejecutarCambioEstado('accepted');
      }
    });
  }

  /**
   * Ejecuta el cambio de estado y opcionalmente cierra la oferta si se llenó el cupo
   */
  private async ejecutarCambioEstado(
    estado: string,
    oferta?: any,
    nuevosAceptados?: number,
    maxCandidatos?: number
  ): Promise<void> {
    const API = 'https://portal-empleo-api-production-481e.up.railway.app';

    try {
      // 1. Actualizar estado de esta aplicación
      const patchRes = await fetch(`${API}/applications/${this.aplicacionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_status: estado })
      });

      if (!patchRes.ok) {
        const appRes = await fetch(`${API}/applications/${this.aplicacionId}`);
        const appData = appRes.ok ? await appRes.json() : {};
        const putRes = await fetch(`${API}/applications/${this.aplicacionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...appData, application_status: estado })
        });
        if (!putRes.ok) throw new Error(`Error HTTP ${putRes.status}`);
      }

      // 2. Si se aceptó y se llegó al límite → cerrar oferta + rechazar pendientes
      if (
        estado === 'accepted' &&
        oferta?.id &&
        maxCandidatos !== undefined &&
        nuevosAceptados !== undefined &&
        nuevosAceptados >= maxCandidatos
      ) {
        // 2a. Cerrar la oferta en la API (status_id: 3)
        const payloadCierre = { ...oferta, status_id: 3 };
        const closePatch = await fetch(`${API}/job-posts/${oferta.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status_id: 3 })
        });
        if (!closePatch.ok) {
          await fetch(`${API}/job-posts/${oferta.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadCierre)
          });
        }

        // 2b. Obtener todas las aplicaciones pendientes de esta oferta y rechazarlas
        const appsRes = await fetch(`${API}/applications`);
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          const todasApps: any[] = Array.isArray(appsData) ? appsData : (appsData?.data ?? []);

          const pendientes = todasApps.filter((a: any) =>
            Number(a.job_post_id) === Number(oferta.id) &&
            String(a.id) !== String(this.aplicacionId) && // no la que acabamos de aceptar
            ['submitted', 'reviewed', 'pending', ''].includes(
              (a.application_status || '').toLowerCase()
            )
          );

          // Rechazar todas en paralelo
          await Promise.all(
            pendientes.map((a: any) =>
              fetch(`${API}/applications/${a.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_status: 'rejected' })
              }).then(res => {
                if (!res.ok) {
                  return fetch(`${API}/applications/${a.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...a, application_status: 'rejected' })
                  });
                }
                return res; // <-- agregar este return
              }).catch(err => console.error(`Error rechazando app ${a.id}:`, err))
            )
          );

          alert(`Candidato aceptado. Se alcanzó el cupo máximo (${maxCandidatos}). La oferta fue cerrada y ${pendientes.length} candidato(s) pendiente(s) fueron rechazados automáticamente.`);
        } else {
          alert('Candidato aceptado. La oferta fue cerrada automáticamente.');
        }

      } else {
        alert(
          this.tipoAccion === 'aceptar'
            ? 'Candidato aceptado exitosamente'
            : 'Candidato rechazado'
        );
      }

      this.mostrarConfirmacion = false;
      this.guardando = false;
      this.volverAtras();

    } catch (err) {
      console.error('Error actualizando candidato:', err);
      alert('Error al procesar la solicitud');
      this.mostrarConfirmacion = false;
      this.guardando = false;
    }
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
    this.router.navigate(['/gestion-ofertas']);
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

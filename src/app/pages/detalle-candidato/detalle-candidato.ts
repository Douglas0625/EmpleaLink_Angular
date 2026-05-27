import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
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
    private postulacionesService: PostulacionesService,
    private usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.aplicacionId = params['applicationId'] || '1';
      this.jobPostId = params['jobPostId'] || '1';
      this.cargarCandidato();
    });
  }

  /**
   * Carga los datos del candidato
   */
  private cargarCandidato(): void {
    this.cargando = true;
    console.log(`[DetalleCandidato] Loading candidate with applicationId: ${this.aplicacionId}`);

    this.postulacionesService.getApplicationById(this.aplicacionId).subscribe({
      next: (aplicacion) => {
        console.log(`[DetalleCandidato] Application data received:`, aplicacion);
        
        if (!aplicacion) {
          console.warn(`[DetalleCandidato] Application is null or undefined`);
          this.cargarCandidatoMock();
          return;
        }

        if (!aplicacion.user_id) {
          console.warn(`[DetalleCandidato] Application has no user_id:`, aplicacion);
          this.cargarCandidatoMock();
          return;
        }

        console.log(`[DetalleCandidato] Found user_id: ${aplicacion.user_id}, fetching profile...`);
        
        this.usuarioService.getUserProfile(aplicacion.user_id).subscribe({
          next: (usuario) => {
            console.log(`[DetalleCandidato] User profile received:`, usuario);
            
            if (!usuario) {
              console.warn(`[DetalleCandidato] User profile is null`);
              this.cargarCandidatoMock();
              return;
            }
            
            console.log(`[DetalleCandidato] Successfully mapped candidate from API data`);
            this.candidato = this.mapearCandidato(usuario, aplicacion);
            this.cargando = false;
            console.log(`[DetalleCandidato] Final candidate object:`, this.candidato);
          },
          error: (err) => {
            console.error(`[DetalleCandidato] Error loading user profile for user ${aplicacion.user_id}:`, err);
            console.warn(`[DetalleCandidato] Loading mock data as fallback`);
            this.cargarCandidatoMock();
          }
        });
      },
      error: (err) => {
        console.error(`[DetalleCandidato] Error loading application ${this.aplicacionId}:`, err);
        console.warn(`[DetalleCandidato] Loading mock data as fallback`);
        this.cargarCandidatoMock();
      }
    });
  }

  /**
   * Mapea datos del usuario a estructura de candidato
   */
  private mapearCandidato(usuario: any, aplicacion: any): Candidato {
    console.log(`[DetalleCandidato.mapearCandidato] Mapping candidate data from API:`, {
      usuarioId: usuario?.id,
      usuarioName: usuario?.name,
      hasExperience: !!(usuario?.experience?.length || usuario?.work_experiences?.length),
      hasEducation: !!(usuario?.education?.length || usuario?.educational_info?.length),
      hasSkills: !!(usuario?.skills?.length || usuario?.profile_skills?.length),
    });

    // Mapear experiencias laborales
    const experiencia = this.mapearExperiencias(usuario.experience || usuario.work_experiences || []);
    console.log(`[DetalleCandidato.mapearCandidato] Mapped ${experiencia.length} work experiences`);
    
    // Mapear educación
    const educacion = this.mapearEducacion(usuario.education || usuario.educational_info || []);
    console.log(`[DetalleCandidato.mapearCandidato] Mapped ${educacion.length} educational records`);
    
    // Mapear habilidades
    const habilidades = this.mapearHabilidades(usuario.skills || usuario.profile_skills || []);
    console.log(`[DetalleCandidato.mapearCandidato] Mapped ${habilidades.length} skills:`, habilidades);
    
    const candidatoMapeado: Candidato = {
      id: usuario.id?.toString() || '1',
      name: usuario.name || usuario.first_name || usuario.full_name || 'Candidato',
      email: usuario.email || 'email@ejemplo.com',
      phone: usuario.phone || usuario.phone_number || '+34 000 000 000',
      title: usuario.title || usuario.professional_title || usuario.job_title || 'Profesional',
      location: usuario.location || usuario.city || 'No especificado',
      workMode: usuario.work_mode || usuario.preferred_modality || usuario.modality || 'No especificado',
      avatar: usuario.avatar || usuario.profile_picture || usuario.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.name || 'User')}&background=5b6df6&color=fff&size=150`,
      profesionalProfile: usuario.professional_summary || usuario.bio || usuario.about || usuario.professional_profile || 'Perfil profesional no disponible',
      experiencia: experiencia.length > 0 ? experiencia : this.getExperienciaDefault(),
      educacion: educacion.length > 0 ? educacion : this.getEducacionDefault(),
      habilidades: habilidades.length > 0 ? habilidades : ['No especificadas'],
      cv: usuario.cv_url || usuario.cv || usuario.resume || '#'
    };
    
    console.log(`[DetalleCandidato.mapearCandidato] Final mapped candidate:`, candidatoMapeado);
    return candidatoMapeado;
  }

  /**
   * Mapea experiencias laborales desde la API
   */
  private mapearExperiencias(experiencias: any[]): ExperienciaLaboral[] {
    if (!Array.isArray(experiencias) || experiencias.length === 0) {
      console.log(`[DetalleCandidato.mapearExperiencias] No work experiences found`);
      return [];
    }

    const mapeadas = experiencias.map((exp: any) => ({
      id: exp.id?.toString() || Math.random().toString(),
      title: exp.title || exp.position || exp.job_title || 'Sin título',
      company: exp.company || exp.company_name || exp.employer || 'No especificada',
      startDate: this.formatarFechaISO(exp.start_date || exp.startDate || exp.from_date),
      endDate: (exp.end_date || exp.endDate || exp.to_date) ? 
        this.formatarFechaISO(exp.end_date || exp.endDate || exp.to_date) : undefined,
      description: exp.description || exp.description_text || exp.details || 'Sin descripción',
      isCurrent: exp.is_current !== undefined ? exp.is_current : 
                 exp.current !== undefined ? exp.current :
                 !exp.end_date && !exp.endDate && !exp.to_date
    }));

    console.log(`[DetalleCandidato.mapearExperiencias] Mapped ${mapeadas.length} experiences:`, mapeadas);
    return mapeadas;
  }

  /**
   * Mapea información educativa desde la API
   */
  private mapearEducacion(educaciones: any[]): Educacion[] {
    if (!Array.isArray(educaciones) || educaciones.length === 0) {
      console.log(`[DetalleCandidato.mapearEducacion] No educational info found`);
      return [];
    }

    const mapeadas = educaciones.map((edu: any) => ({
      id: edu.id?.toString() || Math.random().toString(),
      title: edu.title || edu.degree_title || edu.degree || edu.qualification || 'Sin título',
      institution: edu.institution || edu.school || edu.university || edu.school_name || 'No especificada',
      startDate: this.formatarFechaISO(edu.start_date || edu.startDate || edu.from_date),
      endDate: this.formatarFechaISO(edu.end_date || edu.endDate || edu.to_date) || 'Presente'
    }));

    console.log(`[DetalleCandidato.mapearEducacion] Mapped ${mapeadas.length} educational records:`, mapeadas);
    return mapeadas;
  }

  /**
   * Mapea habilidades desde la API
   */
  private mapearHabilidades(skills: any[]): string[] {
    if (!Array.isArray(skills) || skills.length === 0) {
      console.log(`[DetalleCandidato.mapearHabilidades] No skills found`);
      return [];
    }

    const mapeadas = skills
      .map((skill: any) => {
        // Si es un objeto con propiedad 'name' o 'skill_name'
        if (typeof skill === 'object' && skill !== null) {
          // Buscar en diferentes niveles de anidamiento
          return skill.name || 
                 skill.skill_name || 
                 skill.skill?.name ||
                 skill.title || 
                 skill.skill?.title ||
                 '';
        }
        // Si es una cadena de texto
        return String(skill);
      })
      .filter(s => s !== '')
      .filter((s, idx, arr) => arr.indexOf(s) === idx); // Eliminar duplicados

    console.log(`[DetalleCandidato.mapearHabilidades] Mapped ${mapeadas.length} skills:`, mapeadas);
    return mapeadas;
  }

  /**
   * Formatea fecha ISO a formato legible
   */
  private formatarFechaISO(fecha: string): string {
    if (!fecha) return '';
    try {
      const date = new Date(fecha);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    } catch {
      return fecha;
    }
  }

  /**
   * Proporciona experiencia por defecto
   */
  private getExperienciaDefault(): ExperienciaLaboral[] {
    return [
      {
        id: '1',
        title: 'No hay experiencia registrada',
        company: '-',
        startDate: '',
        endDate: undefined,
        description: 'El candidato no ha registrado experiencia laboral',
        isCurrent: false
      }
    ];
  }

  /**
   * Proporciona educación por defecto
   */
  private getEducacionDefault(): Educacion[] {
    return [
      {
        id: '1',
        title: 'No hay información educativa',
        institution: '-',
        startDate: '',
        endDate: ''
      }
    ];
  }

  /**
   * Carga datos mock cuando falla la API
   */
  private cargarCandidatoMock(): void {
    console.warn(`[DetalleCandidato] ⚠️ LOADING MOCK DATA - API failed to load real data`);
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

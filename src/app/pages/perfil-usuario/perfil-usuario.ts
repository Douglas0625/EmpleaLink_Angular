import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UsuarioService } from '../../services/usuario';

declare var bootstrap: any;

@Component({
  selector: 'app-perfil-usuario',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil-usuario.html',
  styleUrl: './perfil-usuario.css'
})
export class PerfilUsuario implements OnInit {

  sesion: any = null;
  userActual: any = null;
  profileActual: any = null;
  alertaActual: any = null;

  // Sidebar
  nombreResumen = 'Usuario';
  tituloResumen = 'Candidato';
  ubicacionResumen = '';
  emailResumen = '';
  telefonoResumen = '';
  linkedinResumen = '';
  fotoUrl = '';
  cvUrl = '';
  iniciales = 'US';
  fotoValida = false;

  // Stats
  statPostulaciones = 0;
  statEntrevistas = 0;
  statGuardados = 0;
  statRechazos = 0;

  // Formulario principal
  nombreInput = '';
  apellidoInput = '';
  emailInput = '';
  telefonoInput = '';
  ubicacionInput = '';
  linkedinInput = '';
  tituloInput = '';
  resumenInput = '';

  // Alertas
  alertaKeywords = '';
  alertaRemote = false;
  alertaOnsite = false;
  alertaHybrid = false;
  alertaActiva = true;

  // Modales
  fotoUrlModal = '';
  cvUrlModal = '';

  // Experiencia form
  expEmpresa = '';
  expPuesto = '';
  expFechaInicio = '';
  expFechaFin = '';
  expActual = false;
  expDescripcion = '';

  // Educación form
  eduInstitucion = '';
  eduGradoId = '';
  eduTituloPersonalizado = '';
  eduFechaInicio = '';
  eduFechaFin = '';
  eduActual = false;

  // Habilidad form
  habilidadSeleccionada = '';

  // Catálogos
  grados: any[] = [];
  skills: any[] = [];

  // Listas
  experiencias: any[] = [];
  educacion: any[] = [];
  profileSkills: any[] = [];

  loading = true;

  constructor(private usuarioService: UsuarioService, private router: Router) {}

  ngOnInit(): void {
    this.sesion = this.obtenerSesion();
    if (!this.sesion) { this.router.navigate(['/login']); return; }
    this.cargarTodo();
  }

  obtenerSesion(): any {
    try {
      const s = localStorage.getItem('usuarioLoggeado');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  cargarTodo(): void {
    this.loading = true;
    forkJoin({
      users: this.usuarioService.getUsers(),
      profiles: this.usuarioService.getProfiles(),
      grados: this.usuarioService.getDegrees(),
      skills: this.usuarioService.getSkills(),
      experiences: this.usuarioService.getWorkExperiences(),
      education: this.usuarioService.getEducation(),
      profileSkills: this.usuarioService.getProfileSkills(),
      alerts: this.usuarioService.getJobAlerts(),
      applications: this.usuarioService.getApplications(),
      savedJobs: this.usuarioService.getSavedJobs()
    }).subscribe({
      next: (data) => {
        const users        = this.norm(data.users);
        const profiles     = this.norm(data.profiles);
        this.grados        = this.norm(data.grados);
        this.skills        = this.norm(data.skills);

        const userId = Number(this.sesion.id);
        this.userActual    = users.find((u: any) => Number(u.id) === userId) || null;
        this.profileActual = profiles.find((p: any) => Number(p.user_id) === userId) || null;

        if (!this.profileActual) { this.loading = false; return; }

        const profileId = Number(this.profileActual.id);

        this.experiencias   = this.norm(data.experiences).filter((e: any) => Number(e.profile_id) === profileId)
          .sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime());
        this.educacion      = this.norm(data.education).filter((e: any) => Number(e.profile_id) === profileId)
          .sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime());
        this.profileSkills  = this.norm(data.profileSkills).filter((ps: any) => Number(ps.profile_id) === profileId);

        const alertas = this.norm(data.alerts);
        this.alertaActual = alertas.find((a: any) => Number(a.profile_id) === profileId) || null;

        const apps = this.norm(data.applications).filter((a: any) => Number(a.profile_id) === profileId);
        const saved = this.norm(data.savedJobs).filter((s: any) => Number(s.profile_id) === profileId);

        this.statPostulaciones = apps.length;
        this.statEntrevistas   = apps.filter((a: any) => (a.application_status || '').toLowerCase() === 'interview').length;
        this.statGuardados     = saved.length;
        this.statRechazos      = apps.filter((a: any) => (a.application_status || '').toLowerCase() === 'rejected').length;

        this.llenarFormulario();
        this.loading = false;
      },
      error: (err) => { console.error(err); this.loading = false; }
    });
  }

  llenarFormulario(): void {
    const p = this.profileActual;
    const u = this.userActual;

    this.nombreInput    = p.first_name || '';
    this.apellidoInput  = p.last_name || '';
    this.emailInput     = u?.email || this.sesion?.email || '';
    this.telefonoInput  = p.phone || '';
    this.ubicacionInput = p.location || '';
    this.linkedinInput  = p.external_link || '';
    this.tituloInput    = p.professional_title || '';
    this.resumenInput   = p.about_me || '';
    this.fotoUrlModal   = p.profile_image_url || '';
    this.cvUrlModal     = p.cv_url || '';
    this.cvUrl          = p.cv_url || '';

    if (this.alertaActual) {
      this.alertaKeywords = this.alertaActual.keywords || '';
      this.alertaRemote   = !!this.alertaActual.remote;
      this.alertaOnsite   = !!this.alertaActual.onsite;
      this.alertaHybrid   = !!this.alertaActual.hybrid;
      this.alertaActiva   = !!this.alertaActual.is_active;
    }

    this.actualizarResumen();
  }

  actualizarResumen(): void {
    const nombre = `${this.nombreInput} ${this.apellidoInput}`.trim() || 'Usuario';
    this.nombreResumen    = nombre;
    this.tituloResumen    = this.tituloInput || 'Candidato';
    this.ubicacionResumen = this.ubicacionInput || 'Ubicación no disponible';
    this.emailResumen     = this.emailInput || 'Sin correo';
    this.telefonoResumen  = this.telefonoInput || 'Sin teléfono';
    this.linkedinResumen  = this.limpiarLinkedin(this.linkedinInput);
    this.iniciales        = this.obtenerIniciales(nombre);
    this.fotoUrl          = this.fotoUrlModal;
    this.fotoValida       = !!this.fotoUrl;
  }

  // ---- GUARDAR PERFIL ----

  guardarPerfil(): void {
    if (!this.profileActual || !this.userActual) return;
    if (!this.nombreInput || !this.apellidoInput || !this.emailInput) {
      alert('Completa nombres, apellidos y correo.'); return;
    }

    const profilePayload = {
      user_id: this.profileActual.user_id,
      first_name: this.nombreInput,
      last_name: this.apellidoInput,
      phone: this.telefonoInput,
      location: this.ubicacionInput,
      external_link: this.linkedinInput,
      professional_title: this.tituloInput,
      about_me: this.resumenInput,
      profile_image_url: this.fotoUrlModal,
      cv_url: this.cvUrlModal
    };

    this.usuarioService.updateProfile(this.profileActual.id, profilePayload).subscribe({
      next: () => {
        this.profileActual = { ...this.profileActual, ...profilePayload };
        this.cvUrl = this.cvUrlModal;
        this.actualizarSesion();
        this.actualizarResumen();
        this.guardarAlerta();
        alert('Perfil actualizado correctamente.');
      },
      error: () => alert('No se pudo guardar el perfil.')
    });
  }

  cancelar(): void {
    this.llenarFormulario();
  }

  // ---- FOTO Y CV MODAL ----

  guardarFoto(): void {
    if (!this.fotoUrlModal.trim()) { alert('Ingresa una URL válida.'); return; }
    const payload = { ...this.profileActual, profile_image_url: this.fotoUrlModal };
    this.usuarioService.updateProfile(this.profileActual.id, payload).subscribe({
      next: () => {
        this.profileActual.profile_image_url = this.fotoUrlModal;
        this.fotoUrl = this.fotoUrlModal;
        this.fotoValida = true;
        this.actualizarSesion();
        bootstrap.Modal.getInstance(document.getElementById('modalFotoPerfil'))?.hide();
        alert('Foto actualizada correctamente.');
      },
      error: () => alert('No se pudo actualizar la foto.')
    });
  }

  guardarCV(): void {
    if (!this.cvUrlModal.trim()) { alert('Ingresa una URL válida.'); return; }
    const payload = { ...this.profileActual, cv_url: this.cvUrlModal };
    this.usuarioService.updateProfile(this.profileActual.id, payload).subscribe({
      next: () => {
        this.profileActual.cv_url = this.cvUrlModal;
        this.cvUrl = this.cvUrlModal;
        this.actualizarSesion();
        bootstrap.Modal.getInstance(document.getElementById('modalCvUsuario'))?.hide();
        alert('CV actualizado correctamente.');
      },
      error: () => alert('No se pudo actualizar el CV.')
    });
  }

  descargarCV(): void {
    if (this.cvUrl) { window.open(this.cvUrl, '_blank'); }
    else { alert('Aún no tienes CV registrado.'); }
  }

  // ---- EXPERIENCIA ----

  guardarExperiencia(): void {
    if (!this.expEmpresa || !this.expPuesto || !this.expFechaInicio) {
      alert('Completa empresa, puesto y fecha de inicio.'); return;
    }

    const payload: any = {
      profile_id: this.profileActual.id,
      company_name: this.expEmpresa,
      job_title: this.expPuesto,
      start_date: this.expFechaInicio,
      is_current: this.expActual,
      description: this.expDescripcion
    };

    if (!this.expActual && this.expFechaFin) {
      payload.end_date = this.expFechaFin;
    }

    this.usuarioService.postWorkExperience(payload).subscribe({
      next: () => {
        bootstrap.Modal.getInstance(document.getElementById('modalExperiencia'))?.hide();
        this.resetExpForm();
        this.recargarExperiencias();
        alert('Experiencia agregada.');
      },
      error: (err) => alert('No se pudo guardar la experiencia.')
    });
  }

  recargarExperiencias(): void {
    this.usuarioService.getWorkExperiences().subscribe((data: any) => {
      this.experiencias = this.norm(data)
        .filter((e: any) => Number(e.profile_id) === Number(this.profileActual.id))
        .sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime());
    });
  }

  resetExpForm(): void {
    this.expEmpresa = ''; this.expPuesto = ''; this.expFechaInicio = '';
    this.expFechaFin = ''; this.expActual = false; this.expDescripcion = '';
  }

  // ---- EDUCACIÓN ----

  guardarEducacion(): void {
    if (!this.eduInstitucion || !this.eduFechaInicio) {
      alert('Completa institución y fecha de inicio.'); return;
    }

    const payload: any = {
      profile_id: this.profileActual.id,
      degree_id: this.eduGradoId ? Number(this.eduGradoId) : null,
      institution: this.eduInstitucion,
      custom_degree_name: this.eduTituloPersonalizado,
      start_date: new Date(this.eduFechaInicio).toISOString(),
      is_current: this.eduActual
    };

    if (!this.eduActual && this.eduFechaFin) {
      payload.end_date = new Date(this.eduFechaFin).toISOString();
    }

    this.usuarioService.postEducation(payload).subscribe({
      next: () => {
        bootstrap.Modal.getInstance(document.getElementById('modalEducacion'))?.hide();
        this.resetEduForm();
        this.recargarEducacion();
        alert('Educación agregada.');
      },
      error: (err) => alert('No se pudo guardar la educación.')
    });
  }

  recargarEducacion(): void {
    this.usuarioService.getEducation().subscribe((data: any) => {
      this.educacion = this.norm(data)
        .filter((e: any) => Number(e.profile_id) === Number(this.profileActual.id))
        .sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime());
    });
  }

  resetEduForm(): void {
    this.eduInstitucion = ''; this.eduGradoId = ''; this.eduTituloPersonalizado = '';
    this.eduFechaInicio = ''; this.eduFechaFin = ''; this.eduActual = false;
  }

  // ---- HABILIDADES ----

  guardarHabilidad(): void {
    if (!this.habilidadSeleccionada) { alert('Selecciona una habilidad.'); return; }
    const yaExiste = this.profileSkills.some(ps => Number(ps.skill_id) === Number(this.habilidadSeleccionada));
    if (yaExiste) { alert('Esa habilidad ya está agregada.'); return; }

    this.usuarioService.postProfileSkill({
      profile_id: this.profileActual.id,
      skill_id: Number(this.habilidadSeleccionada)
    }).subscribe({
      next: () => {
        bootstrap.Modal.getInstance(document.getElementById('modalHabilidades'))?.hide();
        this.habilidadSeleccionada = '';
        this.recargarSkills();
        alert('Habilidad agregada.');
      },
      error: () => alert('No se pudo guardar la habilidad.')
    });
  }

  recargarSkills(): void {
    this.usuarioService.getProfileSkills().subscribe((data: any) => {
      this.profileSkills = this.norm(data).filter((ps: any) => Number(ps.profile_id) === Number(this.profileActual.id));
    });
  }

  // ---- ALERTA ----

  guardarAlerta(): void {
    if (!this.profileActual?.id) return;
    const payload = {
      profile_id: this.profileActual.id,
      keywords: this.alertaKeywords,
      remote: this.alertaRemote,
      onsite: this.alertaOnsite,
      hybrid: this.alertaHybrid,
      is_active: this.alertaActiva
    };
    if (this.alertaActual?.id) {
      this.usuarioService.updateJobAlert(this.alertaActual.id, payload).subscribe();
    } else {
      this.usuarioService.postJobAlert(payload).subscribe((res: any) => { this.alertaActual = res; });
    }
  }

  // ---- HELPERS ----

  obtenerNombreSkill(skillId: number): string {
    const skill = this.skills.find(s => Number(s.id) === Number(skillId));
    return skill?.skill_name || 'Habilidad';
  }

  obtenerNombreGrado(degreeId: number, customName: string): string {
    if (customName) return customName;
    const grado = this.grados.find(g => Number(g.id) === Number(degreeId));
    return grado?.degree_name || 'Sin título';
  }

  formatearRango(inicio: string, fin: string, actual: boolean): string {
    const ini = inicio ? new Date(inicio).toLocaleDateString('es-SV', { year: 'numeric', month: 'short' }) : 'Inicio';
    const end = actual ? 'Presente' : (fin ? new Date(fin).toLocaleDateString('es-SV', { year: 'numeric', month: 'short' }) : 'Fin');
    return `${ini} - ${end}`;
  }

  toISO(fecha: string): string | null {
    return fecha || null;
  }

  norm(data: any): any[] {
    return Array.isArray(data) ? data : data?.data || [];
  }

  obtenerIniciales(texto: string): string {
    return (texto || 'US').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
  }

  limpiarLinkedin(url: string): string {
    if (!url) return 'Sin enlace';
    return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  }

  actualizarSesion(): void {
    if (!this.sesion) return;
    this.sesion.first_name = this.profileActual.first_name;
    this.sesion.last_name  = this.profileActual.last_name;
    this.sesion.displayName = `${this.profileActual.first_name} ${this.profileActual.last_name}`.trim();
    this.sesion.profile_image_url = this.profileActual.profile_image_url;
    this.sesion.professional_title = this.profileActual.professional_title;
    this.sesion.location = this.profileActual.location;
    this.sesion.cv_url = this.profileActual.cv_url;
    localStorage.setItem('usuarioLoggeado', JSON.stringify(this.sesion));
  }
}

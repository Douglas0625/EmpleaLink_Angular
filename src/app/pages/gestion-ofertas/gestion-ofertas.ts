import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, firstValueFrom } from 'rxjs';
import { SesionUsuario } from '../../models/sesion.model';

const API = 'https://portal-empleo-api-production-481e.up.railway.app';

interface OfertaVista {
  id: number;
  titulo: string;
  modalidad: string;
  fechaPublicada: string;
  salario: string;
  estadoTexto: string;
  estadoColor: string;
  descripcion: string;
  statusId: number;
  candidatos: CandidatoVista[];
  totalPostulantes: number;
}

interface CandidatoVista {
  applicationId: number;
  profileId: number;
  jobId: number;
  nombre: string;
  titulo: string;
  foto: string;
}

@Component({
  selector: 'app-gestion-ofertas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './gestion-ofertas.html',
  styleUrl: './gestion-ofertas.css'
})
export class GestionOfertas implements OnInit {

  sesion: SesionUsuario | null = null;
  empresaActual: any = null;

  // Stats
  statTotal        = 0;
  statActivas      = 0;
  statCerradas     = 0;
  statPostulantes  = 0;

  // Datos
  ofertasGlobales:      any[] = [];
  aplicacionesGlobales: any[] = [];
  perfilesGlobales:     any[] = [];
  usuariosGlobales:     any[] = [];

  // Vista filtrada
  ofertasVista: OfertaVista[] = [];

  // Filtros
  filtroPuesto = '';
  filtroEstado = '2';

  // Modal
  modalTitulo    = 'Crear una nueva oferta';
  formOferta:    FormGroup;
  ofertaEditId   = '';
  mensajeModal   = '';
  mensajeExito   = false;
  guardando      = false;

  loading = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.formOferta = this.fb.group({
      titulo:           ['', Validators.required],
      experiencia:      ['1 año', Validators.required],
      modalidad:        ['remote', Validators.required],
      tipo:             ['full_time', Validators.required],
      salarioMin:       ['', Validators.required],
      salarioMax:       ['', Validators.required],
      descripcion:      ['', Validators.required],
      responsabilidades:[''],
      requisitos:       [''],
      estado:           ['2']
    });
  }

  ngOnInit(): void {
    const raw = localStorage.getItem('usuarioLoggeado');
    if (!raw) { this.router.navigate(['/login']); return; }

    this.sesion = JSON.parse(raw) as SesionUsuario;
    if (this.sesion.role_name !== 'company') { this.router.navigate(['/login']); return; }

    this.cargarDatos();
  }

  // ─── Filtros ──────────────────────────────────────────────────────────────

  aplicarFiltros(): void {
    const texto  = this.filtroPuesto.trim().toLowerCase();
    const estado = this.filtroEstado;

    let filtradas = [...this.ofertasGlobales];

    if (texto) {
      filtradas = filtradas.filter(o => (o.title || '').toLowerCase().includes(texto));
    }
    if (estado) {
      filtradas = filtradas.filter(o => Number(o.status_id) === Number(estado));
    }

    this.ofertasVista = this.mapearOfertas(filtradas);
  }

  limpiarFiltros(): void {
    this.filtroPuesto = '';
    this.filtroEstado = '2';
    this.aplicarFiltros();
  }

  // ─── Modal ────────────────────────────────────────────────────────────────

  abrirModalNueva(): void {
    this.ofertaEditId  = '';
    this.modalTitulo   = 'Crear una nueva oferta';
    this.mensajeModal  = '';
    this.formOferta.reset({
      experiencia: '1 año',
      modalidad:   'remote',
      tipo:        'full_time',
      estado:      '2'
    });
    this.abrirModal('modalOferta');
  }

  abrirModalEdicion(ofertaId: number): void {
    const oferta = this.ofertasGlobales.find(o => Number(o.id) === ofertaId);
    if (!oferta) return;

    this.ofertaEditId = String(oferta.id);
    this.modalTitulo  = 'Editar oferta';
    this.mensajeModal = '';

    this.formOferta.patchValue({
      titulo:            oferta.title || '',
      experiencia:       this.idATextoExperiencia(oferta.experience_required_timelapse_id),
      modalidad:         oferta.modality || 'remote',
      tipo:              oferta.job_type  || 'full_time',
      salarioMin:        oferta.min_salary ?? '',
      salarioMax:        oferta.max_salary ?? '',
      descripcion:       this.extraerDescPrincipal(oferta.description),
      responsabilidades: this.extraerBloque(oferta.description, 'Responsabilidades:'),
      requisitos:        this.extraerBloque(oferta.description, 'Requisitos:'),
      estado:            String(oferta.status_id || 2)
    });

    this.abrirModal('modalOferta');
  }

  async guardarOferta(): Promise<void> {
    this.mensajeModal = '';
    if (this.formOferta.invalid) {
      this.mensajeModal = 'Completa los campos obligatorios.';
      this.mensajeExito = false;
      return;
    }

    if (!this.empresaActual?.id) {
      this.mensajeModal = 'No se encontró el perfil de empresa.';
      this.mensajeExito = false;
      return;
    }

    const v = this.formOferta.value;
    const descripcionCompleta = [
      v.descripcion,
      v.responsabilidades ? `Responsabilidades: ${v.responsabilidades}` : '',
      v.requisitos        ? `Requisitos: ${v.requisitos}`               : ''
    ].filter(Boolean).join('\n\n');

    const payload = {
      company_profile_id: this.empresaActual.id,
      title:              v.titulo,
      description:        descripcionCompleta,
      location:           this.empresaActual.location || 'No especificada',
      modality:           v.modalidad,
      job_type:           v.tipo,
      experience_required_timelapse_id: this.textoAIdExperiencia(v.experiencia),
      min_salary:         Number(v.salarioMin),
      max_salary:         Number(v.salarioMax),
      status_id:          Number(v.estado)
    };

    this.guardando = true;

    try {
      if (this.ofertaEditId) {
        // EDITAR — actualiza localmente de inmediato
        await this.actualizarOferta(this.ofertaEditId, payload);

        const idx = this.ofertasGlobales.findIndex(o => String(o.id) === String(this.ofertaEditId));
        if (idx !== -1) {
          this.ofertasGlobales[idx] = { ...this.ofertasGlobales[idx], ...payload };
        }
        this.mensajeModal = 'Oferta actualizada con éxito.';

      } else {
        // CREAR — agrega la nueva oferta localmente de inmediato
        const nueva: any = await this.http.post(`${API}/job-posts`, payload).toPromise();
        if (nueva?.id) {
          this.ofertasGlobales = [{ ...payload, id: nueva.id, created_at: new Date().toISOString() }, ...this.ofertasGlobales];
          if (Number(payload.status_id) === 2) {
            await this.generarNotificaciones({ ...payload, id: nueva.id });
          }
        }
        this.mensajeModal = 'Oferta creada con éxito.';
      }

      this.mensajeExito = true;

      // Recalcula stats y vista con los datos locales ya actualizados
      this.calcularStats();
      this.aplicarFiltros();
      this.loading = false;
      this.cdr.detectChanges();

      setTimeout(() => this.cerrarModal('modalOferta'), 700);

    } catch {
      this.mensajeModal = 'No se pudo guardar la oferta.';
      this.mensajeExito = false;
    } finally {
      this.guardando = false;
    }
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────

  private async cargarDatos(): Promise<void> {
    this.loading = true;

    try {
      const { companies, jobs, applications, profiles, users } = await firstValueFrom(
        forkJoin({
          companies:    this.http.get<any>(`${API}/company-profiles`),
          jobs:         this.http.get<any>(`${API}/job-posts`),
          applications: this.http.get<any>(`${API}/applications`),
          profiles:     this.http.get<any>(`${API}/profiles`),
          users:        this.http.get<any>(`${API}/users`)
        })
      );

      const listaEmpresas = this.norm(companies);
      const listaJobs     = this.norm(jobs);
      const listaApps     = this.norm(applications);
      const listaPerfiles = this.norm(profiles);

      this.empresaActual = listaEmpresas.find(
        (e: any) => Number(e.user_id) === Number(this.sesion?.id)
      ) || null;

      if (!this.empresaActual) { this.loading = false; return; }

      this.ofertasGlobales      = listaJobs.filter(
        (j: any) => Number(j.company_profile_id) === Number(this.empresaActual.id)
      );
      this.aplicacionesGlobales = listaApps;
      this.perfilesGlobales     = listaPerfiles;

      this.calcularStats();
      this.aplicarFiltros();

    } catch (err) {
      console.error('ERROR CARGANDO DATOS:', err);
    } finally {
      this.loading = false;
    }
  }

  private calcularStats(): void {
    const ids = this.ofertasGlobales.map(o => Number(o.id));
    this.statTotal       = this.ofertasGlobales.length;
    this.statActivas     = this.ofertasGlobales.filter(o => Number(o.status_id) === 2).length;
    this.statCerradas    = this.ofertasGlobales.filter(o => Number(o.status_id) === 3).length;
    this.statPostulantes = this.aplicacionesGlobales.filter(a => ids.includes(Number(a.job_post_id))).length;
  }

  private mapearOfertas(lista: any[]): OfertaVista[] {
    return [...lista]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map(o => {
        const apps = this.aplicacionesGlobales.filter(a => Number(a.job_post_id) === Number(o.id));
        const recientes = [...apps]
          .sort((a, b) => new Date(b.application_date || 0).getTime() - new Date(a.application_date || 0).getTime())
          .slice(0, 4);

        const estado = this.mapEstado(o.status_id);

        return {
          id:              o.id,
          titulo:          o.title || 'Oferta',
          modalidad:       this.mapModalidad(o.modality),
          fechaPublicada:  this.formatFecha(o.created_at),
          salario:         this.formatSalario(o.min_salary, o.max_salary),
          estadoTexto:     estado.texto,
          estadoColor:     estado.color,
          descripcion:     this.recortar(this.extraerDescPrincipal(o.description), 180),
          statusId:        Number(o.status_id),
          totalPostulantes: apps.length,
          candidatos: recientes.map((a: any) => {
            const p = this.perfilesGlobales.find((pf: any) => Number(pf.id) === Number(a.profile_id));
            const nombre = `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Candidato';
            return {
              applicationId: a.id,
              profileId: p?.id || 0,
              jobId:     o.id,
              nombre,
              titulo:    p?.professional_title || 'Perfil profesional',
              foto:      p?.profile_image_url  || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`
            };
          })
        };
      });
  }

  // ─── Utilidades API ───────────────────────────────────────────────────────

  private async actualizarOferta(id: string, payload: any): Promise<void> {
    const patch = await fetch(`${API}/job-posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (patch.ok) return;

    const put = await fetch(`${API}/job-posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!put.ok) throw new Error('Error actualizando oferta');
  }

  private async generarNotificaciones(jobPost: any): Promise<void> {
    try {
      const [alertasResp, perfilesResp, notifResp] = await Promise.all([
        this.http.get<any>(`${API}/job-alerts`).toPromise(),
        this.http.get<any>(`${API}/profiles`).toPromise(),
        this.http.get<any>(`${API}/notifications`).toPromise()
      ]);

      const alertas    = this.norm(alertasResp);
      const perfiles   = this.norm(perfilesResp);
      const existentes = this.norm(notifResp);

      const textoVacante     = `${jobPost.title || ''} ${jobPost.description || ''}`.toLowerCase();
      const modalidadVacante = String(jobPost.modality || '').toLowerCase();

      for (const alerta of alertas) {
        // ✅ Fix: convertir a booleano robusto (acepta 0/1/"0"/"1"/true/false)
        const activa  = Number(alerta.is_active) === 1 || alerta.is_active === true;
        if (!activa) continue;

        const perfil = perfiles.find((p: any) => Number(p.id) === Number(alerta.profile_id));
        if (!perfil?.user_id) continue;

        const keywords = String(alerta.keywords || '')
          .split(',')
          .map((k: string) => k.trim().toLowerCase())
          .filter(Boolean);

        const coincideKeyword =
          keywords.length === 0 ||
          keywords.some((k: string) => textoVacante.includes(k));

        // ✅ Fix: conversión robusta de modalidades
        const remoto  = Number(alerta.remote) === 1 || alerta.remote === true;
        const onsite  = Number(alerta.onsite) === 1 || alerta.onsite === true;
        const hybrid  = Number(alerta.hybrid) === 1 || alerta.hybrid === true;

        const coincideModalidad =
          (modalidadVacante === 'remote'  && remoto)  ||
          (modalidadVacante === 'onsite'  && onsite)  ||
          (modalidadVacante === 'hybrid'  && hybrid);

        if (!coincideKeyword || !coincideModalidad) continue;

        const yaExiste = existentes.some((n: any) =>
          Number(n.user_id) === Number(perfil.user_id) &&
          String(n.message || '').toLowerCase()
            .includes((jobPost.title || '').toLowerCase())
        );
        if (yaExiste) continue;

        await this.http.post(`${API}/notifications`, {
          user_id: perfil.user_id,
          title:   'Nueva vacante que coincide contigo',
          message: `Se publicó la vacante "${jobPost.title}" que coincide con tu alerta de empleo.`,
          is_read: false
        }).toPromise();
      }
    } catch (err) {
      console.error('Error generando notificaciones:', err);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private norm(data: any): any[] {

    console.log('NORMALIZANDO:', data);

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  }

  private mapEstado(statusId: any): { texto: string; color: string } {
    if (Number(statusId) === 2) return { texto: 'Activa',  color: '#22C55E' };
    if (Number(statusId) === 3) return { texto: 'Cerrada', color: '#EF4444' };
    return { texto: 'Pausada', color: '#F59E0B' };
  }

  private mapModalidad(v: string): string {
    if (v === 'remote')  return 'Remoto';
    if (v === 'onsite')  return 'Presencial';
    if (v === 'hybrid')  return 'Híbrido';
    return 'No especificada';
  }

  private formatSalario(min: any, max: any): string {
    const mn = Number(min), mx = Number(max);
    if (!isFinite(mn) || !isFinite(mx)) return 'Salario no especificado';
    return `$${mn.toLocaleString('en-US')} - $${mx.toLocaleString('en-US')}`;
  }

  private formatFecha(f: string): string {
    if (!f) return 'Fecha no disponible';
    const d = new Date(f);
    if (isNaN(d.getTime())) return 'Fecha no disponible';
    return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private recortar(texto: string, limite: number): string {
    if (!texto || texto.length <= limite) return texto;
    return texto.slice(0, limite) + '...';
  }

  private extraerDescPrincipal(texto: string): string {
    if (!texto) return '';
    return texto.split(/\n\nResponsabilidades:|\n\nRequisitos:/)[0]?.trim() || '';
  }

  private extraerBloque(texto: string, etiqueta: string): string {
    if (!texto || !etiqueta) return '';
    const regex = new RegExp(`${etiqueta}\\s*([\\s\\S]*?)(\\n\\n[A-ZÁÉÍÓÚÑ][^:]*:|$)`, 'i');
    return texto.match(regex)?.[1]?.trim() || '';
  }

  private idATextoExperiencia(id: any): string {
    if (Number(id) === 1) return 'Sin experiencia';
    if (Number(id) === 2) return '1 año';
    if (Number(id) === 3) return '2 a 3 años';
    if (Number(id) === 4) return '5+ años';
    return '1 año';
  }

  private textoAIdExperiencia(texto: string): number {
    const v = (texto || '').toLowerCase();
    if (v.includes('sin'))  return 1;
    if (v.includes('1'))    return 2;
    if (v.includes('2') || v.includes('3')) return 3;
    if (v.includes('5'))    return 4;
    return 2;
  }

  // ─── Bootstrap modal helpers ──────────────────────────────────────────────

  private abrirModal(id: string): void {
    const el = document.getElementById(id);
    if (el) { const m = new (window as any).bootstrap.Modal(el); m.show(); }
  }

  private cerrarModal(id: string): void {
    const el = document.getElementById(id);
    if (el) { const m = (window as any).bootstrap.Modal.getInstance(el); m?.hide(); }
  }
}

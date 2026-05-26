import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SesionUsuario {
  id: number;
  email?: string;
  role_name: string;
  role_id?: number;
  company_profile_id?: number | null;
  displayName?: string;
  logo_url?: string;
}

export interface CompanyProfile {
  id: number;
  user_id: number;
  company_name: string;
  phone?: string;
  location?: string;
  website_url?: string;
  logo_url?: string;
  cover_image_url?: string;
  company_size_id?: number;
  industry_id?: number;
  additional_info_id?: number;
}

export interface AdditionalInfo {
  id: number;
  about_company?: string;
  mission?: string;
  vision?: string;
  culture?: string;
}

export interface Industry {
  id: number;
  industry_name?: string;
  name?: string;
}

export interface CompanySize {
  id: number;
  company_size_name?: string;
  company_size?: string;
  size_name?: string;
  name?: string;
}

export interface JobPost {
  id: number;
  company_profile_id: number;
  status_id: number;
}

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-perfil-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './perfil-empresa.html',
  styleUrls: ['./perfil-empresa.css']
})
export class PerfilEmpresa implements OnInit {

  private readonly API = 'https://portal-empleo-api-production-481e.up.railway.app';

  // ── Sesión ──
  sesion: SesionUsuario | null = null;

  // ── Datos cargados ──
  empresaActual: CompanyProfile | null = null;
  additionalInfoActual: AdditionalInfo | null = null;
  usuarioActual: any = null;

  // ── Catálogos ──
  industrias: Industry[] = [];
  tamanosEmpresa: CompanySize[] = [];

  // ── UI ──
  cargando = true;
  guardando = false;
  error = '';
  mensajeExito = '';
  mostrarModalLogo = false;
  logoUrlInput = '';
  logoPreviewModal = '';

  // ── Stats (cargadas desde API) ──
  statVacantesTotales = 0;
  statVacantesActivas = 0;
  statPostulantes = 0;
  statVacantesCerradas = 0;

  // ── Logo/avatar ──
  logoUrl = '';
  iniciales = 'EM';

  // ── Formulario ──
  formulario!: FormGroup;

  // ── Snapshot para cancelar ──
  private snapshotInicial: any = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const sesion = this.obtenerSesion();
    if (!sesion) { this.router.navigate(['/inicio-registro']); return; }
    if (sesion.role_name !== 'company') { this.router.navigate(['/']); return; }
    this.sesion = sesion;
    this.crearFormulario();
    this.cargarDatos();
  }

  // ─── Formulario ───────────────────────────────────────────────────────────

  private crearFormulario(): void {
    this.formulario = this.fb.group({
      company_name:    ['', [Validators.required, Validators.minLength(2)]],
      email:           ['', [Validators.required, Validators.email]],
      phone:           [''],
      location:        [''],
      website_url:     [''],
      cover_image_url: [''],
      industry_id:     [''],
      company_size_id: [''],
      about_company:   ['', [Validators.required, Validators.minLength(20)]],
      mission:         [''],
      vision:          [''],
      culture:         ['']
    });
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────

  private cargarDatos(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      empresas:    this.get<any>('/company-profiles'),
      usuarios:    this.get<any>('/users'),
      adicionales: this.get<any>('/additional-info'),
      industrias:  this.get<any>('/industries'),
      tamanos:     this.get<any>('/company-sizes'),
      jobPosts:    this.get<any>('/job-posts'),
      aplicaciones:this.get<any>('/applications')
    }).subscribe({
      next: ({ empresas, usuarios, adicionales, industrias, tamanos, jobPosts, aplicaciones }) => {
        const listaEmpresas   = this.normalizar<CompanyProfile>(empresas);
        const listaUsuarios   = this.normalizar<any>(usuarios);
        const listaAdicionales= this.normalizar<AdditionalInfo>(adicionales);
        const listaJobPosts   = this.normalizar<JobPost>(jobPosts);
        const listaAplicaciones = this.normalizar<any>(aplicaciones);

        this.industrias     = this.normalizar<Industry>(industrias);
        this.tamanosEmpresa = this.normalizar<CompanySize>(tamanos);

        // Fallbacks si la API falla
        if (!this.industrias.length) {
          this.industrias = [
            { id: 1, industry_name: 'Tecnología' }, { id: 2, industry_name: 'Educación' },
            { id: 3, industry_name: 'Salud' },       { id: 4, industry_name: 'Finanzas' },
            { id: 5, industry_name: 'Retail' }
          ];
        }
        if (!this.tamanosEmpresa.length) {
          this.tamanosEmpresa = [
            { id: 1, company_size_name: '1 - 10 empleados' },
            { id: 2, company_size_name: '11 - 50 empleados' },
            { id: 3, company_size_name: '51 - 250 empleados' },
            { id: 4, company_size_name: '251 - 500 empleados' }
          ];
        }

        // Buscar empresa del usuario logueado
        this.empresaActual =
          listaEmpresas.find(e => Number(e.user_id) === Number(this.sesion!.id)) ??
          listaEmpresas.find(e => Number(e.id) === Number(this.sesion!.company_profile_id)) ??
          null;

        if (!this.empresaActual) {
          this.error = 'No se encontró el perfil de tu empresa.';
          this.cargando = false;
          return;
        }

        // Usuario y additional-info
        this.usuarioActual = listaUsuarios.find(u => Number(u.id) === Number(this.empresaActual!.user_id)) ?? null;
        this.additionalInfoActual = listaAdicionales.find(
          a => Number(a.id) === Number(this.empresaActual!.additional_info_id)
        ) ?? null;

        // Stats
        const misOfertas = listaJobPosts.filter(j => Number(j.company_profile_id) === Number(this.empresaActual!.id));
        const idsOfertas  = misOfertas.map(j => Number(j.id));
        const misApps     = listaAplicaciones.filter(a => idsOfertas.includes(Number(a.job_post_id)));
        this.statVacantesTotales  = misOfertas.length;
        this.statVacantesActivas  = misOfertas.filter(j => Number(j.status_id) === 2).length;
        this.statVacantesCerradas = misOfertas.filter(j => Number(j.status_id) === 3).length;
        this.statPostulantes      = misApps.length;

        // Logo y resumen
        this.logoUrl  = this.empresaActual.logo_url ?? '';
        this.iniciales = this.getIniciales(this.empresaActual.company_name);

        // Llenar formulario
        this.formulario.patchValue({
          company_name:    this.empresaActual.company_name ?? '',
          email:           this.usuarioActual?.email ?? this.sesion?.email ?? '',
          phone:           this.empresaActual.phone ?? '',
          location:        this.empresaActual.location ?? '',
          website_url:     this.empresaActual.website_url ?? '',
          cover_image_url: this.empresaActual.cover_image_url ?? '',
          industry_id:     this.empresaActual.industry_id ? String(this.empresaActual.industry_id) : '',
          company_size_id: this.empresaActual.company_size_id ? String(this.empresaActual.company_size_id) : '',
          about_company:   this.additionalInfoActual?.about_company ?? '',
          mission:         this.additionalInfoActual?.mission ?? '',
          vision:          this.additionalInfoActual?.vision ?? '',
          culture:         this.additionalInfoActual?.culture ?? ''
        });

        this.snapshotInicial = this.formulario.getRawValue();
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la información. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  // ─── Guardar perfil ───────────────────────────────────────────────────────

  guardarCambios(): void {
    this.mensajeExito = '';
    this.error = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error = 'Completa los campos obligatorios correctamente.';
      return;
    }

    if (!this.empresaActual) return;
    this.guardando = true;

    const v = this.formulario.getRawValue();

    const actualizarEmpresa$ = this.http.put(
      `${this.API}/company-profiles/${this.empresaActual.id}`,
      {
        user_id:          this.empresaActual.user_id,
        company_name:     v.company_name,
        phone:            v.phone ?? '',
        location:         v.location ?? '',
        website_url:      v.website_url ?? '',
        logo_url:         this.logoUrl || this.empresaActual.logo_url || '',
        cover_image_url:  v.cover_image_url ?? '',
        company_size_id:  this.numOrNull(v.company_size_id),
        industry_id:      this.numOrNull(v.industry_id),
        additional_info_id: this.empresaActual.additional_info_id
      }
    ).pipe(catchError(e => of({ error: true, msg: e })));

    const actualizarInfo$ = this.additionalInfoActual?.id
      ? this.http.put(
          `${this.API}/additional-info/${this.additionalInfoActual.id}`,
          {
            about_company: v.about_company ?? '',
            mission:       v.mission ?? '',
            vision:        v.vision ?? '',
            culture:       v.culture ?? ''
          }
        ).pipe(catchError(e => of({ error: true, msg: e })))
      : of(null);

    const actualizarEmail$ =
      this.usuarioActual?.id && this.usuarioActual.email !== v.email
        ? this.http.patch(
            `${this.API}/users/${this.usuarioActual.id}`,
            { email: v.email }
          ).pipe(catchError(() =>
            this.http.put(
              `${this.API}/users/${this.usuarioActual.id}`,
              { ...this.usuarioActual, email: v.email }
            ).pipe(catchError(e => of({ error: true, msg: e })))
          ))
        : of(null);

    forkJoin({ emp: actualizarEmpresa$, info: actualizarInfo$, usr: actualizarEmail$ }).subscribe({
      next: () => {
        // Actualizar estado local
        this.empresaActual = {
          ...this.empresaActual!,
          company_name:    v.company_name,
          phone:           v.phone,
          location:        v.location,
          website_url:     v.website_url,
          logo_url:        this.logoUrl || this.empresaActual!.logo_url,
          cover_image_url: v.cover_image_url,
          company_size_id: this.numOrNull(v.company_size_id) ?? this.empresaActual!.company_size_id,
          industry_id:     this.numOrNull(v.industry_id)     ?? this.empresaActual!.industry_id
        };
        if (this.additionalInfoActual) {
          this.additionalInfoActual = {
            ...this.additionalInfoActual,
            about_company: v.about_company,
            mission: v.mission,
            vision:  v.vision,
            culture: v.culture
          };
        }
        if (this.usuarioActual) this.usuarioActual.email = v.email;

        // Actualizar iniciales por si cambió el nombre
        this.iniciales = this.getIniciales(v.company_name);

        // Guardar sesión en localStorage
        this.actualizarSesion(v.company_name);

        this.snapshotInicial = this.formulario.getRawValue();
        this.formulario.markAsPristine();
        this.mensajeExito = '¡Perfil actualizado correctamente!';
        this.guardando = false;
        setTimeout(() => this.mensajeExito = '', 4000);
      },
      error: () => {
        this.error = 'No se pudo guardar el perfil. Intenta de nuevo.';
        this.guardando = false;
      }
    });
  }

  cancelarCambios(): void {
    if (!this.snapshotInicial) return;
    this.formulario.reset(this.snapshotInicial);
    this.formulario.markAsPristine();
    this.error = '';
    this.mensajeExito = '';
  }

  // ─── Modal logo ───────────────────────────────────────────────────────────

  abrirModalLogo(): void {
    this.logoUrlInput    = this.logoUrl;
    this.logoPreviewModal = this.logoUrl;
    this.mostrarModalLogo = true;
    document.body.classList.add('modal-open');
  }

  cerrarModalLogo(): void {
    this.mostrarModalLogo = false;
    document.body.classList.remove('modal-open');
  }

  onLogoUrlChange(): void {
    this.logoPreviewModal = this.logoUrlInput.trim();
  }

  guardarLogo(): void {
    const url = this.logoUrlInput.trim();
    if (!url) { this.error = 'Ingresa una URL válida para el logo.'; return; }
    if (!this.empresaActual) return;

    this.http.put(`${this.API}/company-profiles/${this.empresaActual.id}`, {
      user_id:          this.empresaActual.user_id,
      company_name:     this.formulario.get('company_name')?.value ?? this.empresaActual.company_name,
      phone:            this.formulario.get('phone')?.value ?? '',
      location:         this.formulario.get('location')?.value ?? '',
      website_url:      this.formulario.get('website_url')?.value ?? '',
      logo_url:         url,
      cover_image_url:  this.formulario.get('cover_image_url')?.value ?? '',
      company_size_id:  this.numOrNull(this.formulario.get('company_size_id')?.value),
      industry_id:      this.numOrNull(this.formulario.get('industry_id')?.value),
      additional_info_id: this.empresaActual.additional_info_id
    }).subscribe({
      next: () => {
        this.logoUrl = url;
        this.empresaActual!.logo_url = url;
        this.actualizarSesion(this.formulario.get('company_name')?.value ?? this.empresaActual!.company_name);
        this.cerrarModalLogo();
        this.mensajeExito = 'Logo actualizado.';
        setTimeout(() => this.mensajeExito = '', 3000);
      },
      error: () => {
        this.error = 'No se pudo actualizar el logo.';
      }
    });
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────────

  get nombreDisplay(): string {
    return this.formulario?.get('company_name')?.value || this.empresaActual?.company_name || 'Empresa';
  }

  get ubicacionDisplay(): string {
    return this.formulario?.get('location')?.value || this.empresaActual?.location || 'Ubicación no disponible';
  }

  get emailDisplay(): string {
    return this.formulario?.get('email')?.value || this.usuarioActual?.email || '';
  }

  get telefonoDisplay(): string {
    return this.formulario?.get('phone')?.value || this.empresaActual?.phone || '';
  }

  get industriaDisplay(): string {
    const id = this.formulario?.get('industry_id')?.value || this.empresaActual?.industry_id;
    return this.getNombreCatalogo(this.industrias, id, 'industry_name') || 'Sin rubro';
  }

  getNombreIndustria(id: number | undefined): string {
    return this.getNombreCatalogo(this.industrias, id, 'industry_name') || '';
  }

  getNombreTamano(id: number | undefined): string {
    return this.getNombreCatalogo(this.tamanosEmpresa, id, 'company_size_name') || '';
  }

  getEtiquetaIndustria(item: Industry): string {
    return item.industry_name ?? item.name ?? `Opción ${item.id}`;
  }

  getEtiquetaTamano(item: CompanySize): string {
    return item.company_size_name ?? item.company_size ?? item.size_name ?? item.name ?? `Opción ${item.id}`;
  }

  isInvalid(campo: string): boolean {
    const c = this.formulario.get(campo);
    return !!(c?.invalid && c?.touched);
  }

  trackById(_: number, item: { id: number }): number { return item.id; }

  // ─── Privados ─────────────────────────────────────────────────────────────

  private obtenerSesion(): SesionUsuario | null {
    const raw = localStorage.getItem('usuarioLoggeado');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  private actualizarSesion(nuevoNombre: string): void {
    if (!this.sesion) return;
    const actualizada: SesionUsuario = {
      ...this.sesion,
      displayName: nuevoNombre,
      logo_url: this.logoUrl
    };
    localStorage.setItem('usuarioLoggeado', JSON.stringify(actualizada));
    this.sesion = actualizada;
  }

  private get<T>(endpoint: string) {
    return this.http.get<T>(`${this.API}${endpoint}`).pipe(catchError(() => of([])));
  }

  private normalizar<T>(data: any): T[] {
    return Array.isArray(data) ? data : data?.data ?? [];
  }

  private getIniciales(nombre: string): string {
    const p = (nombre ?? '').trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'EM';
  }

  private numOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private getNombreCatalogo(lista: any[], id: any, campo: string): string {
    const item = lista.find(x => Number(x.id) === Number(id));
    if (!item) return '';
    return item[campo] ?? item.name ?? item.label ?? '';
  }

}
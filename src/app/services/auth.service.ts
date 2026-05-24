import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SesionUsuario, UsuarioApi, PerfilCandidato, PerfilEmpresa } from '../models/sesion.model';

const API = 'https://portal-empleo-api-production-481e.up.railway.app';
const STORAGE_KEY = 'usuarioLoggeado';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private http: HttpClient, private router: Router) {}

  // ─── Sesión ───────────────────────────────────────────────────────────────

  getSesion(): SesionUsuario | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SesionUsuario;
    } catch {
      return null;
    }
  }

  estaLogueado(): boolean {
    return this.getSesion() !== null;
  }

  getRol(): string {
    return this.getSesion()?.role_name ?? 'publico';
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<void> {
    const usuario = await this.http
      .get<UsuarioApi>(`${API}/users/email/${encodeURIComponent(email)}`)
      .toPromise();

    if (!usuario) throw new Error('No se encontró una cuenta con ese correo.');
    if (usuario.is_blocked) throw new Error('Tu cuenta está bloqueada.');
    if (usuario.password_hash !== password) throw new Error('Contraseña incorrecta.');

    const sesion = await this.construirSesion(usuario);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    this.redirigirSegunRol(sesion.role_id);
  }

  // ─── Registro Candidato ───────────────────────────────────────────────────

  async registrarCandidato(datos: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
  }): Promise<void> {
    const usuario = await this.http.post<UsuarioApi>(`${API}/users`, {
      email: datos.email,
      password_hash: datos.password,
      external_id: '',
      is_blocked: false,
      role_id: 2
    }).toPromise();

    await this.http.post(`${API}/profiles`, {
      user_id: usuario!.id,
      first_name: datos.nombre,
      last_name: datos.apellido,
      phone: '',
      location: '',
      external_link: 'https://linkedin.com',
      cv_url: 'https://example.com/cv.pdf',
      profile_image_url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12',
      about_me: '',
      professional_title: ''
    }).toPromise();
  }

  // ─── Registro Empresa ─────────────────────────────────────────────────────

  async registrarEmpresa(datos: {
    nombreEmpresa: string;
    email: string;
    password: string;
    contacto: string;
  }): Promise<void> {
    const usuario = await this.http.post<UsuarioApi>(`${API}/users`, {
      email: datos.email,
      password_hash: datos.password,
      external_id: '',
      is_blocked: false,
      role_id: 3
    }).toPromise();

    const info = await this.http.post<{ id: number }>(`${API}/additional-info`, {
      about_company: `Somos ${datos.nombreEmpresa}, una empresa registrada en EmpleaLink.`,
      mission: `Brindar oportunidades laborales y crecimiento profesional desde ${datos.nombreEmpresa}.`,
      vision: `Consolidarnos como una empresa reconocida y atractiva para el talento.`,
      culture: `En ${datos.nombreEmpresa} promovemos colaboración, responsabilidad e innovación.`
    }).toPromise();

    await this.http.post(`${API}/company-profiles`, {
      user_id: usuario!.id,
      company_name: datos.nombreEmpresa,
      phone: '',
      location: '',
      website_url: 'https://example.com',
      logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=400&q=80',
      cover_image_url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
      company_size_id: 1,
      industry_id: 1,
      additional_info_id: info!.id
    }).toPromise();
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  private async construirSesion(usuario: UsuarioApi): Promise<SesionUsuario> {
    const base: Partial<SesionUsuario> = {
      id: usuario.id,
      email: usuario.email,
      role_id: usuario.role_id,
      is_blocked: usuario.is_blocked
    };

    if (Number(usuario.role_id) === 1) {
      return { ...base, role_name: 'admin', displayName: 'Administrador' } as SesionUsuario;
    }

    if (Number(usuario.role_id) === 2) {
      return await this.construirSesionCandidato(base as SesionUsuario);
    }

    if (Number(usuario.role_id) === 3) {
      return await this.construirSesionEmpresa(base as SesionUsuario);
    }

    return { ...base, role_name: 'candidate', displayName: usuario.email } as SesionUsuario;
  }

  private async construirSesionCandidato(base: SesionUsuario): Promise<SesionUsuario> {
    try {
      const resp = await this.http.get<PerfilCandidato[] | { data: PerfilCandidato[] }>(`${API}/profiles`).toPromise();
      const perfiles = Array.isArray(resp) ? resp : (resp as any)?.data ?? [];
      const perfil: PerfilCandidato | undefined = perfiles.find((p: PerfilCandidato) => Number(p.user_id) === Number(base.id));

      return {
        ...base,
        role_name: 'candidate',
        profile_id: perfil?.id ?? null,
        displayName: perfil ? `${perfil.first_name ?? ''} ${perfil.last_name ?? ''}`.trim() : base.email,
        professional_title: perfil?.professional_title ?? '',
        profile_image_url: perfil?.profile_image_url ?? '',
        location: perfil?.location ?? '',
        cv_url: perfil?.cv_url ?? '',
        first_name: perfil?.first_name ?? '',
        last_name: perfil?.last_name ?? ''
      };
    } catch {
      return { ...base, role_name: 'candidate', profile_id: null, displayName: base.email };
    }
  }

  private async construirSesionEmpresa(base: SesionUsuario): Promise<SesionUsuario> {
    try {
      const resp = await this.http.get<PerfilEmpresa[] | { data: PerfilEmpresa[] }>(`${API}/company-profiles`).toPromise();
      const empresas = Array.isArray(resp) ? resp : (resp as any)?.data ?? [];
      const empresa: PerfilEmpresa | undefined = empresas.find((e: PerfilEmpresa) => Number(e.user_id) === Number(base.id));

      return {
        ...base,
        role_name: 'company',
        company_profile_id: empresa?.id ?? null,
        displayName: empresa?.company_name ?? base.email,
        logo_url: empresa?.logo_url ?? ''
      };
    } catch {
      return { ...base, role_name: 'company', company_profile_id: null, displayName: base.email };
    }
  }

  private redirigirSegunRol(roleId: number): void {
    if (Number(roleId) === 1) { this.router.navigate(['/dashboard-admin']); return; }
    if (Number(roleId) === 2) { this.router.navigate(['/dashboard-usuario']); return; }
    if (Number(roleId) === 3) { this.router.navigate(['/dashboard-empresa']); return; }
    this.router.navigate(['/login']);
  }
}

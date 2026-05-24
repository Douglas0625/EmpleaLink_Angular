import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-dashboard-admin',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.css'
})
export class DashboardAdmin implements OnInit {

  // --- Estadísticas ---
  totalUsuarios = 0;
  totalEmpresas = 0;
  totalVacantes = 0;
  totalReportes = 0;

  // --- Resumen portal ---
  vacantesMes = 0;
  empresasActivas = 0;
  usuariosBloqueados = 0;
  comentariosReportados = 0;
  porcentajeVacantes = 0;
  porcentajeEmpresas = 0;
  porcentajeUsuarios = 0;
  porcentajeReportes = 0;

  // --- Tablas ---
  usuariosTabla: any[] = [];
  empresasTabla: any[] = [];
  vacantesTabla: any[] = [];
  reportesPanel: any[] = [];

  // --- Datos originales para bloquear ---
  usuariosOriginales: any[] = [];
  empresasOriginales: any[] = [];

  // --- Formulario publicación ---
  tipoContenido = 'Entrada de Foro';
  categoria = 'OFICIAL';
  titulo = '';
  imagen = '';
  contenido = '';

  categoriasOptions: string[] = ['OFICIAL', 'GENERAL', 'DISCUSIÓN'];

  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.loading = true;
    forkJoin({
      profiles: this.adminService.getProfiles(),
      users: this.adminService.getUsers(),
      companies: this.adminService.getCompanies(),
      jobs: this.adminService.getJobs(),
      reports: this.adminService.getReports(),
      reasons: this.adminService.getReportReasons(),
      actions: this.adminService.getModerationActions()
    }).subscribe({
      next: ({ profiles, users, companies, jobs, reports, reasons, actions }) => {
        const listaProfiles = Array.isArray(profiles) ? profiles : profiles.data || [];
        const listaUsers    = Array.isArray(users)    ? users    : users.data || [];
        const listaCompanies= Array.isArray(companies)? companies: companies.data || [];
        const listaJobs     = Array.isArray(jobs)     ? jobs     : jobs.data || [];
        const listaReports  = Array.isArray(reports)  ? reports  : reports.data || [];
        const listaReasons  = Array.isArray(reasons)  ? reasons  : reasons.data || [];
        const listaActions  = Array.isArray(actions)  ? actions  : actions.data || [];

        // Mapas
        const mapaUsers    = Object.fromEntries(listaUsers.map((u: any) => [u.id, u]));
        const mapaProfiles = Object.fromEntries(listaProfiles.map((p: any) => [p.user_id, p]));
        const mapaReasons  = Object.fromEntries(listaReasons.map((r: any) => [r.id, r.reason_name]));
        const mapaReportToUser = Object.fromEntries(listaActions.map((a: any) => [a.report_id, a.target_user_id]));

        this.usuariosOriginales = listaUsers;
        this.empresasOriginales = listaCompanies;

        // Estadísticas
        const reportesPendientes = listaReports.filter((r: any) => r.status === 'pending');
        this.totalUsuarios = listaUsers.length;
        this.totalEmpresas = listaCompanies.length;
        this.totalVacantes = listaJobs.length;
        this.totalReportes = reportesPendientes.length;

        // Resumen portal
        const ahora = new Date();
        this.vacantesMes = listaJobs.filter((j: any) => {
          const f = new Date(j.created_at);
          return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
        }).length;
        this.empresasActivas = listaCompanies.length;
        this.usuariosBloqueados = listaUsers.filter((u: any) => u.is_blocked).length;
        this.comentariosReportados = reportesPendientes.length;

        this.porcentajeVacantes = Math.min((this.vacantesMes / 50) * 100, 100);
        this.porcentajeEmpresas = Math.min((this.empresasActivas / 50) * 100, 100);
        this.porcentajeUsuarios = Math.min((this.usuariosBloqueados / 50) * 100, 100);
        this.porcentajeReportes = Math.min((reportesPendientes.length / 20) * 100, 100);

        // Tabla usuarios (3 aleatorios)
        this.usuariosTabla = [...listaProfiles]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((p: any) => {
            const u = mapaUsers[p.user_id];
            return {
              userId: p.user_id,
              nombre: `${p.first_name} ${p.last_name}`,
              email: u?.email || 'Sin email',
              estado: u?.is_blocked ? 'Bloqueado' : 'Activo',
              bloqueado: u?.is_blocked,
              fecha: new Date(p.created_at).toLocaleDateString(),
              iniciales: `${p.first_name?.charAt(0)}${p.last_name?.charAt(0)}`
            };
          });

        // Tabla empresas (3 aleatorias)
        this.empresasTabla = [...listaCompanies]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((c: any) => {
            const u = mapaUsers[c.user_id];
            return {
              userId: c.user_id,
              nombre: c.company_name,
              sector: c.industry || 'Sector',
              estado: u?.is_blocked ? 'Bloqueada' : 'Activa',
              bloqueado: u?.is_blocked
            };
          });

        // Tabla vacantes (3 aleatorias)
        this.vacantesTabla = [...listaJobs]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((j: any) => ({
            titulo: j.title,
            inicial: j.title?.charAt(0),
            modalidad: j.modality,
            tipo: j.job_type,
            estado: j.status_id === 2 ? 'Activa' : 'Cerrada',
            activa: j.status_id === 2
          }));

        // Panel reportes (2 pendientes)
        this.reportesPanel = [...reportesPendientes]
          .sort(() => Math.random() - 0.5)
          .slice(0, 2)
          .map((r: any) => {
            const targetUserId = mapaReportToUser[r.id];
            const profile = mapaProfiles[targetUserId];
            const ahora = new Date();
            const diffH = Math.floor((ahora.getTime() - new Date(r.created_at).getTime()) / 3600000);
            return {
              id: r.id,
              tipo: r.comment_id ? 'COMENTARIO' : 'PUBLICACIÓN',
              razon: mapaReasons[r.reason_id] || 'Sin razón',
              nombreUsuario: profile ? `${profile.first_name} ${profile.last_name}` : 'Usuario',
              targetUserId,
              diffHoras: diffH
            };
          });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando dashboard:', err);
        this.loading = false;
      }
    });
  }

  onTipoContenidoChange(): void {
    if (this.tipoContenido === 'Entrada de Foro') {
      this.categoriasOptions = ['OFICIAL', 'GENERAL', 'DISCUSIÓN'];
    } else {
      this.categoriasOptions = ['consejo', 'plantilla', 'guia'];
    }
    this.categoria = this.categoriasOptions[0];
  }

  onSubmitPublicacion(): void {
    const sesion = JSON.parse(localStorage.getItem('usuarioLoggeado') || '{}');
    const userId = sesion?.id;
    if (!userId) { alert('No hay sesión activa'); return; }
    if (!this.titulo || !this.contenido || !this.categoria) {
      alert('Todos los campos son obligatorios'); return;
    }

    const obs = this.tipoContenido === 'Entrada de Foro'
      ? this.adminService.postForumPost({
          user_id: Number(userId),
          title: this.titulo,
          content: this.contenido,
          category: this.categoria
        })
      : this.adminService.postResource({
          user_id: Number(userId),
          title: this.titulo,
          description: this.contenido,
          resource_type: this.categoria,
          url: this.imagen,
          image_url: this.imagen
        });

    obs.subscribe({
      next: () => {
        alert('Publicación creada correctamente');
        this.titulo = ''; this.imagen = ''; this.contenido = '';
      },
      error: () => alert('Error al crear publicación')
    });
  }

  bloquearUsuario(userId: number): void {
    const usuario = this.usuariosOriginales.find(u => u.id == userId);
    if (!usuario) return;
    this.adminService.updateUser(usuario.id, { is_blocked: !usuario.is_blocked }).subscribe({
      next: () => this.cargarDashboard()
    });
  }

  bloquearEmpresa(userId: number): void {
    this.adminService.updateUser(userId, { is_blocked: true }).subscribe({
      next: () => this.cargarDashboard()
    });
  }

  verUsuario(userId: number): void {
    localStorage.setItem('usuarioSeleccionado', String(userId));
    // navegar a perfil candidato cuando ese componente esté listo
  }
}

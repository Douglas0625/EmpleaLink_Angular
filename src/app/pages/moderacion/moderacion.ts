import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-moderacion',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './moderacion.html',
  styleUrl: './moderacion.css'
})
export class Moderacion implements OnInit {

  // Datos crudos
  reportes: any[] = [];
  razones: any[] = [];
  usuarios: any[] = [];
  perfiles: any[] = [];
  empresas: any[] = [];
  acciones: any[] = [];
  comentarios: any[] = [];
  posts: any[] = [];

  // Datos procesados
  reportesFiltrados: any[] = [];

  // Stats
  statPendientes = 0;
  statRevisados = 0;
  statBloqueados = 0;

  // Filtros
  textoBusqueda = '';
  filtroMotivo = 'Todos los tipos';
  filtroEstado = 'Todos los tipos';

  motivosDisponibles: string[] = [];
  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    forkJoin({
      reportes: this.adminService.getReports(),
      razones: this.adminService.getReportReasons(),
      usuarios: this.adminService.getUsers(),
      perfiles: this.adminService.getProfiles(),
      empresas: this.adminService.getCompanies(),
      acciones: this.adminService.getModerationActions(),
      comentarios: this.adminService.getComments(),
      posts: this.adminService.getPosts()
    }).subscribe({
      next: (data) => {
        this.reportes    = this.normalizar(data.reportes);
        this.razones     = this.normalizar(data.razones);
        this.usuarios    = this.normalizar(data.usuarios);
        this.perfiles    = this.normalizar(data.perfiles);
        this.empresas    = this.normalizar(data.empresas);
        this.acciones    = this.normalizar(data.acciones);
        this.comentarios = this.normalizar(data.comentarios);
        this.posts       = this.normalizar(data.posts);

        this.calcularStats();
        this.motivosDisponibles = [...new Set(
          this.razones.map(r => this.obtenerNombreRazon(r)).filter(Boolean)
        )];
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando moderación:', err);
        this.loading = false;
      }
    });
  }

  normalizar(data: any): any[] {
    return Array.isArray(data) ? data : data?.data || [];
  }

  calcularStats(): void {
    this.statPendientes = this.reportes.filter(r => r.status === 'pending').length;
    this.statRevisados  = this.reportes.filter(r => r.status !== 'pending').length;
    this.statBloqueados = this.usuarios.filter(u => u.is_blocked).length;
  }

  aplicarFiltros(): void {
    const texto = this.textoBusqueda.toLowerCase();

    this.reportesFiltrados = this.reportes.filter(reporte => {
      const razon = this.razones.find(r => Number(r.id) === Number(reporte.reason_id));
      const objetivo = this.obtenerObjetivo(reporte);
      const nombreDenunciado  = this.obtenerNombreUsuario(objetivo?.user_id).toLowerCase();
      const nombreDenunciante = this.obtenerNombreUsuario(reporte.reporter_user_id).toLowerCase();
      const nombreMotivo = this.obtenerNombreRazon(razon).toLowerCase();

      const coincideTexto = !texto ||
        nombreDenunciado.includes(texto) ||
        nombreDenunciante.includes(texto) ||
        nombreMotivo.includes(texto) ||
        (objetivo?.contenido || '').toLowerCase().includes(texto) ||
        (reporte.details || '').toLowerCase().includes(texto);

      const coincideMotivo =
        this.filtroMotivo === 'Todos los tipos' ||
        this.obtenerNombreRazon(razon) === this.filtroMotivo;

      const coincideEstado =
        this.filtroEstado === 'Todos los tipos' ||
        (this.filtroEstado === 'Pendientes' && reporte.status === 'pending') ||
        (this.filtroEstado === 'Revisados'  && reporte.status !== 'pending');

      return coincideTexto && coincideMotivo && coincideEstado;
    }).map(reporte => {
      const razon    = this.razones.find(r => Number(r.id) === Number(reporte.reason_id));
      const objetivo = this.obtenerObjetivo(reporte);
      const accion   = this.acciones.find(a => Number(a.report_id) === Number(reporte.id));
      return {
        ...reporte,
        nombreDenunciante: this.obtenerNombreUsuario(reporte.reporter_user_id),
        nombreDenunciado:  this.obtenerNombreUsuario(objetivo?.user_id),
        nombreMotivo:      this.obtenerNombreRazon(razon),
        tipoContenido:     objetivo?.tipo === 'post' ? 'POST' : 'COMENTARIO',
        contenidoReportado: objetivo?.contenido || 'Contenido no encontrado',
        detalleDenuncia:   reporte.details || 'Sin detalle adicional',
        userIdDenunciado:  objetivo?.user_id || null,
        tiempoFormateado:  this.formatearTiempo(reporte.created_at),
        ultimaAccion:      accion?.action_type || null
      };
    });
  }

  obtenerNombreUsuario(userId: any): string {
    if (!userId) return 'Usuario';
    const user = this.usuarios.find(u => Number(u.id) === Number(userId));
    if (!user) return 'Usuario';

    if (Number(user.role_id) === 2) {
      const perfil = this.perfiles.find(p => Number(p.user_id) === Number(userId));
      if (perfil) return `${perfil.first_name || ''} ${perfil.last_name || ''}`.trim() || user.email;
    }
    if (Number(user.role_id) === 3) {
      const empresa = this.empresas.find(e => Number(e.user_id) === Number(userId));
      if (empresa) return empresa.company_name || user.email;
    }
    if (Number(user.role_id) === 1) return 'Administrador';

    return user.email || 'Usuario';
  }

  obtenerNombreRazon(razon: any): string {
    return razon?.reason_name || razon?.name || razon?.reason || razon?.title || razon?.description || 'Sin motivo';
  }

  obtenerObjetivo(reporte: any): any {
    if (reporte.comment_id) {
      const comentario = this.comentarios.find(c => Number(c.id) === Number(reporte.comment_id));
      if (comentario) return { tipo: 'comentario', id: comentario.id, user_id: comentario.user_id, contenido: comentario.content || '' };
    }
    if (reporte.post_id) {
      const post = this.posts.find(p => Number(p.id) === Number(reporte.post_id));
      if (post) return { tipo: 'post', id: post.id, user_id: post.user_id, contenido: post.content || '' };
    }
    return null;
  }

  formatearTiempo(fecha: string): string {
    if (!fecha) return 'SIN FECHA';
    const diff = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / 60000);
    if (diff < 60) return `HACE ${diff} MIN`;
    if (diff < 1440) return `HACE ${Math.floor(diff / 60)} HORAS`;
    return `HACE ${Math.floor(diff / 1440)} DÍAS`;
  }

  bloquearUsuario(userId: number): void {
    if (!userId) { alert('Usuario inválido'); return; }
    this.adminService.updateUser(userId, { is_blocked: true }).subscribe({
      next: () => {
        alert('Usuario bloqueado');
        this.cargarDatos();
      },
      error: () => alert('Error al bloquear usuario')
    });
  }

  descartarReporte(reporteId: number): void {
    this.adminService.deleteReport(reporteId).subscribe({
      next: () => {
        alert('Reporte descartado');
        this.cargarDatos();
      },
      error: () => alert('Error al descartar reporte')
    });
  }
}

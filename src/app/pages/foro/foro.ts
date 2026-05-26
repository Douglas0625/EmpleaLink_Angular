import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../services/admin';

declare var bootstrap: any;

const POSTS_POR_PAGINA = 3;

@Component({
  selector: 'app-foro',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './foro.html',
  styleUrl: './foro.css'
})
export class Foro implements OnInit {

  // Datos
  posts: any[] = [];
  comentarios: any[] = [];
  usuarios: any[] = [];
  perfiles: any[] = [];
  empresas: any[] = [];
  motivosReporte: any[] = [];

  // Posts paginados
  postsPagina: any[] = [];
  paginaActual = 1;
  totalPaginas = 1;
  paginas: number[] = [];

  // Inputs comentarios (por post_id)
  inputsComentario: { [postId: number]: string } = {};

  // Modal responder
  comentarioPadreActivo: number | null = null;
  postActivoRespuesta: number | null = null;
  textoRespuesta = '';

  // Modal reportar
  comentarioReportadoActivo: number | null = null;
  motivoReporteSeleccionado = '';
  detalleReporte = '';

  // Sesion
  sesion: any = null;
  imagenSesion = '';

  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.sesion = this.obtenerSesion();
    this.imagenSesion = this.obtenerImagenSesion();
    this.cargarForo();
  }

  obtenerSesion(): any {
    try {
      const s = localStorage.getItem('usuarioLoggeado');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  obtenerImagenSesion(): string {
    if (!this.sesion) return 'https://ui-avatars.com/api/?name=Invitado&background=random';
    const nombre = this.sesion.displayName ||
      `${this.sesion.first_name || ''} ${this.sesion.last_name || ''}`.trim() ||
      this.sesion.email || 'Usuario';
    return this.sesion.profile_image_url || this.sesion.logo_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;
  }

  cargarForo(): void {
    this.loading = true;
    forkJoin({
      posts: this.adminService.getPosts(),
      comentarios: this.adminService.getComments(),
      usuarios: this.adminService.getUsers(),
      perfiles: this.adminService.getProfiles(),
      empresas: this.adminService.getCompanies(),
      motivos: this.adminService.getReportReasons()
    }).subscribe({
      next: (data) => {
        this.comentarios = this.normalizar(data.comentarios);
        this.usuarios    = this.normalizar(data.usuarios);
        this.perfiles    = this.normalizar(data.perfiles);
        this.empresas    = this.normalizar(data.empresas);
        this.motivosReporte = this.normalizar(data.motivos);

        this.posts = this.normalizar(data.posts)
          .filter((p: any) => p.is_hidden !== true)
          .sort((a: any, b: any) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          );

        this.totalPaginas = Math.ceil(this.posts.length / POSTS_POR_PAGINA);
        this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
        this.actualizarPagina();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando foro:', err);
        this.loading = false;
      }
    });
  }

  normalizar(data: any): any[] {
    return Array.isArray(data) ? data : data?.data || [];
  }

  actualizarPagina(): void {
    const inicio = (this.paginaActual - 1) * POSTS_POR_PAGINA;
    this.postsPagina = this.posts.slice(inicio, inicio + POSTS_POR_PAGINA).map(post => ({
      ...post,
      comentariosPadre: this.obtenerComentariosPadre(post.id),
      totalComentarios: this.obtenerComentariosPost(post.id).length,
      nombreAutor: this.obtenerNombreAutorPost(post),
      rolAutor: this.obtenerRolAutorPost(post),
      imagenAutor: this.obtenerImagenAutorPost(post),
      esOficial: this.esPostOficial(post),
      tiempoFormateado: this.formatearTiempo(post.created_at)
    }));
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || pagina === this.paginaActual) return;
    this.paginaActual = pagina;
    this.actualizarPagina();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- COMENTARIOS ----

  obtenerComentariosPost(postId: number): any[] {
    return this.comentarios.filter(c =>
      Number(c.post_id) === Number(postId) && c.is_hidden !== true
    );
  }

  obtenerComentariosPadre(postId: number): any[] {
    return this.obtenerComentariosPost(postId)
      .filter(c => !c.parent_comment_id)
      .map(c => ({
        ...c,
        autorInfo: this.obtenerInfoAutorComentario(c),
        tiempoFormateado: this.formatearTiempo(c.created_at),
        respuestas: this.obtenerRespuestas(c.id).map(r => ({
          ...r,
          autorInfo: this.obtenerInfoAutorComentario(r),
          tiempoFormateado: this.formatearTiempo(r.created_at)
        }))
      }));
  }

  obtenerRespuestas(comentarioId: number): any[] {
    return this.comentarios.filter(c =>
      Number(c.parent_comment_id) === Number(comentarioId)
    );
  }

  publicarComentario(postId: number): void {
    if (!this.sesion) { alert('Debes iniciar sesión para comentar.'); return; }
    const texto = (this.inputsComentario[postId] || '').trim();
    if (!texto) return;

    this.adminService.postComment({
      post_id: postId,
      user_id: this.sesion.id,
      content: texto,
      parent_comment_id: null
    }).subscribe({
      next: () => {
        this.inputsComentario[postId] = '';
        this.recargarComentarios();
      },
      error: () => alert('No se pudo publicar el comentario.')
    });
  }

  // ---- MODAL RESPONDER ----

  abrirModalResponder(postId: number, comentarioId: number): void {
    this.postActivoRespuesta = postId;
    this.comentarioPadreActivo = comentarioId;
    this.textoRespuesta = '';
    const modal = new bootstrap.Modal(document.getElementById('modalResponder'));
    modal.show();
  }

  publicarRespuesta(): void {
    if (!this.sesion) { alert('Debes iniciar sesión para responder.'); return; }
    if (!this.comentarioPadreActivo || !this.postActivoRespuesta) return;
    const texto = this.textoRespuesta.trim();
    if (!texto) return;

    this.adminService.postComment({
      post_id: this.postActivoRespuesta,
      user_id: this.sesion.id,
      content: texto,
      parent_comment_id: this.comentarioPadreActivo
    }).subscribe({
      next: () => {
        this.textoRespuesta = '';
        bootstrap.Modal.getInstance(document.getElementById('modalResponder'))?.hide();
        this.comentarioPadreActivo = null;
        this.postActivoRespuesta = null;
        this.recargarComentarios();
      },
      error: () => alert('No se pudo publicar la respuesta.')
    });
  }

  // ---- MODAL REPORTAR ----

  abrirModalReportar(comentarioId: number): void {
    this.comentarioReportadoActivo = comentarioId;
    this.motivoReporteSeleccionado = '';
    this.detalleReporte = '';
    const modal = new bootstrap.Modal(document.getElementById('modalReportarComentario'));
    modal.show();
  }

  enviarReporte(): void {
    if (!this.sesion) { alert('Debes iniciar sesión para reportar.'); return; }
    if (!this.comentarioReportadoActivo) { alert('No se encontró el comentario.'); return; }
    if (!this.motivoReporteSeleccionado) { alert('Selecciona un motivo.'); return; }

    this.adminService.postReport({
      reporter_user_id: this.sesion.id,
      post_id: null,
      comment_id: this.comentarioReportadoActivo,
      reason_id: Number(this.motivoReporteSeleccionado),
      details: this.detalleReporte
    }).subscribe({
      next: () => {
        bootstrap.Modal.getInstance(document.getElementById('modalReportarComentario'))?.hide();
        this.comentarioReportadoActivo = null;
        this.motivoReporteSeleccionado = '';
        this.detalleReporte = '';
        alert('Reporte enviado correctamente.');
      },
      error: () => alert('No se pudo enviar el reporte.')
    });
  }

  recargarComentarios(): void {
    this.adminService.getComments().subscribe({
      next: (data) => {
        this.comentarios = this.normalizar(data);
        this.actualizarPagina();
      }
    });
  }

  // ---- HELPERS AUTOR ----

  obtenerNombreAutorPost(post: any): string {
    return post.author_name || post.user_name || post.created_by_name || 'Admin EmpleaLink';
  }

  obtenerRolAutorPost(post: any): string {
    if (this.esPostOficial(post)) return 'Administrador';
    if (post.role_name === 'company' || post.author_role === 'company') return 'Empresa';
    if (post.role_name === 'candidate' || post.author_role === 'candidate') return 'Candidato';
    return 'Miembro';
  }

  obtenerImagenAutorPost(post: any): string {
    const nombre = this.obtenerNombreAutorPost(post);
    return post.author_image_url || post.profile_image_url || post.logo_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`;
  }

  esPostOficial(post: any): boolean {
    return Boolean(post.is_official || post.category === 'OFICIAL' ||
      post.role_name === 'admin' || post.author_role === 'admin');
  }

  obtenerInfoAutorComentario(comentario: any): any {
    const userId = Number(comentario.user_id);
    const usuario = this.usuarios.find(u => Number(u.id) === userId);
    if (!usuario) return { nombre: 'Usuario', imagen: 'https://ui-avatars.com/api/?name=Usuario&background=random', rol: 'Miembro', esAdmin: false };

    const roleId = Number(usuario.role_id);

    if (roleId === 1) return { nombre: 'Admin EmpleaLink', imagen: 'https://ui-avatars.com/api/?name=Admin+EmpleaLink&background=random', rol: 'Administrador', esAdmin: true };

    if (roleId === 2) {
      const perfil = this.perfiles.find(p => Number(p.user_id) === userId);
      const nombre = perfil ? `${perfil.first_name || ''} ${perfil.last_name || ''}`.trim() : usuario.email || 'Candidato';
      return { nombre: nombre || 'Candidato', imagen: perfil?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre || 'Candidato')}&background=random`, rol: perfil?.professional_title || 'Candidato', esAdmin: false };
    }

    if (roleId === 3) {
      const empresa = this.empresas.find(e => Number(e.user_id) === userId);
      const nombre = empresa?.company_name || usuario.email || 'Empresa';
      return { nombre, imagen: empresa?.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`, rol: 'Empresa', esAdmin: false };
    }

    return { nombre: usuario.email || 'Usuario', imagen: `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.email || 'Usuario')}&background=random`, rol: 'Miembro', esAdmin: false };
  }

  obtenerNombreMotivo(motivo: any): string {
    return motivo.name || motivo.reason || motivo.title || motivo.label ||
      motivo.description || motivo.reason_name || motivo.reason_text || `Motivo ${motivo.id}`;
  }

  formatearTiempo(fecha: string): string {
    if (!fecha) return 'Hace un momento';
    const diff = new Date().getTime() - new Date(fecha).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} hora${horas === 1 ? '' : 's'}`;
    if (dias < 7) return `Hace ${dias} día${dias === 1 ? '' : 's'}`;
    return new Date(fecha).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

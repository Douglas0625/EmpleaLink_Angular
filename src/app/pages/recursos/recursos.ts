import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-recursos',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recursos.html',
  styleUrl: './recursos.css'
})
export class Recursos implements OnInit {

  // Datos originales
  recursosOriginales: any[] = [];
  reviewsOriginales: any[] = [];
  empresasOriginales: any[] = [];

  // Datos renderizados
  recursosFiltrados: any[] = [];
  opinionesMostradas: any[] = [];
  rankingMejores: any[] = [];
  rankingPeores: any[] = [];

  // Filtro búsqueda
  textoBusqueda = '';

  // Formulario review
  empresaSeleccionada = '';
  ratingSeleccionado = 0;
  opinionTexto = '';
  mensajeReview = '';
  mensajeError = false;

  sesion: any = null;
  loading = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.sesion = this.obtenerSesion();
    this.cargarPagina();
  }

  obtenerSesion(): any {
    try {
      const s = localStorage.getItem('usuarioLoggeado');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  cargarPagina(): void {
    this.loading = true;
    forkJoin({
      recursos: this.adminService.getResources(),
      reviews: this.adminService.getCompanyReviews(),
      empresas: this.adminService.getCompanies()
    }).subscribe({
      next: (data) => {
        this.recursosOriginales = this.normalizar(data.recursos);
        this.reviewsOriginales  = this.normalizar(data.reviews);
        this.empresasOriginales = this.normalizar(data.empresas);

        this.recursosFiltrados = [...this.recursosOriginales];
        this.procesarOpiniones();
        this.procesarRanking();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando recursos:', err);
        this.loading = false;
      }
    });
  }

  normalizar(data: any): any[] {
    return Array.isArray(data) ? data : data?.data || [];
  }

  // ---- RECURSOS ----

  aplicarFiltros(): void {
    const texto = this.textoBusqueda.toLowerCase();
    this.recursosFiltrados = this.recursosOriginales.filter(r =>
      (r.title || '').toLowerCase().includes(texto) ||
      (r.description || '').toLowerCase().includes(texto)
    );
  }

  obtenerIcono(categoria: string): string {
    const c = (categoria || '').toLowerCase();
    if (c === 'consejo') return 'bi-chat-left-text';
    if (c === 'plantilla') return 'bi-lightning-charge';
    if (c === 'guia') return 'bi-file-earmark-text';
    return 'bi-bullseye';
  }

  obtenerClaseColor(categoria: string): string {
    const c = (categoria || '').toLowerCase();
    if (c === 'consejo') return 'icono-morado';
    if (c === 'plantilla') return 'icono-amarillo';
    if (c === 'guia') return 'icono-verde';
    return 'text-azul';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    return new Date(fecha).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---- OPINIONES ----

  procesarOpiniones(): void {
    this.opinionesMostradas = [...this.reviewsOriginales]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 3)
      .map(review => {
        const empresa = this.empresasOriginales.find(e => Number(e.id) === Number(review.company_profile_id));
        return {
          ...review,
          nombreEmpresa: empresa?.company_name || 'Empresa',
          industria: this.obtenerIndustria(empresa),
          iniciales: this.obtenerIniciales(empresa?.company_name || 'Empresa'),
          rating: Number(review.rating) || 0,
          comentario: review.comment || 'Sin comentario'
        };
      });
  }

  obtenerIndustria(empresa: any): string {
    if (!empresa?.industry_id) return 'Industria no disponible';
    const map: any = { 1: 'Tecnología', 2: 'Educación', 3: 'Salud', 4: 'Finanzas', 5: 'Retail' };
    return map[Number(empresa.industry_id)] || 'Industria no disponible';
  }

  obtenerIniciales(texto: string): string {
    const palabras = (texto || '').trim().split(' ');
    return ((palabras[0]?.charAt(0) || '') + (palabras[1]?.charAt(0) || '')).toUpperCase();
  }

  // ---- RANKING ----

  procesarRanking(): void {
    const mapa = new Map<number, { company_name: string; ratings: number[] }>();

    this.reviewsOriginales.forEach(review => {
      const companyId = Number(review.company_profile_id);
      const empresa = this.empresasOriginales.find(e => Number(e.id) === companyId);
      if (!empresa) return;

      if (!mapa.has(companyId)) {
        mapa.set(companyId, { company_name: empresa.company_name, ratings: [] });
      }
      mapa.get(companyId)!.ratings.push(Number(review.rating) || 0);
    });

    const ranking = [...mapa.values()].map(item => ({
      company_name: item.company_name,
      promedio: item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length
    })).sort((a, b) => b.promedio - a.promedio);

    this.rankingMejores = ranking.slice(0, 4);
    this.rankingPeores  = [...ranking].sort((a, b) => a.promedio - b.promedio).slice(0, 3);
  }

  anchoBarraPct(promedio: number): string {
    return `${promedio * 20}%`;
  }

  // ---- FORMULARIO REVIEW ----

  enviarReview(): void {
    this.mensajeReview = '';

    if (!this.sesion) {
      this.mostrarMensaje('Debes iniciar sesión para dejar una valoración.', true); return;
    }
    if (this.sesion.role_name !== 'candidate') {
      this.mostrarMensaje('Solo los candidatos pueden dejar valoraciones.', true); return;
    }
    if (!this.sesion.profile_id) {
      this.mostrarMensaje('No se encontró tu perfil.', true); return;
    }
    if (!this.empresaSeleccionada) {
      this.mostrarMensaje('Selecciona una empresa.', true); return;
    }
    if (!this.ratingSeleccionado) {
      this.mostrarMensaje('Selecciona una puntuación.', true); return;
    }
    if (!this.opinionTexto.trim()) {
      this.mostrarMensaje('Escribe tu opinión.', true); return;
    }

    this.adminService.postCompanyReview({
      profile_id: this.sesion.profile_id,
      company_profile_id: Number(this.empresaSeleccionada),
      rating: this.ratingSeleccionado,
      comment: this.opinionTexto.trim()
    }).subscribe({
      next: () => {
        this.mostrarMensaje('Valoración enviada con éxito.', false);
        this.empresaSeleccionada = '';
        this.ratingSeleccionado = 0;
        this.opinionTexto = '';
        this.cargarPagina();
      },
      error: () => this.mostrarMensaje('No se pudo enviar la valoración.', true)
    });
  }

  mostrarMensaje(texto: string, esError: boolean): void {
    this.mensajeReview = texto;
    this.mensajeError = esError;
  }
}
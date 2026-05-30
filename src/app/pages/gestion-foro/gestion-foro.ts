import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, firstValueFrom } from 'rxjs';

// ──────────────────────────────────────────────────────────────────────────────
// CAMBIOS RESPECTO AL ORIGINAL
//
//  1. Se eliminó `ChangeDetectorRef` — ya no hace falta llamar detectChanges()
//     manualmente porque ahora todo corre dentro de Zone.js.
//
//  2. Se importó `NgZone` — se usa en `cargarDatos()` para garantizar que las
//     asignaciones de `loading`, `postsForo` y `postsRecurso` siempre corran
//     dentro de la zona de Angular, sin importar desde dónde se llame el método.
//
//  3. Se eliminó `fetch()` nativo de `guardarRecurso()` y `patchOPut()`.
//     `fetch` es una API del browser que Zone.js parchea al arrancar, PERO si
//     se llama desde dentro de un `async/await` que ya salió de la zona (cosa
//     que ocurría aquí), el callback resuelto queda fuera de zona y Angular no
//     detecta los cambios posteriores. Reemplazar por `HttpClient` (que siempre
//     corre en zona) elimina el problema de raíz.
//
//  4. Se reemplazó `.toPromise()` (deprecated) por `firstValueFrom()` de rxjs.
//
//  5. `guardarForo()` y `guardarRecurso()` ahora son métodos síncronos que
//     devuelven `void`; la lógica async vive en métodos privados separados para
//     mantener la legibilidad sin romper el contexto de zona.
//
//  6. Se eliminó el bloque de depuración del finally (console.logs y
//     cdr.detectChanges) — ya no son necesarios.
//
//  7. Se eliminó el párrafo de depuración del HTML:
//        <p>guardando={{guardando}} | modoEdicion={{modoEdicion}} | loading={{loading}}</p>
// ──────────────────────────────────────────────────────────────────────────────

const API = 'https://portal-empleo-api-production-481e.up.railway.app';

interface PostVista {
  id: number;
  titulo: string;
  contenido: string;
  categoria: string;
  fecha: string;
  tipo: 'foro' | 'recurso';
  imagen?: string;
  recursoTipo?: string;
  url?: string;
  created_at?: string;
}

@Component({
  selector: 'app-gestion-foro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestion-foro.html',
  styleUrl: './gestion-foro.css'
})
export class GestionForo implements OnInit {

  sesion: any = null;
  tabActiva: 'foro' | 'recurso' = 'foro';

  // Listas
  postsForo:    PostVista[] = [];
  postsRecurso: PostVista[] = [];

  // Formulario crear/editar
  modoEdicion   = false;
  editandoId    = 0;
  editandoTipo: 'foro' | 'recurso' = 'foro';

  // Campos foro
  fTitulo    = '';
  fContenido = '';
  fCategoria = 'OFICIAL';
  fImagen    = '';
  categoriasForoOps = ['OFICIAL', 'GENERAL', 'DISCUSIÓN'];

  // Campos recurso
  rTitulo      = '';
  rDescripcion = '';
  rTipo        = 'consejo';
  rUrl         = '';
  rImagen      = '';
  categoriasRecursoOps = ['consejo', 'plantilla', 'guia'];

  // Estado
  loading   = true;
  guardando = false;
  mensaje   = '';
  mensajeOk = false;

  // ─── NgZone reemplaza a ChangeDetectorRef ──────────────────────────────────
  // ChangeDetectorRef.detectChanges() solo marca un componente como sucio pero
  // no garantiza que las actualizaciones de los hijos se propaguen. NgZone.run()
  // reingresa a la zona de Angular completa, lo que dispara el ciclo de detección
  // en todo el árbol de componentes, igual que si el evento hubiera venido de
  // un listener de DOM normal.
  constructor(
    private http:   HttpClient,
    private router: Router,
    private zone:   NgZone          // ← reemplaza ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const raw = localStorage.getItem('usuarioLoggeado');
    if (!raw) { this.router.navigate(['/login']); return; }
    this.sesion = JSON.parse(raw);
    if (this.sesion.role_name !== 'admin') { this.router.navigate(['/login']); return; }
    this.cargarDatos();
  }

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  cambiarTab(tab: 'foro' | 'recurso'): void {
    this.tabActiva = tab;
    this.cancelarEdicion();
  }

  // ─── Carga ─────────────────────────────────────────────────────────────────

  cargarDatos(): void {
    // ► PROBLEMA ORIGINAL: cuando cargarDatos() era llamado desde dentro de un
    //   bloque `await` que usó fetch() nativo, el subscribe de forkJoin corría
    //   fuera de la zona de Angular. La asignación `this.loading = false` no
    //   disparaba change detection y el spinner quedaba pegado para siempre.
    //
    // ► SOLUCIÓN: envolver todo el bloque `next` en `this.zone.run()`  garantiza
    //   que Angular detecte los cambios sin importar el contexto del llamador.

    this.loading = true;

    forkJoin({
      posts:    this.http.get<any>(`${API}/forum/posts`),
      recursos: this.http.get<any>(`${API}/resources`)
    }).subscribe({
      next: ({ posts, recursos }) => {

        // zone.run() reingresa explícitamente a la zona de Angular.
        // HttpClient ya lo hace internamente, pero esta capa extra protege
        // ante cualquier contexto de llamada externo (ej.: fetch → then → aquí).
        this.zone.run(() => {
          try {
            const listaForo    = this.norm(posts);
            const listaRecurso = this.norm(recursos);
            const userId       = Number(this.sesion?.id);

            this.postsForo = listaForo
              .filter((p: any) => Number(p.user_id) === userId)
              .sort((a: any, b: any) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime()
              )
              .map((p: any) => ({
                id:        p.id,
                titulo:    p.title    || 'Sin título',
                contenido: p.content  || '',
                categoria: p.category || 'GENERAL',
                fecha:     this.formatFecha(p.created_at),
                tipo:      'foro' as const
              }));

            this.postsRecurso = listaRecurso
              .sort((a: any, b: any) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime()
              )
              .map((r: any) => ({
                id:          r.id,
                titulo:      r.title         || '',
                contenido:   r.description   || '',
                categoria:   r.resource_type || '',
                fecha:       this.formatFecha(r.created_at),
                created_at:  r.created_at,
                url:         r.url           || '',
                tipo:        'recurso' as const,
                imagen:      r.image_url     || '',
                recursoTipo: r.resource_type || ''
              }));

          } catch (e) {
            console.error('ERROR EN MAPEO', e);
          } finally {
            // ► Esta asignación ahora siempre ocurre dentro de la zona → el
            //   spinner desaparece correctamente en todos los escenarios.
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('ERROR CARGANDO DATOS', err);
        this.zone.run(() => { this.loading = false; });
      }
    });
  }

  // ─── Guardar foro ──────────────────────────────────────────────────────────

  guardarForo(): void {
    // ► PROBLEMA ORIGINAL: `patchOPut()` usaba fetch() nativo. Todo el código
    //   que corría después del `await patchOPut(...)` quedaba fuera de la zona
    //   de Angular. Las asignaciones a `mensaje`, `guardando`, etc. no
    //   disparaban change detection.
    //
    // ► SOLUCIÓN: `patchOPut()` ahora usa HttpClient. Este método público sigue
    //   siendo síncrono para que Angular no pierda el contexto del evento de
    //   clic; la lógica async va al método privado `_ejecutarGuardarForo()`.

    this.mensaje = '';

    if (!this.fTitulo.trim() || !this.fContenido.trim()) {
      this.mensaje   = 'Título y contenido son obligatorios.';
      this.mensajeOk = false;
      return;
    }

    this._ejecutarGuardarForo();
  }

  private async _ejecutarGuardarForo(): Promise<void> {
    const payload = {
      user_id:  Number(this.sesion.id),
      title:    this.fTitulo.trim(),
      content:  this.fContenido.trim(),
      category: this.fCategoria
    };

    this.guardando = true;

    try {
      if (this.modoEdicion) {
        // patchOPut ahora usa solo HttpClient → permanece en zona
        await this.patchOPut(`${API}/forum/posts/${this.editandoId}`, payload);
        this.mensaje = 'Entrada actualizada.';
      } else {
        await firstValueFrom(this.http.post(`${API}/forum/posts`, payload));
        this.mensaje = 'Entrada de foro creada.';
      }
      this.mensajeOk = true;
      this.resetForo();
      this.cargarDatos();
    } catch {
      this.mensaje   = 'No se pudo guardar la entrada.';
      this.mensajeOk = false;
    } finally {
      this.guardando = false;
    }
  }

  // ─── Guardar recurso ───────────────────────────────────────────────────────

  guardarRecurso(): void {
    // Mismo patrón que guardarForo(): método público síncrono + privado async.

    if (this.guardando) return;

    this.mensaje = '';

    if (!this.rTitulo.trim() || !this.rDescripcion.trim()) {
      this.mensaje   = 'Título y descripción son obligatorios.';
      this.mensajeOk = false;
      return;
    }

    this._ejecutarGuardarRecurso();
  }

  private async _ejecutarGuardarRecurso(): Promise<void> {
    this.guardando = true;

    const payload = {
      title:         this.rTitulo.trim(),
      description:   this.rDescripcion.trim(),
      resource_type: this.rTipo,
      url:           this.rUrl.trim(),
      image_url:     this.rImagen.trim()
    };

    try {
      if (this.modoEdicion) {
        // ► CAUSA RAÍZ DEL BUG: aquí estaba el fetch() nativo.
        //   fetch() es una API del browser. Zone.js lo parchea al inicio, pero
        //   si la llamada ocurre dentro de un contexto que ya salió de la zona
        //   (como ocurre con algunos flujos async/await), el callback `.then()`
        //   resuelto ejecuta fuera de zona. Todo lo que viene después tampoco
        //   dispara change detection: `this.loading = false` en cargarDatos()
        //   nunca actualiza la vista → spinner infinito.
        //
        // ► SOLUCIÓN: HttpClient.put() siempre corre dentro de NgZone mediante
        //   su propio mecanismo interno. No importa desde dónde se llame.
        await firstValueFrom(
          this.http.put(`${API}/resources/${this.editandoId}`, payload)
        );
        this.mensaje = 'Recurso actualizado correctamente.';
      } else {
        await firstValueFrom(this.http.post(`${API}/resources`, payload));
        this.mensaje = 'Recurso creado correctamente.';
      }

      this.mensajeOk  = true;
      this.modoEdicion = false;
      this.editandoId  = 0;
      this.resetRecurso();
      this.cargarDatos();

    } catch (err) {
      console.error('ERROR RECURSO:', err);
      this.mensaje   = 'No se pudo guardar el recurso.';
      this.mensajeOk = false;
    } finally {
      // ► Ya no se necesita cdr.detectChanges() porque HttpClient garantiza
      //   que todo corre en zona. El finally se mantiene limpio.
      this.guardando = false;
    }
  }

  // ─── Editar ────────────────────────────────────────────────────────────────

  editarForo(post: PostVista): void {
    this.modoEdicion  = true;
    this.editandoId   = post.id;
    this.editandoTipo = 'foro';
    this.fTitulo      = post.titulo;
    this.fContenido   = post.contenido;
    this.fCategoria   = post.categoria;
    this.mensaje      = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editarRecurso(post: any): void {
    this.modoEdicion  = true;
    this.editandoId   = post.id;
    this.editandoTipo = 'recurso';
    this.rTitulo      = post.titulo;
    this.rDescripcion = post.contenido;
    this.rTipo        = post.categoria;
    this.rImagen      = post.imagen || '';
    this.rUrl         = post.url    || '';
    this.mensaje      = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion(): void {
    this.modoEdicion = false;
    this.editandoId  = 0;
    this.mensaje     = '';
    this.resetForo();
    this.resetRecurso();
  }

  // ─── Eliminar ──────────────────────────────────────────────────────────────

  async eliminarForo(id: number): Promise<void> {
    if (!confirm('¿Eliminar esta entrada del foro?')) return;
    try {
      await firstValueFrom(this.http.delete(`${API}/forum/posts/${id}`));
      this.postsForo = this.postsForo.filter(p => p.id !== id);
    } catch {
      alert('No se pudo eliminar la entrada.');
    }
  }

  async eliminarRecurso(id: number): Promise<void> {
    if (!confirm('¿Eliminar este recurso?')) return;
    try {
      await firstValueFrom(this.http.delete(`${API}/resources/${id}`));
      this.cargarDatos();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el recurso.');
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private resetForo(): void {
    this.fTitulo    = '';
    this.fContenido = '';
    this.fCategoria = 'OFICIAL';
    this.fImagen    = '';
    this.modoEdicion = false;
    this.editandoId  = 0;
  }

  private resetRecurso(): void {
    this.rTitulo     = '';
    this.rDescripcion = '';
    this.rTipo       = 'consejo';
    this.rUrl        = '';
    this.rImagen     = '';
    this.modoEdicion = false;
    this.editandoId  = 0;
  }

  // ► ANTES: usaba fetch() dos veces (PATCH → PUT como fallback), ambas fuera
  //   de zona. AHORA: usa HttpClient.patch() con fallback a HttpClient.put().
  //   Si el servidor devuelve 4xx/5xx, HttpClient lanza un error de RxJS que
  //   se captura en el catch del llamador. No se necesita lógica extra.
  private async patchOPut(url: string, payload: any): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(url, payload));
    } catch {
      // Si PATCH falla (ej.: 405 Method Not Allowed), intentar PUT
      await firstValueFrom(this.http.put(url, payload));
    }
  }

  private norm(data: any): any[] {
    return Array.isArray(data) ? data : data?.data || [];
  }

  private formatFecha(f: string): string {
    if (!f) return '';
    const d = new Date(f);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
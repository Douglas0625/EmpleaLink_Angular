import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OfertasService {
  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las ofertas de trabajo
   */
  getOfertas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-posts`)
      .pipe(
        catchError(err => {
          console.error('Error fetching job posts:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene una oferta específica por ID
   */
  getOfertaById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/job-posts/${id}`)
      .pipe(
        catchError(err => {
          console.error('Error fetching job post:', err);
          return of(null);
        })
      );
  }

  /**
   * Crea una nueva oferta
   */
  crearOferta(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/job-posts`, data)
      .pipe(
        catchError(err => {
          console.error('Error creating job post:', err);
          return of(null);
        })
      );
  }

  /**
   * Actualiza una oferta existente
   */
  actualizarOferta(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/job-posts/${id}`, data)
      .pipe(
        catchError(err => {
          console.error('Error updating job post:', err);
          return of(null);
        })
      );
  }

  /**
   * Elimina una oferta
   */
  eliminarOferta(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/job-posts/${id}`)
      .pipe(
        catchError(err => {
          console.error('Error deleting job post:', err);
          return of(null);
        })
      );
  }

  /**
   * Obtiene los candidatos (aplicaciones) de una vacante específica
   */
  getCandidatosDeVacante(jobPostId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-posts/${jobPostId}/applications`)
      .pipe(
        catchError(err => {
          console.error('Error fetching candidates:', err);
          return of([]);
        })
      );
  }
}
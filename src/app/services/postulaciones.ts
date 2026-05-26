import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PostulacionesService {
  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las aplicaciones
   */
  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/applications`)
      .pipe(
        catchError(err => {
          console.error('Error fetching applications:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene una aplicación específica por ID
   */
  getApplicationById(applicationId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/applications/${applicationId}`)
      .pipe(
        catchError(err => {
          console.error('Error fetching application:', err);
          return of(null);
        })
      );
  }

  /**
   * Obtiene todas las aplicaciones para una oferta
   */
  getApplicationsByJobPost(jobPostId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-posts/${jobPostId}/applications`)
      .pipe(
        catchError(err => {
          console.error('Error fetching applications:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene todas las ofertas de trabajo
   */
  getJobPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-posts`)
      .pipe(
        catchError(err => {
          console.error('Error fetching job posts:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene todos los perfiles de empresa
   */
  getCompanyProfiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/company-profiles`)
      .pipe(
        catchError(err => {
          console.error('Error fetching company profiles:', err);
          return of([]);
        })
      );
  }

  /**
   * Actualiza el estado de una aplicación
   */
  updateApplicationStatus(applicationId: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/applications/${applicationId}/status`, { status })
      .pipe(
        catchError(err => {
          console.error('Error updating application status:', err);
          return of(null);
        })
      );
  }
}


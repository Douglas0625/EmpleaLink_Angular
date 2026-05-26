import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el perfil de un usuario
   */
  getUserProfile(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}`)
      .pipe(
        catchError(err => {
          console.error('Error fetching user profile:', err);
          return of(null);
        })
      );
  }

  /**
   * Obtiene todas las aplicaciones del usuario
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
   * Obtiene todas las ofertas (trabajos)
   */
  getJobs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-posts`)
      .pipe(
        catchError(err => {
          console.error('Error fetching jobs:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene todos los usuarios
   */
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`)
      .pipe(
        catchError(err => {
          console.error('Error fetching users:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene trabajos guardados del usuario
   */
  getSavedJobs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/saved-jobs`)
      .pipe(
        catchError(err => {
          console.error('Error fetching saved jobs:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene posts del foro
   */
  getPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/forum-posts`)
      .pipe(
        catchError(err => {
          console.error('Error fetching posts:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene comentarios del foro
   */
  getComments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/forum-comments`)
      .pipe(
        catchError(err => {
          console.error('Error fetching comments:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene todas las empresas
   */
  getCompanies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/company-profiles`)
      .pipe(
        catchError(err => {
          console.error('Error fetching companies:', err);
          return of([]);
        })
      );
  }
  getUsers(): Observable<any> {
    return this.http.get(`${API_URL}/users`);
  }
  getProfiles(): Observable<any> {
    return this.http.get(`${API_URL}/profiles`);
  }
  getWorkExperiences(): Observable<any> {
    return this.http.get(`${API_URL}/work-experiences`);
  }
  getEducation(): Observable<any> {
    return this.http.get(`${API_URL}/educational-info`);
  }
  getDegrees(): Observable<any> {
    return this.http.get(`${API_URL}/degrees`);
  }
  getSkills(): Observable<any> {
    return this.http.get(`${API_URL}/skills`);
  }
  getProfileSkills(): Observable<any> {
    return this.http.get(`${API_URL}/profile-skills`);
  }
  getJobAlerts(): Observable<any> {
    return this.http.get(`${API_URL}/job-alerts`);
  }
  updateUser(userId: number, data: any): Observable<any> {
    return this.http.put(`${API_URL}/users/${userId}`, data);
  }
  updateProfile(profileId: number, data: any): Observable<any> {
    return this.http.put(`${API_URL}/profiles/${profileId}`, data);
  }
  postWorkExperience(data: any): Observable<any> {
    return this.http.post(`${API_URL}/work-experiences`, data);
  }
  postEducation(data: any): Observable<any> {
    return this.http.post(`${API_URL}/educational-info`, data);
  }
  postProfileSkill(data: any): Observable<any> {
    return this.http.post(`${API_URL}/profile-skills`, data);
  }
  postJobAlert(data: any): Observable<any> {
    return this.http.post(`${API_URL}/job-alerts`, data);
  }
  updateJobAlert(alertId: number, data: any): Observable<any> {
    return this.http.put(`${API_URL}/job-alerts/${alertId}`, data);
  }
}

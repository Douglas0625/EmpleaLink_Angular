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
}

import { Observable } from 'rxjs';

const API_URL = 'https://portal-empleo-api-production-481e.up.railway.app';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  constructor(private http: HttpClient) {}

  getApplications(): Observable<any> {
    return this.http.get(`${API_URL}/applications`);
  }
  getJobs(): Observable<any> {
    return this.http.get(`${API_URL}/job-posts`);
  }
  getCompanies(): Observable<any> {
    return this.http.get(`${API_URL}/company-profiles`);
  }
  getSavedJobs(): Observable<any> {
    return this.http.get(`${API_URL}/saved-jobs`);
  }
  getPosts(): Observable<any> {
    return this.http.get(`${API_URL}/forum/posts`);
  }
  getComments(): Observable<any> {
    return this.http.get(`${API_URL}/forum/comments`);
  }
}

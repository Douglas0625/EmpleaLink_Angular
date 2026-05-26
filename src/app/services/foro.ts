import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class Foro {
  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los posts del foro
   */
  getForumPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/forum/posts`)
      .pipe(
        catchError(err => {
          console.error('Error fetching forum posts:', err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene un post específico del foro
   */
  getForumPostById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/forum/posts/${id}`)
      .pipe(
        catchError(err => {
          console.error('Error fetching forum post:', err);
          return of(null);
        })
      );
  }

  /**
   * Obtiene posts del foro por categoría
   */
  getForumPostsByCategory(category: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/forum/posts/category/${category}`)
      .pipe(
        catchError(err => {
          console.error('Error fetching forum posts by category:', err);
          return of([]);
        })
      );
  }

  /**
   * Crea un nuevo post en el foro
   */
  createForumPost(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/forum/posts`, data)
      .pipe(
        catchError(err => {
          console.error('Error creating forum post:', err);
          return of(null);
        })
      );
  }

  /**
   * Actualiza un post del foro
   */
  updateForumPost(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/forum/posts/${id}`, data)
      .pipe(
        catchError(err => {
          console.error('Error updating forum post:', err);
          return of(null);
        })
      );
  }

  /**
   * Obtiene comentarios de un post del foro
   */
  getForumComments(postId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/forum/posts/${postId}/comments`)
      .pipe(
        catchError(err => {
          console.error('Error fetching forum comments:', err);
          return of([]);
        })
      );
  }
}

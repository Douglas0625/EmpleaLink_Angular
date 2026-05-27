import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el perfil completo de un usuario incluyendo experiencia, habilidades y educación
   */
  getUserProfile(userId: string): Observable<any> {
    console.log(`[UsuarioService] Fetching profile for user: ${userId}`);
    
    return this.http.get(`${this.apiUrl}/users/${userId}/profile`)
      .pipe(
        switchMap((profile: any) => {
          console.log(`[UsuarioService] Profile received for user ${userId}:`, profile);
          
          // Obtener el ID del perfil - puede estar en profile.id o en la respuesta raíz
          const profileId = profile?.id || profile?.profile_id || userId;
          console.log(`[UsuarioService] Using profileId: ${profileId}`);
          
          if (!profileId) {
            console.warn(`[UsuarioService] No profileId found, returning base profile`);
            return of(profile);
          }
          
          // Obtener experiencia laboral, habilidades e información educativa del perfil
          console.log(`[UsuarioService] Fetching related data (experience, skills, education) for profileId: ${profileId}`);
          
          return forkJoin({
            profile: of(profile),
            workExperiences: this.getProfileWorkExperiences(profileId),
            skills: this.getProfileSkills(profileId),
            educationalInfo: this.getProfileEducationalInfo(profileId)
          }).pipe(
            switchMap(result => {
              console.log(`[UsuarioService] All related data loaded:`, {
                profileId,
                workExperiencesCount: result.workExperiences.length,
                skillsCount: result.skills.length,
                educationalInfoCount: result.educationalInfo.length
              });
              
              return of({
                ...result.profile,
                experience: result.workExperiences,
                skills: result.skills,
                education: result.educationalInfo
              });
            }),
            catchError(err => {
              console.error(`[UsuarioService] Error loading related profile data for ${profileId}:`, err);
              // Si falla al cargar datos relacionados, devolver al menos el perfil base
              console.warn(`[UsuarioService] Returning base profile without related data`);
              return of(profile);
            })
          );
        }),
        catchError(err => {
          console.error(`[UsuarioService] Error fetching user profile for ${userId}:`, {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            url: err.url
          });
          return of(null);
        })
      );
  }

  /**
   * Obtiene las experiencias laborales de un perfil
   */
  private getProfileWorkExperiences(profileId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/profiles/${profileId}/work-experiences`)
      .pipe(
        catchError(err => {
          console.error(`[UsuarioService] Error fetching work experiences for profile ${profileId}:`, err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene las habilidades de un perfil
   */
  private getProfileSkills(profileId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/profiles/${profileId}/skills`)
      .pipe(
        catchError(err => {
          console.error(`[UsuarioService] Error fetching skills for profile ${profileId}:`, err);
          return of([]);
        })
      );
  }

  /**
   * Obtiene la información educativa de un perfil
   */
  private getProfileEducationalInfo(profileId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/profiles/${profileId}/educational-info`)
      .pipe(
        catchError(err => {
          console.error(`[UsuarioService] Error fetching educational info for profile ${profileId}:`, err);
          return of([]);
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
}

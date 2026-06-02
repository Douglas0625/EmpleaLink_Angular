import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class EmpresaService {
  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  constructor(private http: HttpClient) {}

  getCompanyProfile(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/company-profile`)
      .pipe(
        catchError(err => {
          console.error('Error fetching company profile:', err);
          return of(null);
        })
      );
  }

  getJobPostsByCompany(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/companies/${companyId}/job-posts`)
      .pipe(
        catchError(err => {
          console.error('Error fetching job posts:', err);
          return of([]);
        })
      );
  }

  
  getJobPostStats(companyId: string): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/companies/${companyId}/job-posts`)
      .pipe(
        map(jobPosts => {
          const activas = jobPosts.filter((jp: any) => jp.status?.name?.toLowerCase() === 'active' || jp.is_active).length;
          const cerradas = jobPosts.filter((jp: any) => jp.status?.name?.toLowerCase() === 'closed' || !jp.is_active).length;
          const totalPostulantes = jobPosts.reduce((sum: number, jp: any) => sum + (jp.applications_count || 0), 0);
          
          return {
            vacantesActivas: activas,
            vacantesCerradas: cerradas,
            totalPostulantes: totalPostulantes,
            entrevistas: Math.floor(totalPostulantes * 0.3) // Estimación: 30% de postulantes
          };
        }),
        catchError(err => {
          console.error('Error calculating stats:', err);
          return of({
            vacantesActivas: 0,
            vacantesCerradas: 0,
            totalPostulantes: 0,
            entrevistas: 0
          });
        })
      );
  }

  
  getApplicationsByCompany(jobPostId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-posts/${jobPostId}/applications`)
      .pipe(
        catchError(err => {
          console.error('Error fetching applications:', err);
          return of([]);
        })
      );
  }


  updateCompanyProfile(userId: string, profileData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/company-profile`, profileData)
      .pipe(
        catchError(err => {
          console.error('Error updating company profile:', err);
          return of(null);
        })
      );
  }
}

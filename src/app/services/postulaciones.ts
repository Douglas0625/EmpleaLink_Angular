import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PostulacionesService {
  private apiUrl = 'https://portal-empleo-api-production-481e.up.railway.app';

  constructor(private http: HttpClient) {}

  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/applications`);
  }

  getJobPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job-posts`);
  }

  getCompanyProfiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/company-profiles`);
  }
}

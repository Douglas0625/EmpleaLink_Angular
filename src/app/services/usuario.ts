import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

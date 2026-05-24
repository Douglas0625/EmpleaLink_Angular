import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'https://portal-empleo-api-production-481e.up.railway.app';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  getProfiles(): Observable<any> {
    return this.http.get(`${API_URL}/profiles`);
  }
  getUsers(): Observable<any> {
    return this.http.get(`${API_URL}/users`);
  }
  getCompanies(): Observable<any> {
    return this.http.get(`${API_URL}/company-profiles`);
  }
  getJobs(): Observable<any> {
    return this.http.get(`${API_URL}/job-posts`);
  }
  getReports(): Observable<any> {
    return this.http.get(`${API_URL}/forum/reports`);
  }
  getReportReasons(): Observable<any> {
    return this.http.get(`${API_URL}/report-reasons`);
  }
  getModerationActions(): Observable<any> {
    return this.http.get(`${API_URL}/moderation/actions`);
  }
  updateUser(userId: number, data: any): Observable<any> {
    return this.http.patch(`${API_URL}/users/${userId}`, data);
  }
  postForumPost(data: any): Observable<any> {
    return this.http.post(`${API_URL}/forum/posts`, data);
  }
  postResource(data: any): Observable<any> {
    return this.http.post(`${API_URL}/resources`, data);
  }
}

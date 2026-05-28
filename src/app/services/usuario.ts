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

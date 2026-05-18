import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OfertasService {

  private apiUrl = 'https://portal-empleo-api-production.up.railway.app/api/ofertas';

  constructor(private http: HttpClient) {}

  getOfertas(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getOfertaById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  crearOferta(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  actualizarOferta(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  eliminarOferta(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
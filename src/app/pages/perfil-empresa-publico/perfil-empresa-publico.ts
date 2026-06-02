import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-perfil-empresa-publico',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './perfil-empresa-publico.html',
  styleUrls: ['./perfil-empresa-publico.css']
})
export class PerfilEmpresaPublico implements OnInit {

  private API = 'https://portal-empleo-api-production-481e.up.railway.app';

  cargando = true;
  error = '';

  empresa: any = null;
  info: any = null;

  industrias: any[] = [];
  tamanos: any[] = [];

  ofertas: any[] = [];

  statVacantes = 0;
  statActivas = 0;
  statPostulantes = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'Empresa no encontrada';
      this.cargando = false;
      return;
    }

    this.cargarEmpresa(Number(id));
  }

  cargarEmpresa(companyId: number): void {

    forkJoin({
      empresas: this.http.get<any>(`${this.API}/company-profiles`),
      adicionales: this.http.get<any>(`${this.API}/additional-info`),
      industrias: this.http.get<any>(`${this.API}/industries`),
      tamanos: this.http.get<any>(`${this.API}/company-sizes`),
      ofertas: this.http.get<any>(`${this.API}/job-posts`),
      aplicaciones: this.http.get<any>(`${this.API}/applications`)
    }).subscribe({

      next: ({
        empresas,
        adicionales,
        industrias,
        tamanos,
        ofertas,
        aplicaciones
      }) => {

        const listaEmpresas = this.normalizar(empresas);
        const listaInfo = this.normalizar(adicionales);
        const listaOfertas = this.normalizar(ofertas);
        const listaApps = this.normalizar(aplicaciones);

        this.industrias = this.normalizar(industrias);
        this.tamanos = this.normalizar(tamanos);

        this.empresa = listaEmpresas.find(
          (e: any) => Number(e.id) === Number(companyId)
        );

        if (!this.empresa) {
          this.error = 'Empresa no encontrada';
          this.cargando = false;
          return;
        }

        this.info = listaInfo.find(
          (i: any) => Number(i.id) === Number(this.empresa.additional_info_id)
        ) ?? null;

        // Fallback: algunos registros relacionan por company_profile_id en lugar de additional_info_id
        if (!this.info) {
          this.info = listaInfo.find(
            (i: any) => Number(i.company_profile_id) === Number(this.empresa.id)
          ) ?? null;
        }

        this.ofertas = listaOfertas.filter(
          (o: any) => Number(o.company_profile_id) === Number(this.empresa.id)
        );

        this.statVacantes = this.ofertas.length;

        this.statActivas = this.ofertas.filter(
          (o: any) => Number(o.status_id) === 2
        ).length;

        const ids = this.ofertas.map((o: any) => Number(o.id));

        this.statPostulantes = listaApps.filter(
          (a: any) => ids.includes(Number(a.job_post_id))
        ).length;

        this.cargando = false;
      },

      error: () => {
        this.error = 'No se pudo cargar la empresa';
        this.cargando = false;
      }

    });

  }

  normalizar(data: any): any[] {
    return Array.isArray(data) ? data : data?.data || [];
  }

  getIndustria(id: number): string {
    const item = this.industrias.find(
      (i: any) => Number(i.id) === Number(id)
    );
    return item?.industry_name || item?.name || item?.nombre || 'Industria';
  }

  getTamano(id: number): string {
    const item = this.tamanos.find(
      (i: any) => Number(i.id) === Number(id)
    );
    return item?.company_size_name || item?.company_size || item?.size_name || item?.name || '';
  }

  getIniciales(nombre: string): string {

    if (!nombre) return 'EM';

    const partes = nombre.trim().split(' ');

    return (
      (partes[0]?.[0] || '') +
      (partes[1]?.[0] || '')
    ).toUpperCase();
  }

}
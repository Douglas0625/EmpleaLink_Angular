import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmpresaService } from '../../services/empresa';
import { OfertasService } from '../../services/ofertas';
import { Foro } from '../../services/foro';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-empresa',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-empresa.html',
  styleUrl: './dashboard-empresa.css',
})
export class DashboardEmpresa implements OnInit {
  // Datos de la empresa
  empresa: any = null;
  cargandoEmpresa = true;

  // Estadísticas
  stats = {
    vacantesActivas: 0,
    totalPostulantes: 0,
    entrevistas: 0,
    vacantesCerradas: 0
  };
  cargandoStats = true;

  // Ofertas
  ofertas: any[] = [];
  cargandoOfertas = true;

  // Forum posts
  forumPosts: any[] = [];
  cargandoForum = true;

  constructor(
    private empresaService: EmpresaService,
    private ofertasService: OfertasService,
    private foroService: Foro,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener ID del usuario desde la sesión
    const sesion = this.authService.getSesion();
    const userId = sesion?.id?.toString() || '1';
    
    this.loadCompanyProfile(userId);
    this.loadStats(userId);
    this.loadOfertas();
    this.loadForumPosts();
  }

  /**
   * Carga el perfil de la empresa
   */
  private loadCompanyProfile(userId: string): void {
    this.cargandoEmpresa = true;
    this.empresaService.getCompanyProfile(userId).subscribe({
      next: (data) => {
        this.empresa = data;
        this.cargandoEmpresa = false;
      },
      error: (error) => {
        console.error('Error loading company profile:', error);
        this.empresa = {
          name: 'TechFlow Solutions',
          logo: 'https://via.placeholder.com/80',
          city: 'Buenos Aires, Argentina',
          website: 'techflowsolutions.com'
        };
        this.cargandoEmpresa = false;
      }
    });
  }

  /**
   * Carga las estadísticas de la empresa
   */
  private loadStats(userId: string): void {
    this.cargandoStats = true;
    // Simulamos obtener el companyId del perfil
    const companyId = '1'; // En un escenario real, vendría del empresaService
    
    this.empresaService.getJobPostStats(companyId).subscribe({
      next: (data) => {
        this.stats = data;
        this.cargandoStats = false;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        // Datos de ejemplo
        this.stats = {
          vacantesActivas: 8,
          totalPostulantes: 456,
          entrevistas: 12,
          vacantesCerradas: 24
        };
        this.cargandoStats = false;
      }
    });
  }

  /**
   * Carga las ofertas de la empresa
   */
  private loadOfertas(): void {
    this.cargandoOfertas = true;
    this.ofertasService.getOfertas().subscribe({
      next: (data) => {
        // Filtrar solo las primeras 3 ofertas de ejemplo
        this.ofertas = data.slice(0, 3);
        this.cargandoOfertas = false;
      },
      error: (error) => {
        console.error('Error loading ofertas:', error);
        // Datos de ejemplo
        this.ofertas = [
          {
            id: 1,
            title: 'Senior Product Designer',
            published_date: new Date('2024-12-12'),
            applications_count: 48
          },
          {
            id: 2,
            title: 'Frontend Developer',
            published_date: new Date('2024-11-10'),
            applications_count: 124
          },
          {
            id: 3,
            title: 'UX Researcher',
            published_date: new Date('2024-02-05'),
            applications_count: 89
          }
        ];
        this.cargandoOfertas = false;
      }
    });
  }

  /**
   * Carga los posts del foro
   */
  private loadForumPosts(): void {
    this.cargandoForum = true;
    this.foroService.getForumPosts().subscribe({
      next: (data) => {
        this.forumPosts = data.slice(0, 2);
        this.cargandoForum = false;
      },
      error: (error) => {
        console.error('Error loading forum posts:', error);
        // Datos de ejemplo
        this.forumPosts = [
          {
            id: 1,
            title: 'Nuevas leyes de teletrabajo en LATAM 2024',
            created_at: new Date('2024-02-15'),
            user: { name: 'Admin Team' }
          },
          {
            id: 2,
            title: 'Feria de Empleo Virtual: Registro Abierto',
            created_at: new Date('2024-02-12'),
            user: { name: 'Recursos Humanos' }
          }
        ];
        this.cargandoForum = false;
      }
    });
  }

  /**
   * Formatea la fecha en formato legible
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return d.toLocaleDateString('es-ES', options);
  }
}

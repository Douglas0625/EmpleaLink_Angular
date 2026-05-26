import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OfertasService } from '../../services/ofertas';
import { AuthService } from '../../services/auth.service';

interface Vacante {
  id: string;
  title: string;
  description: string;
  salary_min: number;
  salary_max: number;
  location: string;
  type: string;
  status: { name: string };
  applications_count: number;
  published_date: string;
}

interface Stats {
  totalOfertas: number;
  ofertasActivas: number;
  ofertasCerradas: number;
  totalPostulantes: number;
}

@Component({
  selector: 'app-gestion-vacantes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './gestion-vacantes.html',
  styleUrl: './gestion-vacantes.css'
})
export class GestionVacantes implements OnInit {
  // Datos
  vacantes: Vacante[] = [];
  vacantesFiltradas: Vacante[] = [];
  stats: Stats = {
    totalOfertas: 0,
    ofertasActivas: 0,
    ofertasCerradas: 0,
    totalPostulantes: 0
  };

  // Filtros
  textoBusqueda = '';
  filtroEstado = 'todos';

  // Estados
  loading = true;
  showFormCrear = false;
  showFormEditar = false;
  ofertaSeleccionada: Vacante | null = null;

  // Formularios
  formCrear: FormGroup;
  formEditar: FormGroup;

  constructor(
    private ofertasService: OfertasService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.formCrear = this.crearFormularioVacante();
    this.formEditar = this.crearFormularioVacante();
  }

  ngOnInit(): void {
    this.cargarVacantes();
  }

  /**
   * Crea un formulario para crear/editar vacantes
   */
  private crearFormularioVacante(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      salary_min: ['', [Validators.required, Validators.min(0)]],
      salary_max: ['', [Validators.required, Validators.min(0)]],
      location: ['remoto', Validators.required],
      type: ['full_time', Validators.required],
      requirements: ['', Validators.required],
      responsibilities: ['', Validators.required],
      experience_level: ['', Validators.required]
    });
  }

  /**
   * Carga las vacantes desde la API
   */
  private cargarVacantes(): void {
    this.loading = true;
    this.ofertasService.getOfertas().subscribe({
      next: (data) => {
        this.vacantes = data;
        this.calcularEstadisticas();
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading vacantes:', err);
        this.vacantes = this.generarDatosEjemplo();
        this.calcularEstadisticas();
        this.aplicarFiltros();
        this.loading = false;
      }
    });
  }

  /**
   * Calcula las estadísticas
   */
  private calcularEstadisticas(): void {
    this.stats.totalOfertas = this.vacantes.length;
    this.stats.ofertasActivas = this.vacantes.filter(v => 
      v.status?.name?.toLowerCase() === 'active' || !v.status?.name
    ).length;
    this.stats.ofertasCerradas = this.vacantes.filter(v => 
      v.status?.name?.toLowerCase() === 'closed'
    ).length;
    this.stats.totalPostulantes = this.vacantes.reduce((sum, v) => 
      sum + (v.applications_count || 0), 0
    );
  }

  /**
   * Aplica filtros a las vacantes
   */
  aplicarFiltros(): void {
    this.vacantesFiltradas = this.vacantes.filter(v => {
      const coincideTexto = !this.textoBusqueda || 
        v.title.toLowerCase().includes(this.textoBusqueda.toLowerCase());
      
      const coincideEstado = this.filtroEstado === 'todos' ||
        (this.filtroEstado === 'activas' && v.status?.name?.toLowerCase() !== 'closed') ||
        (this.filtroEstado === 'cerradas' && v.status?.name?.toLowerCase() === 'closed');
      
      return coincideTexto && coincideEstado;
    });
  }

  /**
   * Abre el formulario para crear vacante
   */
  abrirFormularioCrear(): void {
    this.formCrear.reset({ location: 'remoto', type: 'full_time' });
    this.showFormCrear = true;
  }

  /**
   * Abre el formulario para editar vacante
   */
  abrirFormularioEditar(vacante: Vacante): void {
    this.ofertaSeleccionada = vacante;
    this.formEditar.patchValue({
      title: vacante.title,
      description: vacante.description,
      salary_min: vacante.salary_min,
      salary_max: vacante.salary_max,
      location: vacante.location,
      type: vacante.type
    });
    this.showFormEditar = true;
  }

  /**
   * Envía el formulario para crear vacante
   */
  crearVacante(): void {
    if (this.formCrear.invalid) {
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    const datos = this.formCrear.value;
    this.loading = true;

    this.ofertasService.crearOferta(datos).subscribe({
      next: (response) => {
        alert('Oferta creada exitosamente');
        this.showFormCrear = false;
        this.cargarVacantes();
      },
      error: (err) => {
        console.error('Error creating vacante:', err);
        alert('Error al crear la oferta');
        this.loading = false;
      }
    });
  }

  /**
   * Envía el formulario para editar vacante
   */
  actualizarVacante(): void {
    if (this.formEditar.invalid || !this.ofertaSeleccionada) {
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    const datos = this.formEditar.value;
    const id = parseInt(this.ofertaSeleccionada.id);
    this.loading = true;

    this.ofertasService.actualizarOferta(id, datos).subscribe({
      next: (response) => {
        alert('Oferta actualizada exitosamente');
        this.showFormEditar = false;
        this.cargarVacantes();
      },
      error: (err) => {
        console.error('Error updating vacante:', err);
        alert('Error al actualizar la oferta');
        this.loading = false;
      }
    });
  }

  /**
   * Elimina una vacante
   */
  eliminarVacante(id: string): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta oferta?')) {
      return;
    }

    this.loading = true;
    this.ofertasService.eliminarOferta(parseInt(id)).subscribe({
      next: (response) => {
        alert('Oferta eliminada exitosamente');
        this.cargarVacantes();
      },
      error: (err) => {
        console.error('Error deleting vacante:', err);
        alert('Error al eliminar la oferta');
        this.loading = false;
      }
    });
  }

  /**
   * Formatea la fecha
   */
  formatDate(date: string | Date): string {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return d.toLocaleDateString('es-ES', options);
  }

  /**
   * Cierra los formularios
   */
  cerrarFormulario(): void {
    this.showFormCrear = false;
    this.showFormEditar = false;
    this.ofertaSeleccionada = null;
  }

  /**
   * Genera datos de ejemplo para demostración
   */
  private generarDatosEjemplo(): Vacante[] {
    return [
      {
        id: '1',
        title: 'Senior Product Designer',
        description: 'Buscamos un diseñador con visión estratégica para liderar el diseño de nuestra plataforma principal',
        salary_min: 4500,
        salary_max: 6000,
        location: 'remoto',
        type: 'full_time',
        status: { name: 'active' },
        applications_count: 48,
        published_date: '2024-12-12'
      },
      {
        id: '2',
        title: 'Frontend Developer (React)',
        description: 'Desarrollo de nuevas funcionalidades con Next.js y Tailwind CSS para clientes internacionales',
        salary_min: 3500,
        salary_max: 5000,
        location: 'hibrido',
        type: 'full_time',
        status: { name: 'active' },
        applications_count: 124,
        published_date: '2024-11-10'
      },
      {
        id: '3',
        title: 'UX Researcher',
        description: 'Investigación de usuarios y pruebas de usabilidad para el flujo de checkout',
        salary_min: 3000,
        salary_max: 4200,
        location: 'presencial',
        type: 'full_time',
        status: { name: 'closed' },
        applications_count: 89,
        published_date: '2024-02-05'
      }
    ];
  }

  /**
   * Obtiene el ícono según el estado
   */
  getIconoEstado(vacante: Vacante): string {
    if (vacante.status?.name?.toLowerCase() === 'active') {
      return 'bi-check-circle';
    }
    return 'bi-x-circle';
  }

  /**
   * Obtiene el color según el estado
   */
  getColorEstado(vacante: Vacante): string {
    if (vacante.status?.name?.toLowerCase() === 'active') {
      return 'success';
    }
    return 'danger';
  }
}

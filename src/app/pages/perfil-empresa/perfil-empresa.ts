import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { EmpresaService } from '../../services/empresa';
import { AuthService } from '../../services/auth.service';

interface IndustrySector {
  id: string;
  name: string;
}

interface CompanySize {
  id: string;
  name: string;
}

@Component({
  selector: 'app-perfil-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './perfil-empresa.html',
  styleUrl: './perfil-empresa.css',
})
export class PerfilEmpresa implements OnInit {
  // Datos
  empresa: any = null;
  sectoresIndustriales: IndustrySector[] = [];
  tamanosEmpresa: CompanySize[] = [];

  // Formulario
  formulario: FormGroup;
  cargandoForm = true;
  guardando = false;

  // Estado
  modoEdicion = false;
  camposModificados = false;

  // Estadísticas
  stats = {
    vacantesTotales: 32,
    vacantesActivas: 8,
    postulantes: 1400,
    crecimiento: '+12%'
  };

  // Opciones de tamaño de empresa
  tamanoOpciones = [
    { id: '1', name: '1 - 50 empleados' },
    { id: '2', name: '51 - 250 empleados' },
    { id: '3', name: '251 - 500 empleados' },
    { id: '4', name: '+500 empleados' }
  ];

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private authService: AuthService,
    private router: Router
  ) {
    this.formulario = this.crearFormulario();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Crea el formulario reactivo
   */
  private crearFormulario(): FormGroup {
    return this.fb.group({
      // Información General
      nombreEmpresa: ['', [Validators.required, Validators.minLength(3)]],
      emailCorporativo: ['', [Validators.required, Validators.email]],
      telefono: ['', Validators.required],
      ubicacion: ['', Validators.required],
      rubroSector: ['', Validators.required],
      tamanoEmpresa: ['', Validators.required],
      direccionFisica: ['', Validators.required],

      // Descripción y Cultura
      sobreEmpresa: ['', [Validators.required, Validators.minLength(50)]],
      mision: [''],
      vision: [''],
      culturaYBeneficios: ['']
    });
  }

  /**
   * Carga los datos de la empresa
   */
  private cargarDatos(): void {
    this.cargandoForm = true;
    const sesion = this.authService.getSesion();
    const userId = sesion?.id?.toString() || '1';

    this.empresaService.getCompanyProfile(userId).subscribe({
      next: (data) => {
        this.empresa = data;
        this.formulario.patchValue({
          nombreEmpresa: data?.name || 'TechFlow Solutions',
          emailCorporativo: data?.email || 'contact@techflow.io',
          telefono: data?.phone || '+54 9 11 5555 0123',
          ubicacion: data?.city || 'Buenos Aires, Argentina',
          rubroSector: data?.industry || 'Tecnología e IA',
          tamanoEmpresa: data?.size_id || '2',
          direccionFisica: data?.address || 'Av. del Libertador 1234, CABA',
          sobreEmpresa: data?.description || 'Somos una compañía líder en el desarrollo de soluciones de Inteligencia Artificial...',
          mision: data?.mission || '',
          vision: data?.vision || '',
          culturaYBeneficios: data?.culture || ''
        });
        this.cargandoForm = false;
      },
      error: (err) => {
        console.error('Error loading company profile:', err);
        this.formulario.patchValue({
          nombreEmpresa: 'TechFlow Solutions',
          emailCorporativo: 'contact@techflow.io',
          telefono: '+54 9 11 5555 0123',
          ubicacion: 'Buenos Aires, Argentina',
          rubroSector: 'Tecnología e IA',
          tamanoEmpresa: '2',
          direccionFisica: 'Av. del Libertador 1234, CABA',
          sobreEmpresa: 'Somos una compañía líder en el desarrollo de soluciones de Inteligencia Artificial accesibles a análisis...'
        });
        this.cargandoForm = false;
      }
    });
  }

  /**
   * Habilita o deshabilita el modo edición
   */
  toggleEdicion(): void {
    this.modoEdicion = !this.modoEdicion;
    if (!this.modoEdicion) {
      this.formulario.reset();
      this.cargarDatos();
    }
  }

  /**
   * Detecta cambios en el formulario
   */
  onFormChange(): void {
    this.camposModificados = this.formulario.dirty;
  }

  /**
   * Guarda los cambios del perfil
   */
  guardarCambios(): void {
    if (this.formulario.invalid) {
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    this.guardando = true;
    const datos = this.formulario.value;

    const sesion = this.authService.getSesion();
    const userId = sesion?.id?.toString() || '1';

    // Mapear datos del formulario al formato esperado por la API
    const perfilData = {
      name: datos.nombreEmpresa,
      email: datos.emailCorporativo,
      phone: datos.telefono,
      city: datos.ubicacion,
      industry: datos.rubroSector,
      size_id: datos.tamanoEmpresa,
      address: datos.direccionFisica,
      description: datos.sobreEmpresa,
      mission: datos.mision,
      vision: datos.vision,
      culture: datos.culturaYBeneficios
    };

    this.empresaService.updateCompanyProfile(userId, perfilData).subscribe({
      next: (response) => {
        if (response) {
          alert('Perfil actualizado exitosamente');
          this.modoEdicion = false;
          this.formulario.markAsPristine();
          this.cargarDatos();
        } else {
          throw new Error('No response from API');
        }
      },
      error: (err) => {
        console.error('Error al guardar cambios:', err);
        alert('Error al guardar cambios. Intenta nuevamente.');
        this.guardando = false;
      },
      complete: () => {
        this.guardando = false;
      }
    });
  }

  /**
   * Cancela la edición
   */
  cancelar(): void {
    this.toggleEdicion();
  }

  /**
   * Abre el perfil público en una nueva pestaña
   */
  verPerfilPublico(): void {
    const sesion = this.authService.getSesion();
    const companyId = this.empresa?.id || '1';
    window.open(`/empresa/${companyId}`, '_blank');
  }

  /**
   * Obtiene el nombre de la empresa para display
   */
  get nombreEmpresaDisplay(): string {
    return this.formulario.get('nombreEmpresa')?.value || 'TechFlow Solutions';
  }

  /**
   * Obtiene el tamaño de empresa formateado
   */
  getTamanoFormateado(): string {
    const id = this.formulario.get('tamanoEmpresa')?.value;
    const tamano = this.tamanoOpciones.find(t => t.id === id);
    return tamano?.name || 'No definido';
  }
}


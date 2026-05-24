import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Registro } from './pages/registro/registro';
import { DashboardAdmin } from './pages/dashboard-admin/dashboard-admin';
import { DashboardEmpresa } from './pages/dashboard-empresa/dashboard-empresa';
import { DashboardUsuario } from './pages/dashboard-usuario/dashboard-usuario';
import { OfertasComponent } from './pages/ofertas/ofertas';
import { DetalleOferta } from './pages/detalle-oferta/detalle-oferta';
import { PerfilUsuario } from './pages/perfil-usuario/perfil-usuario';
import { PerfilEmpresa } from './pages/perfil-empresa/perfil-empresa';
import { Postulaciones } from './pages/postulaciones/postulaciones';
import { Foro } from './pages/foro/foro';
import { GestionUsuarios } from './pages/gestion-usuarios/gestion-usuarios';
import { GestionEmpresas } from './pages/gestion-empresas/gestion-empresas';
import { GestionVacantes } from './pages/gestion-vacantes/gestion-vacantes';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'dashboard-admin', component: DashboardAdmin },
  { path: 'dashboard-empresa', component: DashboardEmpresa },
  { path: 'dashboard-usuario', component: DashboardUsuario },
  { path: 'ofertas', component: OfertasComponent },
  { path: 'ofertas/:id', component: DetalleOferta },
  { path: 'perfil-usuario', component: PerfilUsuario },
  { path: 'perfil-empresa', component: PerfilEmpresa },
  { path: 'postulaciones', component: Postulaciones },
  { path: 'foro', component: Foro },
  { path: 'gestion-usuarios', component: GestionUsuarios },
  { path: 'gestion-empresas', component: GestionEmpresas },
  { path: 'gestion-vacantes', component: GestionVacantes },
  { path: '**', redirectTo: 'login' }
];
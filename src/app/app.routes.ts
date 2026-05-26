import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { Registro } from './pages/registro/registro';
import { LandingComponent } from './pages/landing/landing';
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
import { Moderacion } from './pages/moderacion/moderacion';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { empresaGuard } from './guards/empresa-guard';
import { candidatoGuard } from './guards/usuario-guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: Registro },
  { path: 'ofertas', component: OfertasComponent },
  { path: 'ofertas/:id', component: DetalleOferta },
  { path: 'dashboard-usuario', component: DashboardUsuario, canActivate: [authGuard, candidatoGuard] },
  { path: 'postulaciones', component: Postulaciones, canActivate: [authGuard, candidatoGuard] },
  { path: 'perfil-usuario', component: PerfilUsuario, canActivate: [authGuard, candidatoGuard] },
  { path: 'foro', component: Foro, canActivate: [authGuard] },
  { path: 'dashboard-empresa', component: DashboardEmpresa, canActivate: [authGuard, empresaGuard] },
  { path: 'perfil-empresa', component: PerfilEmpresa, canActivate: [authGuard, empresaGuard] },
  { path: 'dashboard-admin', component: DashboardAdmin, canActivate: [authGuard, adminGuard] },
  { path: 'gestion-usuarios', component: GestionUsuarios, canActivate: [authGuard, adminGuard] },
  { path: 'gestion-empresas', component: GestionEmpresas, canActivate: [authGuard, adminGuard] },
  { path: 'gestion-vacantes', component: GestionVacantes, canActivate: [authGuard, adminGuard] },
  { path: 'moderacion', component: Moderacion, canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: 'login' }
];
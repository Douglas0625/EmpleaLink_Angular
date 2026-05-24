import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  // ─── Formularios ──────────────────────────────────────────────────────────
  formLogin: FormGroup;
  formCandidato: FormGroup;
  formEmpresa: FormGroup;

  // ─── Estado ───────────────────────────────────────────────────────────────
  tabActivo: 'login' | 'registro' = 'login';
  tipoRegistro: 'candidato' | 'empresa' = 'candidato';
  cargando: boolean = false;

  mensajeLogin: string = '';
  mensajeCandidato: string = '';
  mensajeCandidatoExito: boolean = false;
  mensajeEmpresa: string = '';
  mensajeEmpresaExito: boolean = false;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.formLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.formCandidato = this.fb.group({
      nombre:    ['', Validators.required],
      apellido:  ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      password:  ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', Validators.required]
    });

    this.formEmpresa = this.fb.group({
      nombreEmpresa: ['', Validators.required],
      email:         ['', [Validators.required, Validators.email]],
      contacto:      ['', Validators.required],
      password:      ['', [Validators.required, Validators.minLength(6)]],
      confirmar:     ['', Validators.required]
    });
  }

  // ─── Navegación tabs ──────────────────────────────────────────────────────

  irALogin(): void {
    this.tabActivo = 'login';
    this.mensajeLogin = '';
  }

  irARegistro(): void {
    this.tabActivo = 'registro';
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async onLogin(): Promise<void> {
    this.mensajeLogin = '';
    if (this.formLogin.invalid) {
      this.mensajeLogin = 'Completa correo y contraseña.';
      return;
    }

    const { email, password } = this.formLogin.value;
    this.cargando = true;

    try {
      await this.auth.login(email.trim().toLowerCase(), password.trim());
    } catch (error: any) {
      this.mensajeLogin = error?.message ?? 'Ocurrió un error al iniciar sesión.';
    } finally {
      this.cargando = false;
    }
  }

  // ─── Registro Candidato ───────────────────────────────────────────────────

  async onRegistroCandidato(): Promise<void> {
    this.mensajeCandidato = '';
    this.mensajeCandidatoExito = false;

    if (this.formCandidato.invalid) {
      this.mensajeCandidato = 'Completa todos los campos.';
      return;
    }

    const { nombre, apellido, email, password, confirmar } = this.formCandidato.value;

    if (password !== confirmar) {
      this.mensajeCandidato = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;

    try {
      await this.auth.registrarCandidato({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim()
      });
      this.mensajeCandidato = 'Cuenta creada con éxito. Ahora puedes iniciar sesión.';
      this.mensajeCandidatoExito = true;
      this.formCandidato.reset();
      setTimeout(() => this.irALogin(), 2000);
    } catch (error: any) {
      const msg = (error?.message ?? '').toLowerCase();
      if (msg.includes('already exists')) {
        this.mensajeCandidato = 'Ese correo ya está registrado.';
      } else {
        this.mensajeCandidato = 'No se pudo crear la cuenta.';
      }
    } finally {
      this.cargando = false;
    }
  }

  // ─── Registro Empresa ─────────────────────────────────────────────────────

  async onRegistroEmpresa(): Promise<void> {
    this.mensajeEmpresa = '';
    this.mensajeEmpresaExito = false;

    if (this.formEmpresa.invalid) {
      this.mensajeEmpresa = 'Completa todos los campos.';
      return;
    }

    const { nombreEmpresa, email, contacto, password, confirmar } = this.formEmpresa.value;

    if (password !== confirmar) {
      this.mensajeEmpresa = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;

    try {
      await this.auth.registrarEmpresa({
        nombreEmpresa: nombreEmpresa.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        contacto: contacto.trim()
      });
      this.mensajeEmpresa = 'Empresa registrada con éxito. Ahora puedes iniciar sesión.';
      this.mensajeEmpresaExito = true;
      this.formEmpresa.reset();
      setTimeout(() => this.irALogin(), 2000);
    } catch (error: any) {
      const msg = (error?.message ?? '').toLowerCase();
      if (msg.includes('already exists')) {
        this.mensajeEmpresa = 'Ese correo ya está registrado.';
      } else {
        this.mensajeEmpresa = 'No se pudo registrar la empresa.';
      }
    } finally {
      this.cargando = false;
    }
  }
}

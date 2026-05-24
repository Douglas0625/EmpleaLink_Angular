export interface SesionUsuario {
  id: number;
  email: string;
  role_id: number;
  role_name: 'admin' | 'candidate' | 'company';
  is_blocked: boolean;
  displayName: string;

  // Candidato
  profile_id?: number | null;
  first_name?: string;
  last_name?: string;
  professional_title?: string;
  profile_image_url?: string;
  location?: string;
  cv_url?: string;

  // Empresa
  company_profile_id?: number | null;
  logo_url?: string;
}

export interface UsuarioApi {
  id: number;
  email: string;
  password_hash: string;
  role_id: number;
  is_blocked: boolean;
  external_id?: string;
}

export interface PerfilCandidato {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone?: string;
  location?: string;
  external_link?: string;
  cv_url?: string;
  profile_image_url?: string;
  about_me?: string;
  professional_title?: string;
}

export interface PerfilEmpresa {
  id: number;
  user_id: number;
  company_name: string;
  phone?: string;
  location?: string;
  website_url?: string;
  logo_url?: string;
  cover_image_url?: string;
  company_size_id?: number;
  industry_id?: number;
  additional_info_id?: number;
}

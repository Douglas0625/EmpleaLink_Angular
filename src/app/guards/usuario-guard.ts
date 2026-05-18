import { CanActivateFn } from '@angular/router';

export const usuarioGuard: CanActivateFn = (route, state) => {
  return true;
};

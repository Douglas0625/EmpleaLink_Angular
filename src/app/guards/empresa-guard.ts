import { CanActivateFn } from '@angular/router';

export const empresaGuard: CanActivateFn = (route, state) => {
  return true;
};

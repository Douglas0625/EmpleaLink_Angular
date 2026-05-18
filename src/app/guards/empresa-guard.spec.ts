import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { empresaGuard } from './empresa-guard';

describe('empresaGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => empresaGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

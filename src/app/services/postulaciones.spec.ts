import { TestBed } from '@angular/core/testing';

import { Postulaciones } from './postulaciones';

describe('Postulaciones', () => {
  let service: Postulaciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Postulaciones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

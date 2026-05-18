import { TestBed } from '@angular/core/testing';

import { Ofertas } from './ofertas';

describe('Ofertas', () => {
  let service: Ofertas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Ofertas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

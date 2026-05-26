import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilEmpresaPublico } from './perfil-empresa-publico';

describe('PerfilEmpresaPublico', () => {
  let component: PerfilEmpresaPublico;
  let fixture: ComponentFixture<PerfilEmpresaPublico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilEmpresaPublico],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilEmpresaPublico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

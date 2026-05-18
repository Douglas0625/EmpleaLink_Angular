import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleOferta } from './detalle-oferta';

describe('DetalleOferta', () => {
  let component: DetalleOferta;
  let fixture: ComponentFixture<DetalleOferta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleOferta],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleOferta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

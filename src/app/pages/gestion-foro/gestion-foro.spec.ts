import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionForo } from './gestion-foro';

describe('GestionForo', () => {
  let component: GestionForo;
  let fixture: ComponentFixture<GestionForo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionForo],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionForo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

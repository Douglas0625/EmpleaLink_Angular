import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Moderacion } from './moderacion';

describe('Moderacion', () => {
  let component: Moderacion;
  let fixture: ComponentFixture<Moderacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Moderacion],
    }).compileComponents();

    fixture = TestBed.createComponent(Moderacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEmpresa } from './dashboard-empresa';

describe('DashboardEmpresa', () => {
  let component: DashboardEmpresa;
  let fixture: ComponentFixture<DashboardEmpresa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEmpresa],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardEmpresa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

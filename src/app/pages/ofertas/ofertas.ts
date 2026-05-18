import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfertasService } from '../../services/ofertas';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-ofertas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ofertas.html',
  styleUrls: ['./ofertas.css']
})
export class OfertasComponent implements OnInit {

  ofertas: any[] = [];

  private mock = [
    { id: 1, titulo: 'Desarrollador Frontend', descripcion: 'React, Angular, Vue' },
    { id: 2, titulo: 'Desarrollador Backend', descripcion: 'Node.js, Express, PostgreSQL' },
    { id: 3, titulo: 'Diseñador UX/UI', descripcion: 'Figma, Adobe XD' }
  ];

  constructor(private ofertasService: OfertasService) {}

  ngOnInit(): void {
    this.ofertasService.getOfertas().subscribe({
      next: (data) => this.ofertas = data,
      error: () => this.ofertas = this.mock
    });
  }
}
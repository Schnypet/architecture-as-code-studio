import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/architecture-dashboard.component').then(c => c.ArchitectureDashboardComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/architecture-dashboard.component').then(c => c.ArchitectureDashboardComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

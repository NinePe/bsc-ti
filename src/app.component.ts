import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BscOverviewComponent } from './components/bsc-overview.component';
import { SimulatorComponent } from './components/simulator.component';
import { InfluenceMatrixComponent } from './components/influence-matrix.component';
import { DataTablesComponent } from './components/data-tables.component';
import { StrategicMapComponent } from './components/strategic-map.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BscOverviewComponent, SimulatorComponent, InfluenceMatrixComponent, DataTablesComponent, StrategicMapComponent],
  template: `
    <div class="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans">
      <!-- Header Divemotor Branding -->
      <header class="bg-black text-white px-6 py-4 shadow-lg z-50 flex justify-between items-center shrink-0 border-b-4 border-orange-600">
        <div class="flex items-center gap-3">
           <!-- Logo Placeholder -->
           <div class="w-10 h-10 bg-white rounded flex items-center justify-center">
              <svg viewBox="0 0 24 24" class="w-8 h-8 text-black" fill="currentColor">
                <path d="M12 2L2 22h20L12 2zm0 4l6.5 13h-13L12 6z"/>
              </svg>
           </div>
           <div>
              <h1 class="text-2xl font-black tracking-tighter uppercase italic">Divemotor</h1>
              <p class="text-[10px] text-slate-400 font-medium tracking-widest uppercase">BSC Simulator & Causal Model</p>
           </div>
        </div>
        
        <nav class="flex gap-1 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
          @for (page of pages; track page.id) {
            <button 
              (click)="currentPage.set(page.id)"
              class="px-4 py-2 rounded-md text-sm font-bold transition-all uppercase tracking-wide"
              [class.bg-orange-600]="currentPage() === page.id"
              [class.text-white]="currentPage() === page.id"
              [class.shadow-md]="currentPage() === page.id"
              [class.text-neutral-400]="currentPage() !== page.id"
              [class.hover:text-white]="currentPage() !== page.id"
              [class.hover:bg-neutral-800]="currentPage() !== page.id"
            >
              {{page.label}}
            </button>
          }
        </nav>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-hidden relative bg-slate-100">
        @switch (currentPage()) {
          @case ('overview') { <app-bsc-overview class="h-full w-full block" /> }
          @case ('map') { <app-strategic-map class="h-full w-full block" /> }
          @case ('simulator') { <app-simulator class="h-full w-full block" /> }
          @case ('matrix') { <app-influence-matrix class="h-full w-full block" /> }
          @case ('data') { <app-data-tables class="h-full w-full block" /> }
        }
      </main>
    </div>
  `
})
export class AppComponent {
  pages = [
    { id: 'overview', label: 'BSC Overview' },
    { id: 'map', label: 'Strategic Map' },
    { id: 'simulator', label: 'Simulator' },
    { id: 'matrix', label: 'Influence Matrix' },
    { id: 'data', label: 'Data Tables' }
  ];

  currentPage = signal('overview');
}
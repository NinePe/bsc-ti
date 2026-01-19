import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, KPI, FactBase } from '../services/data.service';
import { SimulationService } from '../services/simulation.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-bsc-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-slate-100 overflow-hidden">
      <!-- Top Bar -->
      <div class="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 z-20">
         <div>
            <h2 class="text-xl font-bold text-slate-800 uppercase tracking-tight">Balanced Scorecard Overview</h2>
            <p class="text-sm text-slate-500">Strategic Performance Dashboard</p>
         </div>
         <div class="flex items-center gap-3">
            <div class="flex flex-col items-end mr-4">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Simulation Mode</span>
              <span class="text-xs text-slate-600">Edit values in <b class="text-orange-600">orange</b> to simulate</span>
            </div>
            <select [value]="selectedDate()" (change)="selectedDate.set($any($event.target).value)" 
              class="border border-slate-300 rounded-md px-3 py-1.5 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none shadow-sm cursor-pointer">
              @for (d of data.dates(); track d) {
                <option [value]="d">{{d}}</option>
              }
            </select>
         </div>
      </div>

      <!-- Main Content Scrollable -->
      <div class="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          <!-- Left Column: Summary & Impacts (Width: 4/12) -->
          <div class="xl:col-span-4 flex flex-col gap-6">
             
             <!-- Scorecards Grid -->
             <div class="grid grid-cols-2 gap-4">
               @for (persp of perspectives; track persp) {
                 <div class="bg-white p-4 rounded-sm shadow-sm border-t-4 flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow-md transition-shadow"
                      [class.border-t-slate-800]="persp === 'Financiera'" 
                      [class.border-t-orange-500]="persp === 'Clientes'" 
                      [class.border-t-slate-400]="persp === 'Procesos'" 
                      [class.border-t-slate-600]="persp === 'Aprendizaje y Crecimiento'">
                    
                    <div class="relative z-10">
                      <h3 class="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-1 truncate" [title]="persp">{{persp}}</h3>
                      <div class="text-3xl font-black text-slate-900">{{ getGreenPct(persp) | number:'1.0-0' }}%</div>
                      <div class="text-[10px] text-slate-400 mt-1 font-medium">KPIs on Track</div>
                    </div>
                    
                    <!-- Decorative Icon -->
                    <div class="absolute -right-4 -bottom-4 w-16 h-16 opacity-5 pointer-events-none bg-black rounded-full"></div>
                 </div>
               }
             </div>

             <!-- Live Impact Analysis (Shows when simulation is active) -->
             @if (activeImpacts().length > 0) {
               <div class="bg-neutral-900 text-white rounded-lg shadow-xl p-5 flex flex-col gap-4 animate-fade-in border border-neutral-700">
                  <div class="flex justify-between items-center border-b border-neutral-700 pb-3">
                     <div>
                       <h3 class="font-bold text-white flex items-center gap-2 text-lg">
                         <span class="text-orange-500">⚡</span> Chain Reaction
                       </h3>
                       <p class="text-xs text-neutral-400 mt-0.5">Calculated Causal Impacts</p>
                     </div>
                     <button (click)="clearSimulation()" class="bg-white text-xs font-bold text-black px-3 py-1.5 rounded-full hover:bg-orange-500 hover:text-white transition-all">
                        Reset
                     </button>
                  </div>

                  <!-- Large Impact Cards List -->
                  <div class="flex flex-col gap-3">
                     @for (imp of activeImpacts(); track $index) {
                        <div class="bg-neutral-800 p-3 rounded border-l-[4px] shadow-sm flex flex-col gap-2 relative overflow-hidden"
                             [class.border-l-green-500]="imp.strength > 0"
                             [class.border-l-red-500]="imp.strength < 0">
                           
                           <div class="flex items-center justify-between relative z-10">
                              <!-- Driver -->
                              <div class="flex flex-col w-[40%]">
                                 <span class="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Driver</span>
                                 <span class="text-xs font-semibold text-neutral-200 leading-tight">{{imp.driver}}</span>
                              </div>

                              <!-- Value -->
                              <div class="flex flex-col items-center justify-center w-[20%]">
                                 <span class="text-sm font-black"
                                      [class.text-green-400]="imp.strength > 0" 
                                      [class.text-red-400]="imp.strength < 0">
                                      {{ imp.strength > 0 ? '▲' : '▼' }} {{ (Math.abs(imp.strength) * 100) | number:'1.1-1' }}%
                                 </span>
                              </div>

                              <!-- Target -->
                              <div class="flex flex-col w-[40%] items-end text-right">
                                 <span class="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Effect On</span>
                                 <span class="text-xs font-semibold text-white leading-tight">{{imp.target}}</span>
                              </div>
                           </div>
                        </div>
                     }
                  </div>
               </div>
             } @else {
               <!-- Default Trend Analysis -->
               <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex flex-col gap-6">
                  <div class="flex justify-between items-center border-b pb-2">
                     <h3 class="font-bold text-slate-800 uppercase text-sm">Trend Analysis</h3>
                     <span class="text-xs text-slate-400 font-mono">24 Months</span>
                  </div>
                  
                  <div>
                     <div class="flex justify-between items-center mb-2">
                       <label class="text-xs font-bold text-slate-500">Selected KPI</label>
                       <select class="text-xs border border-slate-300 rounded px-2 py-1 max-w-[200px] bg-slate-50 font-medium" (change)="chartKpi1.set($any($event.target).value)">
                          @for (k of data.kpis(); track k.KPI_Key) {
                            <option [value]="k.KPI_Key" [selected]="k.KPI_Key === chartKpi1()">{{k.KPI_Name}}</option>
                          }
                       </select>
                     </div>
                     <div class="h-32 w-full bg-slate-50 rounded border border-slate-200 relative overflow-hidden">
                        <svg viewBox="0 0 600 200" class="w-full h-full" preserveAspectRatio="none">
                          <path [attr.d]="getTrendPath(chartKpi1(), 600, 200)" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                          <line [attr.x1]="0" [attr.y1]="getTrendTargetY(chartKpi1(), 200)" [attr.x2]="600" [attr.y2]="getTrendTargetY(chartKpi1(), 200)" stroke="#94a3b8" stroke-dasharray="4" stroke-width="1" opacity="0.6"/>
                        </svg>
                     </div>
                  </div>

                  <div class="p-4 bg-orange-50 rounded border border-orange-100 text-sm text-slate-700">
                     <p class="font-bold mb-1 text-orange-800">Ready to Simulate?</p>
                     <p class="text-xs">Click on any <span class="text-orange-600 font-bold">orange number</span> in the tables to input a new value. The system will calculate downstream impacts instantly.</p>
                  </div>
               </div>
             }

          </div>

          <!-- Right Column: Detailed Grouped Tables (Width: 8/12) -->
          <div class="xl:col-span-8 flex flex-col gap-6 pb-20">
            
            @for (persp of perspectives; track persp) {
              <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <!-- Section Header -->
                <div class="px-5 py-3 border-b flex items-center justify-between bg-white">
                   <div class="flex items-center gap-3">
                      <div class="h-6 w-1 rounded-full" 
                           [class.bg-black]="persp === 'Financiera'" 
                           [class.bg-orange-600]="persp === 'Clientes'" 
                           [class.bg-slate-500]="persp === 'Procesos'" 
                           [class.bg-slate-800]="persp === 'Aprendizaje y Crecimiento'"></div>
                      <h3 class="font-bold text-sm uppercase tracking-wider text-slate-800">
                          {{persp}}
                      </h3>
                   </div>
                </div>
                
                <!-- Table -->
                <div class="overflow-x-auto">
                   <table class="w-full text-sm">
                      <thead>
                         <tr class="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                            <th class="px-5 py-3 text-left">Objective / KPI</th>
                            <th class="px-4 py-3 text-right w-24">Base</th>
                            <th class="px-4 py-3 text-center w-32 bg-orange-50/50 text-orange-800 border-x border-orange-100">
                               Simulated
                            </th>
                            <th class="px-4 py-3 text-right w-24">Target</th>
                            <th class="px-4 py-3 text-right w-24">Var %</th>
                            <th class="px-4 py-3 text-center w-16">State</th>
                         </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                         @for (row of getKPIsByPerspective(persp); track row.kpi.KPI_Key) {
                            <tr class="hover:bg-slate-50 transition-colors group">
                               <!-- KPI Name -->
                               <td class="px-5 py-3 relative">
                                  <div class="font-bold text-slate-700 text-xs flex items-center gap-2">
                                     {{row.kpi.KPI_Name}}
                                     <!-- Indicator -->
                                     @if (row.isImpacted && !row.isDriver) {
                                       <span class="flex h-2 w-2 relative" title="Impacted by causal chain">
                                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                          <span class="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                       </span>
                                     }
                                  </div>
                                  <div class="text-[10px] text-slate-400 uppercase tracking-tight mt-0.5">{{row.kpi.Objective}}</div>
                               </td>

                               <!-- Base Value -->
                               <td class="px-4 py-3 text-right font-mono text-slate-400 text-xs">
                                  {{formatValue(row.kpi, row.base)}}
                               </td>
                               
                               <!-- Editable Result Input -->
                               <td class="px-2 py-2 text-center bg-orange-50/20 border-x border-orange-100/50 relative group-hover:bg-orange-50/50 transition-colors">
                                  <div class="relative flex items-center justify-end">
                                    <span *ngIf="row.kpi.UnitType === 'USD'" class="absolute left-2 text-xs text-orange-300 font-bold">$</span>
                                    <input type="number" 
                                      [value]="getDisplayValue(row.kpi, row.sim)"
                                      (change)="updateResult(row.kpi, row.base, $any($event.target).value)"
                                      class="w-full text-right text-sm font-bold bg-white border border-orange-200 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm hover:border-orange-400"
                                      [class.text-orange-600]="row.sim !== row.base"
                                      [class.text-slate-700]="row.sim === row.base"
                                      [class.bg-orange-50]="row.isImpacted && !row.isDriver"
                                      step="0.01"
                                    />
                                    <span *ngIf="row.kpi.UnitType === '%'" class="absolute right-6 pointer-events-none text-xs text-orange-300 font-bold">%</span>
                                  </div>
                               </td>

                               <!-- Target -->
                               <td class="px-4 py-3 text-right font-mono text-slate-400 text-xs">
                                  {{formatValue(row.kpi, row.target)}}
                               </td>
                               
                               <!-- Variance -->
                               <td class="px-4 py-3 text-right font-mono text-xs font-bold">
                                  @let varPct = getVariancePct(row.base, row.sim);
                                  <span [class.text-emerald-600]="varPct > 0" [class.text-red-600]="varPct < 0" [class.text-slate-300]="varPct === 0">
                                     {{ varPct > 0 ? '+' : ''}}{{ varPct | number:'1.1-1' }}%
                                  </span>
                               </td>
                               
                               <!-- Status -->
                               <td class="px-4 py-3 text-center">
                                  <div class="flex justify-center">
                                     <span class="w-3 h-3 rounded-full shadow-sm ring-1 ring-slate-200" 
                                        [class.bg-emerald-500]="row.status === 'Green'"
                                        [class.bg-amber-400]="row.status === 'Amber'"
                                        [class.bg-red-500]="row.status === 'Red'">
                                     </span>
                                  </div>
                               </td>
                            </tr>
                         }
                      </tbody>
                   </table>
                </div>
              </div>
            }

          </div>
        </div>
      </div>
    </div>
  `
})
export class BscOverviewComponent {
  data = inject(DataService);
  simService = inject(SimulationService);
  Math = Math;

  selectedDate = signal('2024-01');
  chartKpi1 = signal('K030'); // MTTR

  perspectives = ['Financiera', 'Clientes', 'Procesos', 'Aprendizaje y Crecimiento'];

  filteredKPIs = computed(() => {
    const date = this.selectedDate();
    const kpis = this.data.kpis();
    const base = this.data.factBase();
    const sim = this.simService.simulatedFacts();
    const targets = this.data.factTarget();
    const inputs = this.data.scenarioInputs();

    return kpis.map(kpi => {
      const b = base.find(f => f.KPI_Key === kpi.KPI_Key && f.YearMonth === date)?.Value || 0;
      const s = sim.find(f => f.KPI_Key === kpi.KPI_Key && f.YearMonth === date)?.Value || 0;
      const t = targets.find(f => f.KPI_Key === kpi.KPI_Key && f.YearMonth === date)?.Value || kpi.DefaultTarget;
      
      const isDriver = inputs.some(i => i.KPI_Key === kpi.KPI_Key && i.YearMonth === date);
      const isImpacted = Math.abs(s - b) > 0.00001;

      return {
        kpi,
        base: b,
        sim: s,
        target: t,
        status: this.getStatus(kpi, s, t),
        isDriver,
        isImpacted
      };
    });
  });

  activeImpacts = computed(() => {
    const date = this.selectedDate();
    const inputs = this.data.scenarioInputs().filter(i => i.YearMonth === date);
    const matrix = this.data.influenceMatrix();
    const kpis = this.data.kpis();
    
    const impacts: {driver: string, target: string, strength: number, elasticity: number}[] = [];
    
    inputs.forEach(input => {
      const rules = matrix.filter(m => m.From_KPI_Key === input.KPI_Key);
      const driverName = kpis.find(k => k.KPI_Key === input.KPI_Key)?.KPI_Name || input.KPI_Key;
      
      rules.forEach(rule => {
        const targetName = kpis.find(k => k.KPI_Key === rule.To_KPI_Key)?.KPI_Name || rule.To_KPI_Key;
        const strength = input.DeltaPct * rule.Direction * rule.Elasticity;
        
        impacts.push({
          driver: driverName,
          target: targetName,
          strength: strength,
          elasticity: rule.Elasticity
        });
      });
    });
    
    return impacts.sort((a,b) => Math.abs(b.strength) - Math.abs(a.strength));
  });

  getKPIsByPerspective(persp: string) {
    return this.filteredKPIs().filter(r => r.kpi.Perspective === persp);
  }

  getDisplayValue(kpi: KPI, val: number): string {
    if (kpi.UnitType === '%') {
      return (val * 100).toFixed(2);
    }
    return val.toFixed(2);
  }

  updateResult(kpi: KPI, base: number, inputVal: string) {
    let newVal = parseFloat(inputVal);
    if (isNaN(newVal)) return;

    if (kpi.UnitType === '%') {
      newVal = newVal / 100;
    }

    let delta = 0;
    if (base !== 0) {
      delta = (newVal - base) / base;
    } else {
      return;
    }

    this.setDelta(kpi.KPI_Key, delta);
  }

  setDelta(kpiKey: string, delta: number) {
    const date = this.selectedDate();
    
    this.data.scenarioInputs.update(inputs => {
      const idx = inputs.findIndex(i => i.YearMonth === date && i.KPI_Key === kpiKey);
      
      if (Math.abs(delta) < 0.0001) {
         if (idx >= 0) {
             return inputs.filter((_, i) => i !== idx);
         }
         return inputs;
      }

      if (idx >= 0) {
        const newInputs = [...inputs];
        newInputs[idx] = { ...newInputs[idx], DeltaPct: delta };
        return newInputs;
      } else {
        return [...inputs, { YearMonth: date, KPI_Key: kpiKey, DeltaPct: delta }];
      }
    });
  }

  clearSimulation() {
     const date = this.selectedDate();
     this.data.scenarioInputs.update(inputs => inputs.filter(i => i.YearMonth !== date));
  }

  getVariancePct(base: number, sim: number): number {
    if (base === 0) return 0;
    return ((sim - base) / base) * 100;
  }

  getStatus(kpi: KPI, val: number, target: number): 'Green' | 'Amber' | 'Red' {
    if (kpi.HigherIsBetter) {
      if (val >= target) return 'Green';
      if (val >= 0.95 * target) return 'Amber';
      return 'Red';
    } else {
      if (val <= target) return 'Green';
      if (val <= 1.05 * target) return 'Amber';
      return 'Red';
    }
  }

  getGreenPct(persp: string) {
    const all = this.filteredKPIs().filter(r => r.kpi.Perspective === persp);
    if (all.length === 0) return 0;
    const green = all.filter(r => r.status === 'Green').length;
    return (green / all.length) * 100;
  }

  formatValue(kpi: KPI, val: number): string {
    if (kpi.UnitType === '%') return (val * 100).toFixed(1) + '%';
    if (kpi.UnitType === 'USD') return '$' + val.toFixed(0);
    return val.toFixed(1);
  }

  getTrendPath(kpiKey: string, w: number, h: number): string {
    const kpi = this.data.kpis().find(k => k.KPI_Key === kpiKey);
    if (!kpi) return '';
    const sim = this.simService.simulatedFacts().filter(f => f.KPI_Key === kpiKey);
    sim.sort((a, b) => a.YearMonth.localeCompare(b.YearMonth));

    if (sim.length === 0) return '';
    
    const min = Math.min(...sim.map(s => s.Value)) * 0.9;
    const max = Math.max(...sim.map(s => s.Value)) * 1.1;
    const range = max - min || 1;
    
    const stepX = w / (sim.length - 1);
    
    let path = `M 0 ${h - ((sim[0].Value - min) / range) * h}`;
    for(let i=1; i<sim.length; i++) {
       const x = i * stepX;
       const y = h - ((sim[i].Value - min) / range) * h;
       path += ` L ${x} ${y}`;
    }
    return path;
  }

  getTrendTargetY(kpiKey: string, h: number): number {
      const kpi = this.data.kpis().find(k => k.KPI_Key === kpiKey);
      if (!kpi) return 0;
      const sim = this.simService.simulatedFacts().filter(f => f.KPI_Key === kpiKey);
      const min = Math.min(...sim.map(s => s.Value)) * 0.9;
      const max = Math.max(...sim.map(s => s.Value)) * 1.1;
      const range = max - min || 1;
      const t = kpi.DefaultTarget;
      return h - ((t - min) / range) * h;
  }
}
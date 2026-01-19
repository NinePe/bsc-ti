import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, KPI } from '../services/data.service';
import { SimulationService } from '../services/simulation.service';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex gap-4 p-4 overflow-hidden bg-slate-100">
      
      <!-- Left: Inputs -->
      <div class="w-1/3 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
        <div class="p-3 border-b bg-black text-white font-bold">Scenario Inputs (Drivers)</div>
        <div class="p-3 border-b bg-slate-50">
           <label class="text-xs text-slate-500 font-bold uppercase">YearMonth to Edit</label>
           <select [ngModel]="selectedInputDate()" (ngModelChange)="selectedInputDate.set($event)" class="w-full border border-slate-300 rounded p-1.5 text-sm mt-1 focus:ring-2 focus:ring-orange-500 outline-none">
             @for (d of data.dates(); track d) { <option [value]="d">{{d}}</option> }
           </select>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
           <table class="w-full text-sm">
             <thead>
               <tr class="text-xs text-slate-500 text-left uppercase bg-slate-50 border-b"><th class="py-2 pl-2">Driver KPI</th><th class="w-20 text-center">Delta %</th></tr>
             </thead>
             <tbody>
               @for (kpi of driverKPIs(); track kpi.KPI_Key) {
                 <tr class="border-b border-slate-50 hover:bg-orange-50/20 transition-colors">
                   <td class="py-2 pl-2 text-xs font-medium text-slate-700">{{kpi.KPI_Name}}</td>
                   <td class="pr-2 py-1">
                     <input type="number" 
                        [value]="getDelta(kpi.KPI_Key)" 
                        (change)="setDelta(kpi.KPI_Key, $any($event.target).value)"
                        class="w-full border border-slate-300 rounded px-1 py-1 text-right text-orange-600 font-mono font-bold focus:bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                        step="0.05"
                     />
                   </td>
                 </tr>
               }
             </tbody>
           </table>
        </div>
      </div>

      <!-- Center: Impacts (Top 10) -->
      <div class="w-1/3 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
         <div class="p-3 border-b bg-black text-white font-bold">Top Impacts ({{selectedInputDate()}})</div>
         <div class="flex-1 overflow-y-auto p-3">
            @for (imp of topImpacts(); track imp.to) {
               <div class="mb-3 p-3 bg-slate-50 rounded border border-slate-200 shadow-sm relative overflow-hidden">
                  <div class="text-xs text-slate-500 flex justify-between font-bold uppercase tracking-wider mb-1">
                     <span class="truncate w-[45%]">{{getKpiName(imp.from)}}</span>
                     <span class="text-orange-400">→</span>
                     <span class="truncate w-[45%] text-right">{{getKpiName(imp.to)}}</span>
                  </div>
                  <div class="flex justify-between items-center z-10 relative">
                     <div class="text-sm font-black text-slate-800">{{imp.effect | number:'1.2-2'}}% Impact</div>
                     <div class="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                        <div class="h-full bg-orange-500" [style.width.%]="Math.min(100, Math.abs(imp.effect)*500)"></div>
                     </div>
                  </div>
               </div>
            }
            @if (topImpacts().length === 0) {
               <div class="text-slate-400 text-center mt-10 text-sm flex flex-col items-center gap-2">
                  <span class="text-2xl opacity-20">📉</span>
                  No significant impacts in this period. 
                  <span class="text-xs">Adjust the Deltas on the left.</span>
               </div>
            }
         </div>
      </div>

      <!-- Right: Key Results -->
      <div class="w-1/3 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200">
         <div class="p-3 border-b bg-black text-white font-bold">Key Results ({{selectedInputDate()}})</div>
         <div class="flex-1 overflow-y-auto p-4">
            @for (res of keyResults(); track res.kpi.KPI_Key) {
               <div class="mb-5">
                  <div class="flex justify-between text-sm mb-1.5">
                     <span class="font-bold text-slate-700 w-2/3 truncate" [title]="res.kpi.KPI_Name">{{res.kpi.KPI_Name}}</span>
                     <span class="font-mono font-bold" [class.text-green-600]="res.isBetter" [class.text-red-600]="!res.isBetter">
                        {{formatValue(res.kpi, res.sim)}}
                     </span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner border border-slate-200">
                     <div class="h-full rounded-full transition-all duration-500" 
                        [class.bg-emerald-500]="res.status === 'Green'"
                        [class.bg-amber-400]="res.status === 'Amber'"
                        [class.bg-red-500]="res.status === 'Red'"
                        [style.width.%]="getTargetPct(res.kpi, res.sim)">
                     </div>
                  </div>
                  <div class="flex justify-between text-[10px] text-slate-400 mt-1 uppercase font-medium">
                     <span>Base: {{formatValue(res.kpi, res.base)}}</span>
                     <span>Target: {{formatValue(res.kpi, res.target)}}</span>
                  </div>
               </div>
            }
         </div>
      </div>

    </div>
  `
})
export class SimulatorComponent {
  data = inject(DataService);
  simService = inject(SimulationService);
  Math = Math;

  selectedInputDate = signal('2024-01');

  // Identify "Drivers" as KPIs that are "From" in the matrix
  driverKPIs = computed(() => {
    const matrix = this.data.influenceMatrix();
    const fromKeys = new Set(matrix.map(m => m.From_KPI_Key));
    return this.data.kpis().filter(k => fromKeys.has(k.KPI_Key));
  });

  getDelta(kpiKey: string): number {
    const found = this.data.scenarioInputs().find(i => i.YearMonth === this.selectedInputDate() && i.KPI_Key === kpiKey);
    return found ? found.DeltaPct : 0;
  }

  setDelta(kpiKey: string, val: string) {
    const num = parseFloat(val);
    const date = this.selectedInputDate();
    this.data.scenarioInputs.update(inputs => {
      const idx = inputs.findIndex(i => i.YearMonth === date && i.KPI_Key === kpiKey);
      if (idx >= 0) {
        if (num === 0) {
           return inputs.filter((_, i) => i !== idx); // remove if 0
        }
        const newInputs = [...inputs];
        newInputs[idx] = { ...newInputs[idx], DeltaPct: num };
        return newInputs;
      } else {
        if (num === 0) return inputs;
        return [...inputs, { YearMonth: date, KPI_Key: kpiKey, DeltaPct: num }];
      }
    });
  }

  topImpacts = computed(() => {
     // This logic attempts to visualize why things changed in the selected month
     // We look at the influence matrix and current deltas
     const date = this.selectedInputDate();
     const inputs = this.data.scenarioInputs(); // GLOBAL inputs
     const matrix = this.data.influenceMatrix();
     
     // Simplified: Just show direct impacts from active inputs in this month (or lagged)
     const impacts: {from: string, to: string, effect: number}[] = [];
     
     // We need to look at inputs from [date - lag]
     const dateIdx = this.data.dates().indexOf(date);
     if (dateIdx < 0) return [];

     matrix.forEach(m => {
        const sourceDateIdx = dateIdx - m.LagMonths;
        if (sourceDateIdx >= 0) {
           const sourceDate = this.data.dates()[sourceDateIdx];
           const input = inputs.find(i => i.YearMonth === sourceDate && i.KPI_Key === m.From_KPI_Key);
           if (input && input.DeltaPct !== 0) {
              const effect = input.DeltaPct * m.Direction * m.Elasticity;
              impacts.push({ from: m.From_KPI_Key, to: m.To_KPI_Key, effect });
           }
        }
     });

     return impacts.sort((a,b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, 10);
  });

  keyResults = computed(() => {
     const keysOfInterest = ['K030', 'K034', 'K035', 'K010', 'K020', 'K021']; // MTTR, SLA, Avail, Adoption, ROI, Var%
     const date = this.selectedInputDate();
     const sim = this.simService.simulatedFacts();
     const base = this.data.factBase();
     const target = this.data.factTarget();
     
     return keysOfInterest.map(key => {
        const kpi = this.data.kpis().find(k => k.KPI_Key === key)!;
        const s = sim.find(f => f.YearMonth === date && f.KPI_Key === key)?.Value || 0;
        const b = base.find(f => f.YearMonth === date && f.KPI_Key === key)?.Value || 0;
        const t = target.find(f => f.YearMonth === date && f.KPI_Key === key)?.Value || kpi.DefaultTarget;
        
        let isBetter = false;
        if (kpi.HigherIsBetter) isBetter = s >= b;
        else isBetter = s <= b;

        return {
           kpi,
           sim: s,
           base: b,
           target: t,
           isBetter,
           status: this.getStatus(kpi, s, t)
        };
     });
  });

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

  getTargetPct(kpi: KPI, val: number): number {
     // For progress bar visualization
     // Normalize somewhat around target
     if (kpi.UnitType === '%') return val * 100;
     // For others, arbitrary scale relative to target
     if (kpi.DefaultTarget === 0) return 100; // Handle 0 target
     return Math.min(100, (val / kpi.DefaultTarget) * 100);
  }

  getKpiName(key: string) {
     return this.data.kpis().find(k => k.KPI_Key === key)?.KPI_Name || key;
  }

  formatValue(kpi: KPI, val: number): string {
    if (kpi.UnitType === '%') return (val * 100).toFixed(1) + '%';
    if (kpi.UnitType === 'USD') return '$' + val.toFixed(0);
    return val.toFixed(1);
  }
}
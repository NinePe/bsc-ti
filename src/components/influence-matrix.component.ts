import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-influence-matrix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col p-4 gap-4">
      <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
         <label class="font-bold text-slate-700 mr-4">Filter by Target KPI:</label>
         <select (change)="filterTo.set($any($event.target).value)" class="border rounded px-2 py-1">
            <option value="">All Relationships</option>
            @for (k of data.kpis(); track k.KPI_Key) {
               <option [value]="k.KPI_Key">{{k.KPI_Name}}</option>
            }
         </select>
      </div>

      <div class="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
         <div class="p-3 bg-slate-50 border-b font-bold text-slate-700">Influence Rules</div>
         <div class="flex-1 overflow-auto">
            <table class="w-full text-sm text-left">
               <thead class="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                  <tr>
                     <th class="px-4 py-3">From (Driver)</th>
                     <th class="px-4 py-3">To (Affected)</th>
                     <th class="px-4 py-3 text-center">Direction</th>
                     <th class="px-4 py-3 text-center">Elasticity</th>
                     <th class="px-4 py-3 text-center">Lag (Months)</th>
                  </tr>
               </thead>
               <tbody>
                  @for (row of filteredMatrix(); track row.id) {
                     <tr class="border-b hover:bg-slate-50">
                        <td class="px-4 py-2">
                           <div class="font-medium text-slate-700">{{getKpiName(row.inf.From_KPI_Key)}}</div>
                           <div class="text-xs text-slate-400">{{row.inf.From_KPI_Key}}</div>
                        </td>
                        <td class="px-4 py-2">
                           <div class="font-medium text-slate-700">{{getKpiName(row.inf.To_KPI_Key)}}</div>
                           <div class="text-xs text-slate-400">{{row.inf.To_KPI_Key}}</div>
                        </td>
                        <td class="px-4 py-2 text-center">
                           <span class="px-2 py-1 rounded text-xs font-bold" 
                              [class.bg-green-100]="row.inf.Direction > 0" [class.text-green-700]="row.inf.Direction > 0"
                              [class.bg-red-100]="row.inf.Direction < 0" [class.text-red-700]="row.inf.Direction < 0">
                              {{row.inf.Direction > 0 ? '+ Positive' : '- Inverse'}}
                           </span>
                        </td>
                        <td class="px-4 py-2 text-center font-mono">{{row.inf.Elasticity}}</td>
                        <td class="px-4 py-2 text-center font-mono">{{row.inf.LagMonths}}</td>
                     </tr>
                  }
               </tbody>
            </table>
         </div>
      </div>
    </div>
  `
})
export class InfluenceMatrixComponent {
  data = inject(DataService);
  filterTo = signal('');

  filteredMatrix = computed(() => {
     const all = this.data.influenceMatrix();
     const filter = this.filterTo();
     // Add ID for tracking
     const withId = all.map((inf, i) => ({ id: i, inf }));
     
     if (!filter) return withId;
     return withId.filter(r => r.inf.To_KPI_Key === filter);
  });

  getKpiName(key: string) {
     return this.data.kpis().find(k => k.KPI_Key === key)?.KPI_Name || key;
  }
}

import { Component, inject, signal, computed, effect, ElementRef, ViewChild, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { DataService, KPI } from '../services/data.service';
import { SimulationService } from '../services/simulation.service';

@Component({
  selector: 'app-strategic-map',
  standalone: true,
  imports: [CommonModule, NgTemplateOutlet],
  styles: [`
    @keyframes flow {
      to {
        stroke-dashoffset: -20;
      }
    }
    .flow-animation {
      animation: flow 1s linear infinite;
    }
    /* Hide scrollbars completely for fit-to-screen feel */
    * {
      scrollbar-width: none; 
      -ms-overflow-style: none; 
    }
    *::-webkit-scrollbar { 
      display: none; 
    }
  `],
  template: `
    <div class="h-full flex flex-col bg-slate-50 overflow-hidden relative font-sans">
      <!-- Header / Controls (Compact) -->
      <div class="flex items-center justify-between px-3 py-1 bg-white border-b border-slate-200 shadow-sm z-30 shrink-0 h-10">
         <h2 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            Strategic Map
            <span class="text-[9px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">Fit-to-Screen</span>
         </h2>
         
         <div class="flex items-center gap-3">
             <!-- Arrow Legend -->
             <div class="flex items-center gap-3 text-[10px] font-semibold text-slate-600 mr-2">
                <span class="flex items-center gap-1" title="Outgoing Influence (Causes)">
                    <svg width="14" height="6" viewBox="0 0 14 6" class="stroke-black fill-none">
                        <path d="M0,3 L12,3" stroke-width="1.5" stroke-dasharray="3,1"></path>
                        <path d="M10,1 L12,3 L10,5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg> 
                    Causes
                </span>
                <span class="flex items-center gap-1" title="Incoming Influence (Effects)">
                    <svg width="14" height="6" viewBox="0 0 14 6" class="stroke-orange-500 fill-none">
                        <path d="M0,3 L12,3" stroke-width="1.5" stroke-dasharray="3,1"></path>
                        <path d="M10,1 L12,3 L10,5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg> 
                    Effects
                </span>
             </div>
             
             <div class="h-4 w-px bg-slate-300 mx-1"></div>

             <!-- Status Legend -->
             <div class="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-emerald-500 rounded-sm"></span> OK</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-amber-500 rounded-sm"></span> Warn</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-red-500 rounded-sm"></span> Crit</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-slate-300 rounded-sm"></span> N/D</span>
             </div>
             <div class="h-4 w-px bg-slate-300 mx-1"></div>
             
             <!-- Date Selector (Descending) -->
             <select [value]="selectedDate()" (change)="selectedDate.set($any($event.target).value)" 
              class="border border-slate-300 rounded px-2 py-0.5 bg-white text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none shadow-sm cursor-pointer hover:border-orange-300">
              @for (d of sortedDates(); track d) {
                <option [value]="d">{{d}}</option>
              }
            </select>
         </div>
      </div>

      <!-- Map Container (NO SCROLL - Fit Height) -->
      <div class="flex-1 relative overflow-hidden bg-slate-100/50 flex flex-col" #mapContainer>
         
         <!-- Content Wrapper -->
         <div class="flex-1 flex flex-col w-full h-full relative" #mainWrapper>
             
             <!-- SVG Overlay for Arrows (Absolute) -->
             <svg class="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                   <marker id="arrowhead-black" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                      <polygon points="0 0, 6 2, 0 4" fill="#000000" />
                   </marker>
                   <marker id="arrowhead-orange" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                      <polygon points="0 0, 6 2, 0 4" fill="#ea580c" />
                   </marker>
                </defs>
                
                @for (conn of visibleConnections(); track conn.id) {
                   <path *ngIf="conn.highlighted"
                         [attr.d]="conn.path" 
                         stroke="white" 
                         [attr.stroke-width]="conn.width + 2" 
                         fill="none"
                         class="opacity-80" />
                   
                   <path [attr.d]="conn.path" 
                         [attr.stroke]="conn.color" 
                         [attr.stroke-width]="conn.width" 
                         fill="none"
                         [attr.marker-end]="conn.marker"
                         class="transition-all duration-300 ease-in-out"
                         [class.flow-animation]="conn.animated"
                         [style.stroke-dasharray]="conn.dashArray"
                         [style.opacity]="conn.opacity"/>
                }
             </svg>

             <!-- Perspectives Layers -->
             <div class="flex-1 flex flex-col z-10 w-full h-full">
                @for (persp of perspectiveOrder; track persp) {
                   <!-- 
                        Flex Ratios Logic (Tuned for minimal gaps):
                        - Procesos: 1.4 (Reduced from 2.0 to compact height)
                        - Others: 0.6 (Single rows, keep them tight)
                   -->
                   <div class="relative w-full border-b border-slate-200/60 last:border-0 flex flex-col justify-center px-1"
                        [style.flex]="persp === 'Procesos' ? '1.4 1 0%' : '0.6 1 0%'">
                      
                      <!-- Perspective Label (Tiny Vertical) -->
                      <div class="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center bg-white/40 border-r border-slate-100 z-0">
                         <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400 -rotate-90 whitespace-nowrap">{{persp}}</span>
                      </div>
    
                      <!-- KPIs Content -->
                      <div class="pl-6 z-20 w-full h-full flex flex-col justify-center">
                          
                          @if (persp === 'Procesos') {
                              <!-- Procesos: Dense Layout -->
                              <div class="flex flex-wrap items-center justify-center content-center gap-x-2.5 gap-y-1 w-full h-full py-0.5">
                                  @for (group of getNodesGroupedByObjective(persp); track group.objective) {
                                      <div class="flex flex-col items-center justify-start rounded-lg border border-slate-200/50 bg-white/10 px-1 py-1">
                                          <!-- Tiny Group Header -->
                                          <div class="mb-1">
                                              <!-- Changed font-black to font-medium here -->
                                              <div class="text-[8px] font-medium text-slate-500 uppercase tracking-tighter bg-white/80 px-1.5 rounded border border-slate-200 leading-none py-0.5">
                                                  {{group.objective}}
                                              </div>
                                          </div>
                                          <!-- Nodes Grid -->
                                          <div class="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-center">
                                              @for (node of group.nodes; track node.kpi.KPI_Key) {
                                                  <ng-container *ngTemplateOutlet="kpiNodeTemplate; context: { $implicit: node }"></ng-container>
                                              }
                                          </div>
                                      </div>
                                  }
                              </div>
                          } @else {
                              <!-- Others: Standard Row -->
                              <div class="flex flex-wrap justify-center items-center content-center gap-4 w-full h-full">
                                  @for (node of getNodesByPerspective(persp); track node.kpi.KPI_Key) {
                                      <ng-container *ngTemplateOutlet="kpiNodeTemplate; context: { $implicit: node }"></ng-container>
                                  }
                              </div>
                          }
                      </div>
                   </div>
                }
             </div>
         </div>
      </div>

      <!-- Compact KPI Card Template -->
      <ng-template #kpiNodeTemplate let-node>
          <div #kpiCard
               [id]="'node-' + node.kpi.KPI_Key"
               (mouseenter)="hoverNode.set(node.kpi.KPI_Key)"
               (mouseleave)="hoverNode.set(null)"
               (click)="toggleLock(node.kpi.KPI_Key)"
               class="w-40 bg-white rounded shadow-sm cursor-pointer transition-transform duration-200 relative group select-none flex flex-col justify-between overflow-hidden border border-slate-200"
               
               [class.border-t-4]="true"
               [class.border-t-emerald-500]="node.status === 'Green'"
               [class.border-t-amber-500]="node.status === 'Amber'"
               [class.border-t-red-500]="node.status === 'Red'"
               [class.border-t-slate-300]="node.status === 'Gray'"
               
               [class.scale-125]="isNodeActive(node.kpi.KPI_Key)"
               [class.z-50]="isNodeActive(node.kpi.KPI_Key)"
               [class.ring-2]="isNodeActive(node.kpi.KPI_Key)"
               [class.ring-orange-500]="isNodeActive(node.kpi.KPI_Key)"
               [class.opacity-40]="activeNode() && !isNodeActive(node.kpi.KPI_Key) && !isRelated(node.kpi.KPI_Key)">
             
             <!-- Header (Removed bg-slate-50 and border-b) -->
             <div class="px-1 py-1 text-center flex items-center justify-center h-8">
                <span class="text-[8px] leading-3 font-bold text-slate-900 line-clamp-2 uppercase tracking-tight" [title]="node.kpi.KPI_Name">
                   {{node.kpi.KPI_Name}}
                </span>
             </div>

             <!-- Body: Main Value (Totals) - Font Size Reduced to text-base -->
             <div class="flex-1 flex flex-col items-center justify-center py-0.5">
                <span class="text-base font-black tracking-tight leading-none"
                   [class.text-emerald-700]="node.status === 'Green'"
                   [class.text-amber-600]="node.status === 'Amber'"
                   [class.text-red-700]="node.status === 'Red'"
                   [class.text-slate-400]="node.status === 'Gray'">
                   {{ getSimpleValue(node.kpi, node.sim) }}<span *ngIf="node.status !== 'Gray'" class="text-[9px] font-bold ml-px opacity-70 text-slate-500">{{node.kpi.UnitType === '%' ? '%' : ''}}</span>
                </span>
             </div>
             
             <!-- Footer (Target/Var) (Removed bg-slate-50 and border-t) -->
             <div class="flex justify-between items-center px-1 py-0.5 text-[8px]">
                <span class="text-slate-500 font-mono">T:{{ getSimpleValue(node.kpi, node.target) }}</span>
                <span class="font-bold" 
                   [class.text-emerald-600]="(node.status !== 'Gray' && node.variance >= 0 && node.kpi.HigherIsBetter) || (node.status !== 'Gray' && node.variance <= 0 && !node.kpi.HigherIsBetter)"
                   [class.text-red-600]="(node.status !== 'Gray' && node.variance < 0 && node.kpi.HigherIsBetter) || (node.status !== 'Gray' && node.variance > 0 && !node.kpi.HigherIsBetter)"
                   [class.text-slate-300]="node.status === 'Gray'">
                   {{node.status === 'Gray' ? '--' : (node.variance > 0 ? '+' : '')}}{{node.status === 'Gray' ? '' : (node.variance | number:'1.0-1')}}{{node.status !== 'Gray' && node.kpi.UnitType === '%' ? '%' : ''}}
                </span>
             </div>

             <!-- Active Indicator -->
             @if (isNodeActive(node.kpi.KPI_Key)) {
                <div class="absolute top-0 right-0 p-0.5">
                   <div class="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></div>
                </div>
             }
          </div>
      </ng-template>
    </div>
  `
})
export class StrategicMapComponent implements AfterViewInit, OnDestroy {
  data = inject(DataService);
  simService = inject(SimulationService);
  
  perspectiveOrder = ['Financiera', 'Clientes', 'Procesos', 'Aprendizaje y Crecimiento'];

  selectedDate = signal('');
  hoverNode = signal<string | null>(null);
  lockedNode = signal<string | null>(null);
  activeNode = computed(() => this.lockedNode() || this.hoverNode());

  // Computed signal to reverse dates for display
  sortedDates = computed(() => [...this.data.dates()].reverse());

  @ViewChildren('kpiCard') cardElements!: QueryList<ElementRef>;
  @ViewChild('mainWrapper') mainWrapper!: ElementRef;

  lines = signal<{id: string, from: string, to: string, path: string}[]>([]);

  nodes = computed(() => {
    const date = this.selectedDate();
    const prevDate = this.getPrevMonthDate(date);
    const kpis = this.data.kpis();
    const sim = this.simService.simulatedFacts();
    const targets = this.data.factTarget();

    return kpis.map(kpi => {
      // Find current and previous values
      // Note: If sim logic returns NaN, we handle it as N/D
      const simNode = sim.find(f => f.KPI_Key === kpi.KPI_Key && f.YearMonth === date);
      const currentVal = simNode ? simNode.Value : 0; 

      const targetVal = targets.find(f => f.KPI_Key === kpi.KPI_Key && f.YearMonth === date)?.Value || kpi.DefaultTarget;
      
      const prevSimNode = sim.find(f => f.KPI_Key === kpi.KPI_Key && f.YearMonth === prevDate);
      const prevVal = prevSimNode ? prevSimNode.Value : 0;

      let variance = 0;
      // Calculate variance only if both numbers are valid numbers
      if (!isNaN(currentVal) && !isNaN(prevVal) && prevVal !== undefined) {
         if (kpi.UnitType === '%') {
             // For percentages, user requested "difference between current and past"
             // This implies arithmetic difference (Percentage Points).
             // e.g. 70% - 80% = -10. (Display -10%)
             variance = (currentVal - prevVal) * 100;
         } else {
             // For other units, user requested simple subtraction (absolute difference)
             variance = currentVal - prevVal;
         }
      }

      return { kpi, sim: currentVal, target: targetVal, variance: variance, status: this.getStatus(kpi, currentVal, targetVal) };
    });
  });

  visibleConnections = computed(() => {
    const allLines = this.lines();
    const active = this.activeNode();
    
    if (!active) {
       return allLines.map(l => ({
          ...l, color: '#cbd5e1', width: 1, marker: 'none', opacity: 0.15, animated: false, dashArray: 'none', highlighted: false
       }));
    }

    return allLines.map(l => {
       const isRelevant = l.from === active || l.to === active;
       if (isRelevant) {
           const isOutgoing = l.from === active;
           return {
              ...l,
              color: isOutgoing ? '#000000' : '#ea580c',
              width: 2,
              marker: isOutgoing ? 'url(#arrowhead-black)' : 'url(#arrowhead-orange)',
              opacity: 1,
              animated: true,
              dashArray: '4, 2',
              highlighted: true
           };
       } else {
           return {
              ...l, color: '#e2e8f0', width: 0.5, marker: 'none', opacity: 0.05, animated: false, dashArray: 'none', highlighted: false
           };
       }
    });
  });

  constructor() {
    // Set initial date to the most recent one (last in the array)
    const dates = this.data.dates();
    if (dates.length > 0) {
      this.selectedDate.set(dates[dates.length - 1]);
    } else {
      this.selectedDate.set('2024-01');
    }

    effect(() => {
       this.data.influenceMatrix();
       this.nodes();
       setTimeout(() => this.recalcLines(), 100);
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.recalcLines(), 500);
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.recalcLines();
  }

  getPrevMonthDate(ym: string) {
     const parts = ym.split('-');
     let y = parseInt(parts[0]);
     let m = parseInt(parts[1]);
     m = m - 1;
     if (m === 0) { m = 12; y = y - 1; }
     return `${y}-${m.toString().padStart(2, '0')}`;
  }

  toggleLock(kpiKey: string) {
    if (this.lockedNode() === kpiKey) this.lockedNode.set(null);
    else this.lockedNode.set(kpiKey);
  }

  isNodeActive(key: string) { return this.activeNode() === key; }

  isRelated(key: string) {
    const active = this.activeNode();
    if (!active) return false;
    const matrix = this.data.influenceMatrix();
    return matrix.some(m => (m.From_KPI_Key === active && m.To_KPI_Key === key) || (m.From_KPI_Key === key && m.To_KPI_Key === active));
  }

  getNodesByPerspective(persp: string) { return this.nodes().filter(n => n.kpi.Perspective === persp); }

  getNodesGroupedByObjective(persp: string) {
    const nodes = this.getNodesByPerspective(persp);
    const map = new Map<string, any[]>();
    nodes.forEach(n => {
       const obj = n.kpi.Objective || 'General';
       if (!map.has(obj)) map.set(obj, []);
       map.get(obj)!.push(n);
    });
    const groups: {objective: string, nodes: any[]}[] = [];
    map.forEach((nodes, objective) => groups.push({ objective, nodes }));
    return groups.sort((a,b) => a.objective.localeCompare(b.objective));
  }

  recalcLines() {
    if (!this.cardElements || !this.mainWrapper) return;
    const matrix = this.data.influenceMatrix();
    const newLines: {id: string, from: string, to: string, path: string}[] = [];
    
    // Get wrapper rect (reference point for absolute SVG)
    const wrapper = this.mainWrapper.nativeElement;
    const wrapperRect = wrapper.getBoundingClientRect();

    const elemMap = new Map<string, HTMLElement>();
    this.cardElements.forEach(el => {
       const native = el.nativeElement as HTMLElement;
       const id = native.id.replace('node-', '');
       elemMap.set(id, native);
    });

    matrix.forEach((rel, idx) => {
       const fromEl = elemMap.get(rel.From_KPI_Key);
       const toEl = elemMap.get(rel.To_KPI_Key);

       if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();
          
          if (fromRect.width === 0 || toRect.width === 0) return;

          // Calculate coordinates relative to the wrapper
          const fromCenterX = (fromRect.left - wrapperRect.left) + fromRect.width / 2;
          const fromCenterY = (fromRect.top - wrapperRect.top) + fromRect.height / 2;
          const toCenterX = (toRect.left - wrapperRect.left) + toRect.width / 2;
          const toCenterY = (toRect.top - wrapperRect.top) + toRect.height / 2;

          // Reduced threshold to 40 for tighter layout
          const isVertical = Math.abs(fromCenterY - toCenterY) > 40; 
          const isUpward = fromCenterY > toCenterY; 

          let path = '';
          if (isVertical) {
             if (isUpward) {
                // FLOWING UP
                const startX = (fromRect.left - wrapperRect.left) + fromRect.width / 2;
                const startY = (fromRect.top - wrapperRect.top); 
                
                const offsetX = (startX - toCenterX) * 0.15;
                const endX = (toRect.left - wrapperRect.left) + toRect.width / 2 + offsetX;
                const endY = (toRect.top - wrapperRect.top) + toRect.height; 

                // Flatter curves for compact layout
                const cy1 = startY - 10; 
                const cy2 = endY + 10;   
                path = `M ${startX} ${startY} C ${startX} ${cy1}, ${endX} ${cy2}, ${endX} ${endY}`;
             } else {
                // FLOWING DOWN
                const startX = (fromRect.left - wrapperRect.left) + fromRect.width / 2;
                const startY = (fromRect.top - wrapperRect.top) + fromRect.height; 
                
                const offsetX = (startX - toCenterX) * 0.15;
                const endX = (toRect.left - wrapperRect.left) + toRect.width / 2 + offsetX;
                const endY = (toRect.top - wrapperRect.top); 

                // Flatter curves for compact layout
                const cy1 = startY + 10;
                const cy2 = endY - 10;
                path = `M ${startX} ${startY} C ${startX} ${cy1}, ${endX} ${cy2}, ${endX} ${endY}`;
             }
          } else {
             // SIDEWAYS
             const isLeftToRight = fromCenterX < toCenterX;
             if (isLeftToRight) {
                const startX = (fromRect.left - wrapperRect.left) + fromRect.width;
                const startY = (fromRect.top - wrapperRect.top) + fromRect.height / 2;
                const endX = (toRect.left - wrapperRect.left);
                const endY = (toRect.top - wrapperRect.top) + toRect.height / 2;
                const cx = (startX + endX) / 2;
                path = `M ${startX} ${startY} C ${cx} ${startY}, ${cx} ${endY}, ${endX} ${endY}`;
             } else {
                const startX = (fromRect.left - wrapperRect.left);
                const startY = (fromRect.top - wrapperRect.top) + fromRect.height / 2;
                const endX = (toRect.left - wrapperRect.left) + toRect.width;
                const endY = (toRect.top - wrapperRect.top) + toRect.height / 2;
                const cx = (startX + endX) / 2;
                const cy = Math.min(startY, endY) - 15;
                path = `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`;
             }
          }

          newLines.push({ id: `link-${idx}`, from: rel.From_KPI_Key, to: rel.To_KPI_Key, path: path });
       }
    });

    this.lines.set(newLines);
  }

  getStatus(kpi: KPI, val: number, target: number): 'Green' | 'Amber' | 'Red' | 'Gray' {
    if (isNaN(val)) return 'Gray'; // Return Gray if NaN (N/D)

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

  getSimpleValue(kpi: KPI, val: number): string {
    if (isNaN(val)) return 'N/D';
    if (kpi.UnitType === '%') return (val * 100).toFixed(0);
    if (kpi.UnitType === 'USD') return '$' + val.toFixed(0);
    return val.toFixed(1);
  }
}
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-data-tables',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col p-4 gap-4 relative bg-slate-100">
      
      <!-- Toolbar -->
      <div class="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-200">
         <div class="flex gap-2">
            @for (t of types; track t) {
            <button 
                (click)="currentType.set(t)"
                class="px-3 py-1.5 rounded text-xs font-bold transition-colors border uppercase tracking-tight"
                [class.bg-black]="currentType() === t"
                [class.text-white]="currentType() === t"
                [class.border-black]="currentType() === t"
                [class.bg-slate-50]="currentType() !== t"
                [class.text-slate-600]="currentType() !== t"
                [class.border-slate-200]="currentType() !== t"
                [class.hover:bg-slate-200]="currentType() !== t"
            >
                {{t}}
            </button>
            }
         </div>

         <div class="flex gap-3">
            <button (click)="data.saveCurrentAsDefaults()" class="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shadow-sm" title="Makes current data the default for Reset">
               Set Current as Default
            </button>
            
            <div class="w-px h-6 bg-slate-200 mx-1"></div>

            <button (click)="data.resetToDefaults()" class="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold transition-colors shadow-sm border border-slate-300">
               Reset
            </button>
            <button (click)="data.hardReset()" class="flex items-center gap-2 px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold transition-colors shadow-sm">
               Factory Reset
            </button>

            <div class="w-px h-6 bg-slate-200 mx-1"></div>

            <button (click)="downloadTemplate()" class="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-black text-white rounded text-xs font-bold transition-colors shadow-sm">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
               Template
            </button>
            <button (click)="showUploadModal.set(true)" class="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold transition-colors shadow-sm">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
               Upload
            </button>
         </div>
      </div>

      <!-- Data View -->
      <div class="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
         <div class="p-2 border-b bg-slate-50 flex justify-between items-center">
            <span class="font-bold text-slate-700 px-2 text-sm">{{currentType()}}.csv View</span>
            <button (click)="copyToClipboard()" class="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1 rounded transition-colors font-bold">
               Copy Raw Text
            </button>
         </div>
         <div class="flex-1 overflow-auto bg-neutral-900 text-slate-300 font-mono text-xs p-4 whitespace-pre select-all">
            {{ csvContent() }}
         </div>
      </div>
      
      <!-- Helper -->
      <div class="bg-orange-50 p-4 rounded-lg border border-orange-100 text-slate-800 text-xs">
         <strong>Tip:</strong> Upload your Excel data, then click <b>"Set Current as Default"</b> to make it the permanent baseline for this browser.
      </div>

      <!-- Upload Modal -->
      @if (showUploadModal()) {
         <div class="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div class="bg-white rounded-xl shadow-2xl w-[500px] overflow-hidden transform transition-all border border-slate-200">
               <div class="bg-black px-6 py-4 flex justify-between items-center">
                  <h3 class="text-white font-bold text-lg">Upload Data File</h3>
                  <button (click)="showUploadModal.set(false)" class="text-neutral-400 hover:text-white">
                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
               </div>
               
               <div class="p-8 flex flex-col gap-6">
                  <div class="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer relative group">
                     <input type="file" (change)="onFileChange($event)" class="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls" />
                     <svg class="w-12 h-12 text-slate-400 mb-3 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                     <p class="text-sm font-bold text-slate-700">Drag and drop or click to select</p>
                     <p class="text-xs text-slate-500 mt-1">Supports .xlsx files</p>
                  </div>

                  @if (uploadStatus()) {
                     <div class="p-3 rounded bg-orange-50 text-orange-800 text-sm text-center font-bold">
                        {{ uploadStatus() }}
                     </div>
                  }
               </div>

               <div class="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                  <button (click)="showUploadModal.set(false)" class="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Cancel</button>
               </div>
            </div>
         </div>
      }
    </div>
  `
})
export class DataTablesComponent {
  data = inject(DataService);
  types: ('DimDate' | 'DimKPI' | 'FactKPI_Base' | 'FactKPI_Target' | 'InfluenceMatrix' | 'ScenarioInputs')[] = 
    ['DimDate', 'DimKPI', 'FactKPI_Base', 'FactKPI_Target', 'InfluenceMatrix', 'ScenarioInputs'];
  
  currentType = signal<typeof this.types[number]>('DimKPI');
  showUploadModal = signal(false);
  uploadStatus = signal('');

  csvContent = computed(() => {
     return this.data.getCSV(this.currentType());
  });

  copyToClipboard() {
    navigator.clipboard.writeText(this.csvContent()).then(() => {
       alert('Copied to clipboard!');
    });
  }

  downloadTemplate() {
    // create workbook
    const wb = XLSX.utils.book_new();

    // 1. DimKPI
    const kpiWs = XLSX.utils.json_to_sheet(this.data.kpis());
    XLSX.utils.book_append_sheet(wb, kpiWs, "DimKPI");

    // 2. FactBase
    // Ensure we export null/NaN as empty/blank for Excel friendliness
    const facts = this.data.factBase().map(f => ({
        ...f,
        Value: isNaN(f.Value) ? '' : f.Value
    }));
    const baseWs = XLSX.utils.json_to_sheet(facts);
    XLSX.utils.book_append_sheet(wb, baseWs, "FactKPI_Base");

    // 3. FactTarget
    const targetWs = XLSX.utils.json_to_sheet(this.data.factTarget());
    XLSX.utils.book_append_sheet(wb, targetWs, "FactKPI_Target");

    // 4. Matrix
    const matrixWs = XLSX.utils.json_to_sheet(this.data.influenceMatrix());
    XLSX.utils.book_append_sheet(wb, matrixWs, "InfluenceMatrix");

    // Write file
    XLSX.writeFile(wb, "BSC_Simulator_Data.xlsx");
  }

  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) {
       this.uploadStatus.set('Cannot use multiple files');
       return;
    }

    this.uploadStatus.set('Reading file...');
    
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, {type: 'binary'});

        const extractedData: any = {};

        // Parse specific sheets
        if (wb.Sheets['DimKPI']) extractedData.kpis = XLSX.utils.sheet_to_json(wb.Sheets['DimKPI']);
        if (wb.Sheets['FactKPI_Base']) extractedData.factsBase = XLSX.utils.sheet_to_json(wb.Sheets['FactKPI_Base']);
        if (wb.Sheets['FactKPI_Target']) extractedData.factsTarget = XLSX.utils.sheet_to_json(wb.Sheets['FactKPI_Target']);
        if (wb.Sheets['InfluenceMatrix']) extractedData.matrix = XLSX.utils.sheet_to_json(wb.Sheets['InfluenceMatrix']);

        // Update Service
        this.data.loadExternalData(extractedData);
        
        this.uploadStatus.set('Success! Data updated.');
        setTimeout(() => {
           this.showUploadModal.set(false);
           this.uploadStatus.set('');
        }, 1500);

      } catch (err) {
         console.error(err);
         this.uploadStatus.set('Error parsing Excel file. Check format.');
      }
    };
    reader.readAsBinaryString(target.files[0]);
  }
}
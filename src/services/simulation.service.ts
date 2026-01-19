import { Injectable, computed, inject } from '@angular/core';
import { DataService, FactBase } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private data = inject(DataService);

  // Computes the simulated values based on base values, inputs, and influence matrix
  simulatedFacts = computed(() => {
    const dates = this.data.dates();
    const kpis = this.data.kpis();
    const base = this.data.factBase();
    const inputs = this.data.scenarioInputs();
    const matrix = this.data.influenceMatrix();
    
    // Initialize results map for fast access: results[Date][KPI] = Value
    const results: Record<string, Record<string, number>> = {};
    
    // Pre-populate with base values
    dates.forEach(date => {
      results[date] = {};
      kpis.forEach(kpi => {
        const b = base.find(f => f.YearMonth === date && f.KPI_Key === kpi.KPI_Key);
        // Important: Preserve NaN if it exists, otherwise default to 0 if record is missing
        if (b && b.Value !== undefined) {
             results[date][kpi.KPI_Key] = b.Value;
        } else {
             results[date][kpi.KPI_Key] = 0;
        }
      });
    });

    const kpiMap = new Map(kpis.map(k => [k.KPI_Key, k]));
    
    // Store Total Delta Pct for each KPI/Date
    const totalDeltas: Record<string, Record<string, number>> = {}; 
    dates.forEach(d => totalDeltas[d] = {});

    // Helper to get total delta safely
    const getDelta = (kpi: string, dateIdx: number): number => {
      if (dateIdx < 0) return 0;
      const d = dates[dateIdx];
      return totalDeltas[d]?.[kpi] || 0;
    };

    // Initialize with User Inputs
    inputs.forEach(input => {
      if (!totalDeltas[input.YearMonth]) totalDeltas[input.YearMonth] = {};
      totalDeltas[input.YearMonth][input.KPI_Key] = input.DeltaPct;
    });

    // Iterative propagation (3 passes to cover chains like A->B->C->D)
    for (let pass = 0; pass < 5; pass++) {
      dates.forEach((date, dateIdx) => {
        kpis.forEach(toKPI => {
          let incomingImpact = 0;
          
          // Find influencers
          const influencers = matrix.filter(m => m.To_KPI_Key === toKPI.KPI_Key);
          
          influencers.forEach(inf => {
            const sourceDelta = getDelta(inf.From_KPI_Key, dateIdx - inf.LagMonths);
            incomingImpact += sourceDelta * inf.Direction * inf.Elasticity;
          });

          // User Input for this KPI
          const userInput = inputs.find(i => i.YearMonth === date && i.KPI_Key === toKPI.KPI_Key)?.DeltaPct || 0;
          
          totalDeltas[date][toKPI.KPI_Key] = userInput + incomingImpact;
        });
      });
    }

    // Final Value Calculation
    const simulatedFacts: FactBase[] = [];
    dates.forEach(date => {
      kpis.forEach(kpi => {
        const baseVal = results[date][kpi.KPI_Key];
        
        // If Base is N/D (NaN), Result should be N/D (NaN)
        if (isNaN(baseVal)) {
            simulatedFacts.push({
                YearMonth: date,
                KPI_Key: kpi.KPI_Key,
                Value: NaN
            });
            return;
        }

        const delta = totalDeltas[date][kpi.KPI_Key] || 0;
        let finalVal = baseVal * (1 + delta);

        // Limits
        if (kpi.UnitType === '%') {
            finalVal = Math.max(0, Math.min(1, finalVal)); // Clamp 0-1
        } else if (kpi.UnitType === 'N°' || kpi.UnitType === 'Días' || kpi.UnitType === 'Horas') {
            finalVal = Math.max(0, finalVal); // Non-negative
        }
        
        // Special clamp for SPI/CPI to keep reasonable
        if (kpi.KPI_Name === 'SPI' || kpi.KPI_Name === 'CPI') {
            finalVal = Math.max(0.5, Math.min(1.5, finalVal));
        }

        simulatedFacts.push({
          YearMonth: date,
          KPI_Key: kpi.KPI_Key,
          Value: finalVal
        });
      });
    });

    return simulatedFacts;
  });
}
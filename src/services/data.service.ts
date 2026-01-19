import { Injectable, signal, computed, effect } from '@angular/core';

export interface KPI {
  KPI_Key: string;
  KPI_Name: string;
  Perspective: string;
  Objective: string;
  UnitType: string;
  HigherIsBetter: boolean;
  DefaultTarget: number;
  BaseValue: number; // Simplified for demo, usually in Fact
}

export interface FactBase {
  YearMonth: string;
  KPI_Key: string;
  Value: number; // We will use NaN to represent "N/D"
}

export interface Influence {
  From_KPI_Key: string;
  To_KPI_Key: string;
  Direction: number;
  Elasticity: number;
  LagMonths: number;
}

export interface ScenarioInput {
  YearMonth: string;
  KPI_Key: string;
  DeltaPct: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly STORAGE_KEY = 'BSC_DATA_V1';
  private readonly DEFAULTS_KEY = 'BSC_USER_DEFAULTS';

  // Signals for state
  kpis = signal<KPI[]>([]);
  factBase = signal<FactBase[]>([]);
  factTarget = signal<FactBase[]>([]);
  influenceMatrix = signal<Influence[]>([]);
  scenarioInputs = signal<ScenarioInput[]>([]);
  
  // Date range
  dates = signal<string[]>([]);

  constructor() {
    // 1. Try to load from Active Session
    if (!this.loadFromStorage(this.STORAGE_KEY)) {
      // 2. Try to load User Defaults
      if (!this.loadFromStorage(this.DEFAULTS_KEY)) {
         // 3. If no data, generate Factory Defaults
         this.generateInitialData();
      }
    }

    // 4. Setup auto-save effect (Always saves to Active Session)
    effect(() => {
      this.saveToStorage(this.STORAGE_KEY);
    });
  }

  // Save the current state as the User's "Default" state
  saveCurrentAsDefaults() {
    this.saveToStorage(this.DEFAULTS_KEY);
    alert('Current data saved as your new Default configuration.');
  }

  // Restore to defaults (User's if exist, otherwise Factory)
  resetToDefaults() {
    // Try loading user defaults
    const hasDefaults = this.loadFromStorage(this.DEFAULTS_KEY);
    
    if (!hasDefaults) {
      // If no user defaults, generate factory data
      this.generateInitialData();
    }
    
    // Note: The effect will automatically sync this new state to STORAGE_KEY
    // We reload to ensure clean UI state in case of deep component issues, 
    // but strictly speaking, signals handle it. 
    // For safety with D3/Charts that might not react perfectly:
    setTimeout(() => window.location.reload(), 100);
  }

  // Hard reset to original Factory settings (clears User Defaults too)
  hardReset() {
    if (confirm('Are you sure? This will delete your saved defaults and active session data.')) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.DEFAULTS_KEY);
      this.generateInitialData();
      setTimeout(() => window.location.reload(), 100);
    }
  }

  private loadFromStorage(key: string): boolean {
    const json = localStorage.getItem(key);
    if (!json) return false;

    try {
      const data = JSON.parse(json);
      
      if (Array.isArray(data.kpis)) this.kpis.set(data.kpis);
      
      if (Array.isArray(data.factBase)) {
        // Convert nulls back to NaN for N/D logic
        const facts = data.factBase.map((f: any) => ({
          ...f,
          Value: (f.Value === null || f.Value === 'null') ? NaN : Number(f.Value)
        }));
        this.factBase.set(facts);
      }
      
      if (Array.isArray(data.factTarget)) this.factTarget.set(data.factTarget);
      if (Array.isArray(data.influenceMatrix)) this.influenceMatrix.set(data.influenceMatrix);
      if (Array.isArray(data.scenarioInputs)) this.scenarioInputs.set(data.scenarioInputs);
      if (Array.isArray(data.dates)) this.dates.set(data.dates);

      return true;
    } catch (err) {
      console.error(`Failed to load from storage (${key})`, err);
      return false;
    }
  }

  private saveToStorage(key: string) {
    const state = {
      kpis: this.kpis(),
      // Convert NaN to null for JSON safety
      factBase: this.factBase().map(f => ({
        ...f,
        Value: isNaN(f.Value) ? null : f.Value
      })),
      factTarget: this.factTarget(),
      influenceMatrix: this.influenceMatrix(),
      scenarioInputs: this.scenarioInputs(),
      dates: this.dates()
    };
    localStorage.setItem(key, JSON.stringify(state));
  }

  private generateInitialData() {
    // 1. Generate Dates (Jan 2024 - Dec 2025)
    const dates: string[] = [];
    for (let y = 2024; y <= 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        dates.push(`${y}-${m.toString().padStart(2, '0')}`);
      }
    }
    this.dates.set(dates);

    // 2. KPIs (Updated BaseValues to be mostly Green/Amber)
    const kpiData: KPI[] = [
      // Aprendizaje y Crecimiento
      { KPI_Key: 'K001', KPI_Name: '% personal capacitado', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Mejorar competencias', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.85, BaseValue: 0.86 },
      { KPI_Key: 'K002', KPI_Name: '% Evaluación Clima', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Mejorar clima', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.80, BaseValue: 0.82 },
      { KPI_Key: 'K003', KPI_Name: '% equipo TI especializado', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Especialización', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.50, BaseValue: 0.52 },
      { KPI_Key: 'K004', KPI_Name: '% procesos documentados', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Gestión del Conocimiento', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.90, BaseValue: 0.88 }, // Slightly below (Amber)
      { KPI_Key: 'K005', KPI_Name: 'One to One (Feedback)', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Feedback continuo', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 0.95 },
      { KPI_Key: 'K006', KPI_Name: '% Planes Logrados', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Eficacia', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.90, BaseValue: 0.92 },
      { KPI_Key: 'K007', KPI_Name: 'Tasa de reutilización del conocimiento', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Eficiencia', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.40, BaseValue: 0.38 }, // Amber
      { KPI_Key: 'K008', KPI_Name: 'Usuarios entrenados', Perspective: 'Aprendizaje y Crecimiento', Objective: 'Seguridad', UnitType: 'N°', HigherIsBetter: true, DefaultTarget: 200, BaseValue: 210 },
      
      // Clientes
      { KPI_Key: 'K010', KPI_Name: '%Adopción', Perspective: 'Clientes', Objective: 'Uso de herramientas', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.70, BaseValue: 0.72 },
      { KPI_Key: 'K011', KPI_Name: '%Usuarios Capacitados', Perspective: 'Clientes', Objective: 'Capacitación usuario', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.80, BaseValue: 0.81 },
      { KPI_Key: 'K012', KPI_Name: '%Tickets de Desconocimiento de Negocio', Perspective: 'Clientes', Objective: 'Reducir brecha', UnitType: '%', HigherIsBetter: false, DefaultTarget: 0.05, BaseValue: 0.04 },
      { KPI_Key: 'K013', KPI_Name: 'Comunicados enviados', Perspective: 'Clientes', Objective: 'Comunicación', UnitType: 'N°', HigherIsBetter: true, DefaultTarget: 10, BaseValue: 12 },

      // Financiera
      { KPI_Key: 'K020', KPI_Name: 'ROI TI (A nivel de proyecto)', Perspective: 'Financiera', Objective: 'Rentabilidad', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.20, BaseValue: 1.25 },
      { KPI_Key: 'K021', KPI_Name: 'Variación presupuestal (%)', Perspective: 'Financiera', Objective: 'Control de costos', UnitType: '%', HigherIsBetter: false, DefaultTarget: 0.05, BaseValue: 0.04 },
      { KPI_Key: 'K022', KPI_Name: 'ROI de Demandas', Perspective: 'Financiera', Objective: 'Valor', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.15, BaseValue: 1.16 },
      { KPI_Key: 'K023', KPI_Name: 'Costo por Usuario', Perspective: 'Financiera', Objective: 'Eficiencia de costos', UnitType: 'USD', HigherIsBetter: false, DefaultTarget: 50, BaseValue: 48 },
      { KPI_Key: 'K024', KPI_Name: 'Facturas vencidad', Perspective: 'Financiera', Objective: 'Salud financiera', UnitType: 'N°', HigherIsBetter: false, DefaultTarget: 0, BaseValue: 0 },
      { KPI_Key: 'K025', KPI_Name: 'Activos no Licenciados', Perspective: 'Financiera', Objective: 'Compliance', UnitType: 'N°', HigherIsBetter: false, DefaultTarget: 0, BaseValue: 1 }, // Red/Amber

      // Procesos
      { KPI_Key: 'K030', KPI_Name: 'MTTR (Mean Time to Restore Service)', Perspective: 'Procesos', Objective: 'Agilidad', UnitType: 'Horas', HigherIsBetter: false, DefaultTarget: 4, BaseValue: 3.8 },
      { KPI_Key: 'K031', KPI_Name: '% reducción de incidentes recurrentes', Perspective: 'Procesos', Objective: 'Calidad', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.20, BaseValue: 0.22 },
      { KPI_Key: 'K032', KPI_Name: '% de cambios exitosos', Perspective: 'Procesos', Objective: 'Estabilidad', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.98, BaseValue: 0.985 },
      { KPI_Key: 'K033', KPI_Name: 'Nivel de Cumplimiento / tiempo estandar', Perspective: 'Procesos', Objective: 'Eficiencia', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.90, BaseValue: 0.92 },
      { KPI_Key: 'K034', KPI_Name: '% cumplimiento de SLA', Perspective: 'Procesos', Objective: 'Servicio', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.95, BaseValue: 0.96 },
      { KPI_Key: 'K035', KPI_Name: 'Disponibilidad del servicio (%)', Perspective: 'Procesos', Objective: 'Continuidad', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.999, BaseValue: 0.9995 },
      { KPI_Key: 'K036', KPI_Name: '% servicios sin saturación', Perspective: 'Procesos', Objective: 'Capacidad', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.95, BaseValue: 0.96 },
      { KPI_Key: 'K037', KPI_Name: '% pruebas de continuidad exitosas (ITSCM)', Perspective: 'Procesos', Objective: 'Resiliencia', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 1.0 },
      { KPI_Key: 'K038', KPI_Name: 'Nº incidentes de seguridad de alto impacto', Perspective: 'Procesos', Objective: 'Seguridad', UnitType: 'N°', HigherIsBetter: false, DefaultTarget: 0, BaseValue: 0 },
      { KPI_Key: 'K039', KPI_Name: 'N° de dispositivos parchados', Perspective: 'Procesos', Objective: 'Seguridad', UnitType: 'N°', HigherIsBetter: true, DefaultTarget: 1000, BaseValue: 1020 },
      { KPI_Key: 'K040', KPI_Name: 'Antigüedad de los equipos', Perspective: 'Procesos', Objective: 'Renovación', UnitType: 'Años', HigherIsBetter: false, DefaultTarget: 3, BaseValue: 2.8 },
      { KPI_Key: 'K041', KPI_Name: 'Contratos Vencidos', Perspective: 'Procesos', Objective: 'Gestión', UnitType: 'N°', HigherIsBetter: false, DefaultTarget: 0, BaseValue: 0 },
      { KPI_Key: 'K042', KPI_Name: '% proveedores con SLA cumplido', Perspective: 'Procesos', Objective: 'Proveedores', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.95, BaseValue: 0.94 }, // Amber
      { KPI_Key: 'K043', KPI_Name: 'SPI', Perspective: 'Procesos', Objective: 'Proyectos', UnitType: 'Ratio', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 1.05 },
      { KPI_Key: 'K044', KPI_Name: 'CPI', Perspective: 'Procesos', Objective: 'Proyectos', UnitType: 'Ratio', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 0.98 }, // Amber
      { KPI_Key: 'K045', KPI_Name: '% De riesgos mitigados', Perspective: 'Procesos', Objective: 'Riesgo', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.90, BaseValue: 0.92 },
      { KPI_Key: 'K046', KPI_Name: 'Indice de desempeño de proveedor', Perspective: 'Procesos', Objective: 'Proveedores', UnitType: 'Ratio', HigherIsBetter: true, DefaultTarget: 0.90, BaseValue: 0.92 },
      { KPI_Key: 'K047', KPI_Name: 'Cumplimiento de las pruebas', Perspective: 'Procesos', Objective: 'Calidad', UnitType: '%', HigherIsBetter: true, DefaultTarget: 0.95, BaseValue: 0.96 },
      { KPI_Key: 'K048', KPI_Name: 'Cantidad de Errores encontrados', Perspective: 'Procesos', Objective: 'Calidad', UnitType: 'N°', HigherIsBetter: false, DefaultTarget: 10, BaseValue: 8 },
      { KPI_Key: 'K049', KPI_Name: '% de Cumplimiento de Auditoria', Perspective: 'Procesos', Objective: 'Compliance', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 1.0 },
      { KPI_Key: 'K050', KPI_Name: '% Auditorias Cerradas', Perspective: 'Procesos', Objective: 'Compliance', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 0.95 },
      { KPI_Key: 'K051', KPI_Name: 'Usuarios con MFA', Perspective: 'Procesos', Objective: 'Seguridad', UnitType: 'N°', HigherIsBetter: true, DefaultTarget: 500, BaseValue: 550 },
      { KPI_Key: 'K052', KPI_Name: 'Usuarios con privilegios incorrectos', Perspective: 'Procesos', Objective: 'Seguridad', UnitType: 'N°', HigherIsBetter: false, DefaultTarget: 0, BaseValue: 2 }, // Red
      { KPI_Key: 'K053', KPI_Name: 'Equipos sin Protección', Perspective: 'Procesos', Objective: 'Seguridad', UnitType: 'N°', HigherIsBetter: false, DefaultTarget: 0, BaseValue: 1 }, // Red
      { KPI_Key: 'K054', KPI_Name: '% Nivel de cumplimiento de vulnerabilidades', Perspective: 'Procesos', Objective: 'Seguridad', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 0.98 },
      { KPI_Key: 'K055', KPI_Name: '% Cumplimiento de Backup', Perspective: 'Procesos', Objective: 'Operaciones', UnitType: '%', HigherIsBetter: true, DefaultTarget: 1.0, BaseValue: 1.0 },
    ];
    this.kpis.set(kpiData);

    // 3. Fact Base & Target
    const factsBase: FactBase[] = [];
    const factsTarget: FactBase[] = [];

    dates.forEach(date => {
      kpiData.forEach(kpi => {
        // No random variance - Pure Default values for stability
        factsBase.push({
          YearMonth: date,
          KPI_Key: kpi.KPI_Key,
          Value: kpi.BaseValue
        });
        factsTarget.push({
          YearMonth: date,
          KPI_Key: kpi.KPI_Key,
          Value: kpi.DefaultTarget
        });
      });
    });
    this.factBase.set(factsBase);
    this.factTarget.set(factsTarget);

    // 4. Influence Matrix
    const influences: Influence[] = [
        { From_KPI_Key: 'K004', To_KPI_Key: 'K030', Direction: -1, Elasticity: 0.25, LagMonths: 1 },
        { From_KPI_Key: 'K007', To_KPI_Key: 'K030', Direction: -1, Elasticity: 0.20, LagMonths: 0 },
        { From_KPI_Key: 'K032', To_KPI_Key: 'K030', Direction: -1, Elasticity: 0.15, LagMonths: 0 },
        { From_KPI_Key: 'K047', To_KPI_Key: 'K032', Direction: 1, Elasticity: 0.30, LagMonths: 0 },
        { From_KPI_Key: 'K048', To_KPI_Key: 'K032', Direction: -1, Elasticity: 0.20, LagMonths: 0 },
        { From_KPI_Key: 'K030', To_KPI_Key: 'K034', Direction: -1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K035', To_KPI_Key: 'K034', Direction: 1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K036', To_KPI_Key: 'K030', Direction: -1, Elasticity: 0.20, LagMonths: 0 },
        { From_KPI_Key: 'K012', To_KPI_Key: 'K036', Direction: -1, Elasticity: 0.30, LagMonths: 0 },
        { From_KPI_Key: 'K011', To_KPI_Key: 'K010', Direction: 1, Elasticity: 0.30, LagMonths: 1 },
        { From_KPI_Key: 'K013', To_KPI_Key: 'K011', Direction: 1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K007', To_KPI_Key: 'K012', Direction: -1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K010', To_KPI_Key: 'K020', Direction: 1, Elasticity: 0.35, LagMonths: 2 },
        { From_KPI_Key: 'K010', To_KPI_Key: 'K022', Direction: 1, Elasticity: 0.30, LagMonths: 2 },
        { From_KPI_Key: 'K008', To_KPI_Key: 'K038', Direction: -1, Elasticity: 0.25, LagMonths: 1 },
        { From_KPI_Key: 'K051', To_KPI_Key: 'K038', Direction: -1, Elasticity: 0.20, LagMonths: 1 },
        { From_KPI_Key: 'K052', To_KPI_Key: 'K038', Direction: 1, Elasticity: 0.30, LagMonths: 0 },
        { From_KPI_Key: 'K039', To_KPI_Key: 'K038', Direction: -1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K054', To_KPI_Key: 'K038', Direction: -1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K053', To_KPI_Key: 'K038', Direction: 1, Elasticity: 0.30, LagMonths: 0 },
        { From_KPI_Key: 'K038', To_KPI_Key: 'K035', Direction: -1, Elasticity: 0.30, LagMonths: 0 },
        { From_KPI_Key: 'K055', To_KPI_Key: 'K037', Direction: 1, Elasticity: 0.35, LagMonths: 0 },
        { From_KPI_Key: 'K037', To_KPI_Key: 'K035', Direction: 1, Elasticity: 0.20, LagMonths: 0 },
        { From_KPI_Key: 'K042', To_KPI_Key: 'K034', Direction: 1, Elasticity: 0.20, LagMonths: 0 },
        { From_KPI_Key: 'K046', To_KPI_Key: 'K042', Direction: 1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K041', To_KPI_Key: 'K035', Direction: -1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K024', To_KPI_Key: 'K035', Direction: -1, Elasticity: 0.20, LagMonths: 0 },
        { From_KPI_Key: 'K040', To_KPI_Key: 'K030', Direction: 1, Elasticity: 0.15, LagMonths: 0 },
        { From_KPI_Key: 'K040', To_KPI_Key: 'K035', Direction: -1, Elasticity: 0.15, LagMonths: 0 },
        { From_KPI_Key: 'K023', To_KPI_Key: 'K021', Direction: 1, Elasticity: 0.20, LagMonths: 0 },
        { From_KPI_Key: 'K025', To_KPI_Key: 'K049', Direction: -1, Elasticity: 0.30, LagMonths: 0 },
        { From_KPI_Key: 'K049', To_KPI_Key: 'K050', Direction: 1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K043', To_KPI_Key: 'K022', Direction: 1, Elasticity: 0.20, LagMonths: 1 },
        { From_KPI_Key: 'K044', To_KPI_Key: 'K021', Direction: -1, Elasticity: 0.20, LagMonths: 1 },
        { From_KPI_Key: 'K045', To_KPI_Key: 'K043', Direction: 1, Elasticity: 0.20, LagMonths: 1 },
        { From_KPI_Key: 'K006', To_KPI_Key: 'K043', Direction: 1, Elasticity: 0.20, LagMonths: 1 },
        { From_KPI_Key: 'K005', To_KPI_Key: 'K006', Direction: 1, Elasticity: 0.25, LagMonths: 0 },
        { From_KPI_Key: 'K001', To_KPI_Key: 'K047', Direction: 1, Elasticity: 0.25, LagMonths: 1 },
        { From_KPI_Key: 'K003', To_KPI_Key: 'K048', Direction: -1, Elasticity: 0.20, LagMonths: 1 },
    ];
    this.influenceMatrix.set(influences);

    // 5. Initial Scenario Inputs (Empty)
    this.scenarioInputs.set([]);
  }

  // Called when user uploads an Excel file
  loadExternalData(data: {
    kpis?: any[],
    factsBase?: any[],
    factsTarget?: any[],
    matrix?: any[]
  }) {
    // 1. Update KPIs
    if (data.kpis && data.kpis.length > 0) {
      const newKPIs: KPI[] = data.kpis.map(row => ({
        KPI_Key: row.KPI_Key?.toString() || '',
        KPI_Name: row.KPI_Name?.toString() || '',
        Perspective: row.Perspective?.toString() || 'Procesos',
        Objective: row.Objective?.toString() || '',
        UnitType: row.UnitType?.toString() || 'N°',
        HigherIsBetter: row.HigherIsBetter === true || row.HigherIsBetter === 'TRUE' || row.HigherIsBetter === 'true',
        DefaultTarget: parseFloat(row.DefaultTarget) || 0,
        BaseValue: parseFloat(row.BaseValue) || 0
      })).filter(k => k.KPI_Key); // Filter valid keys
      
      this.kpis.set(newKPIs);
    }

    // 2. Update Fact Base
    if (data.factsBase && data.factsBase.length > 0) {
      const newBase: FactBase[] = data.factsBase.map(row => {
        // Handle "N/D" or empty values from Excel as NaN
        // If the value is undefined, empty string, or a symbol like "-", treat as NaN
        let val = NaN;
        if (row.Value !== undefined && row.Value !== null && row.Value !== '' && row.Value !== '-') {
           const parsed = parseFloat(row.Value);
           // If parsing returns a number, use it. Otherwise leave as NaN.
           if (!isNaN(parsed)) {
             val = parsed;
           }
        }
        
        return {
          YearMonth: row.YearMonth?.toString(),
          KPI_Key: row.KPI_Key?.toString(),
          Value: val
        };
      }).filter(f => f.YearMonth && f.KPI_Key);
      
      this.factBase.set(newBase);

      // Extract unique dates from fact base
      const uniqueDates = Array.from(new Set(newBase.map(f => f.YearMonth))).sort();
      if (uniqueDates.length > 0) {
        this.dates.set(uniqueDates);
      }
    }

    // 3. Update Fact Target
    if (data.factsTarget && data.factsTarget.length > 0) {
      const newTarget: FactBase[] = data.factsTarget.map(row => ({
        YearMonth: row.YearMonth?.toString(),
        KPI_Key: row.KPI_Key?.toString(),
        Value: parseFloat(row.Value) || 0
      })).filter(f => f.YearMonth && f.KPI_Key);

      this.factTarget.set(newTarget);
    }

    // 4. Update Matrix
    if (data.matrix && data.matrix.length > 0) {
      const newMatrix: Influence[] = data.matrix.map(row => ({
        From_KPI_Key: row.From_KPI_Key?.toString(),
        To_KPI_Key: row.To_KPI_Key?.toString(),
        Direction: parseFloat(row.Direction) || 1,
        Elasticity: parseFloat(row.Elasticity) || 0.1,
        LagMonths: parseFloat(row.LagMonths) || 0
      })).filter(m => m.From_KPI_Key && m.To_KPI_Key);

      this.influenceMatrix.set(newMatrix);
    }
  }

  getCSV(type: 'DimDate' | 'DimKPI' | 'FactKPI_Base' | 'FactKPI_Target' | 'InfluenceMatrix' | 'ScenarioInputs'): string {
    let header = '';
    let rows: string[] = [];

    switch (type) {
      case 'DimDate':
        header = 'DateKey,Year,Month';
        rows = this.dates().map(d => `${d},${d.split('-')[0]},${d.split('-')[1]}`);
        break;
      case 'DimKPI':
        header = 'KPI_Key,KPI_Name,Perspective,Objective,UnitType,HigherIsBetter,DefaultTarget';
        rows = this.kpis().map(k => `${k.KPI_Key},"${k.KPI_Name}","${k.Perspective}","${k.Objective}",${k.UnitType},${k.HigherIsBetter},${k.DefaultTarget}`);
        break;
      case 'FactKPI_Base':
        header = 'YearMonth,KPI_Key,Value';
        rows = this.factBase().map(f => `${f.YearMonth},${f.KPI_Key},${isNaN(f.Value) ? '' : f.Value.toFixed(4)}`);
        break;
      case 'FactKPI_Target':
        header = 'YearMonth,KPI_Key,Value';
        rows = this.factTarget().map(f => `${f.YearMonth},${f.KPI_Key},${f.Value.toFixed(4)}`);
        break;
      case 'InfluenceMatrix':
        header = 'From_KPI_Key,To_KPI_Key,Direction,Elasticity,LagMonths';
        rows = this.influenceMatrix().map(i => `${i.From_KPI_Key},${i.To_KPI_Key},${i.Direction},${i.Elasticity},${i.LagMonths}`);
        break;
      case 'ScenarioInputs':
        header = 'YearMonth,KPI_Key,DeltaPct';
        rows = this.scenarioInputs().map(s => `${s.YearMonth},${s.KPI_Key},${s.DeltaPct}`);
        break;
    }

    return header + '\n' + rows.join('\n');
  }
}
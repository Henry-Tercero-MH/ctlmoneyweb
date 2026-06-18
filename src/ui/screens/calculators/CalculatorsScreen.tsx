import { useState } from 'react';
import {
  TrendingUp, PieChart, Shield, CreditCard,
  Target, BarChart2, DollarSign, ChevronRight, ChevronLeft,
} from 'lucide-react';
import styles from './CalculatorsScreen.module.css';

// ── Tipos ──────────────────────────────────────────────────────────────────
type CalcId = 'compound' | 'rule503020' | 'emergency' | 'debt' | 'savings' | 'roi' | 'inflation';

interface CalcDef {
  id: CalcId;
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

const CALCS: CalcDef[] = [
  { id: 'compound',   name: 'Interés compuesto',   desc: 'Proyecta el crecimiento de una inversión a lo largo del tiempo.',      icon: <TrendingUp size={22} strokeWidth={1.75} />,  color: '#3f7a3a' },
  { id: 'rule503020', name: 'Regla 50/30/20',       desc: 'Divide tu ingreso mensual en necesidades, deseos y ahorro.',           icon: <PieChart size={22} strokeWidth={1.75} />,    color: '#f5c800' },
  { id: 'emergency',  name: 'Fondo de emergencia',  desc: 'Calcula cuántos meses de gastos tienes cubiertos.',                   icon: <Shield size={22} strokeWidth={1.75} />,      color: '#60a5fa' },
  { id: 'debt',       name: 'Costo real de deuda',  desc: 'Cuánto pagas en total con intereses en un crédito.',                  icon: <CreditCard size={22} strokeWidth={1.75} />,  color: '#f87171' },
  { id: 'savings',    name: 'Proyección de ahorro', desc: '¿En cuánto tiempo alcanzas tu meta ahorrando X al mes?',              icon: <Target size={22} strokeWidth={1.75} />,      color: '#a78bfa' },
  { id: 'roi',        name: 'ROI',                  desc: 'Calcula el retorno sobre una inversión.',                             icon: <BarChart2 size={22} strokeWidth={1.75} />,   color: '#fb923c' },
  { id: 'inflation',  name: 'Inflación',             desc: 'Poder adquisitivo de una cantidad a lo largo del tiempo.',           icon: <DollarSign size={22} strokeWidth={1.75} />,  color: '#34d399' },
];

// ── Calculadoras individuales ───────────────────────────────────────────────

function n(v: string) { return parseFloat(v.replace(',', '.')) || 0; }
function fmt(v: number, decimals = 2) {
  return v.toLocaleString('es-GT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// 1. Interés compuesto
function CompoundCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('');
  const [monthly, setMonthly] = useState('');

  const P = n(principal);
  const r = n(rate) / 100;
  const t = n(years);
  const m = n(monthly);
  const hasResult = P > 0 && r > 0 && t > 0;

  // FV = P*(1+r)^t + m * (((1+r)^t - 1) / r)  — anual simplificado
  const fv = hasResult
    ? P * Math.pow(1 + r, t) + (m * 12) * ((Math.pow(1 + r, t) - 1) / r)
    : 0;
  const totalInvested = P + m * 12 * t;
  const gains = fv - totalInvested;

  return (
    <>
      <p className={styles.hint}>Calcula el valor futuro de una inversión con aportaciones mensuales opcionales.</p>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Capital inicial</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="10000" value={principal} onChange={e => setPrincipal(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Aporte mensual</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="500" value={monthly} onChange={e => setMonthly(e.target.value)} />
        </div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Tasa anual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="8" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Años</label>
          <input className={styles.input} type="number" inputMode="numeric" placeholder="10" value={years} onChange={e => setYears(e.target.value)} />
        </div>
      </div>
      {hasResult && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Valor futuro</p>
          <p className={styles.resultMain}>Q {fmt(fv)}</p>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Total invertido</span>
            <span className={styles.resultValue}>Q {fmt(totalInvested)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Ganancias</span>
            <span className={`${styles.resultValue} ${styles.resultValueGreen}`}>Q {fmt(gains)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Rendimiento</span>
            <span className={`${styles.resultValue} ${styles.resultValueYellow}`}>{fmt((gains / totalInvested) * 100, 1)}%</span>
          </div>
        </div>
      )}
    </>
  );
}

// 2. Regla 50/30/20
function Rule503020Calc() {
  const [income, setIncome] = useState('');
  const I = n(income);
  const needs = I * 0.5;
  const wants = I * 0.3;
  const savings = I * 0.2;

  return (
    <>
      <p className={styles.hint}>Distribución recomendada de tu ingreso mensual neto.</p>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Ingreso mensual neto</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="5000" value={income} onChange={e => setIncome(e.target.value)} />
      </div>
      {I > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Distribución sugerida</p>
          <div className={styles.barSegments}>
            <div className={styles.barSeg} style={{ width: '50%', background: '#f87171' }} />
            <div className={styles.barSeg} style={{ width: '30%', background: '#f5c800' }} />
            <div className={styles.barSeg} style={{ width: '20%', background: '#4ade80' }} />
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>50% Necesidades</span>
            <span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(needs)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>30% Deseos</span>
            <span className={`${styles.resultValue} ${styles.resultValueYellow}`}>Q {fmt(wants)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>20% Ahorro / deudas</span>
            <span className={`${styles.resultValue} ${styles.resultValueGreen}`}>Q {fmt(savings)}</span>
          </div>
        </div>
      )}
    </>
  );
}

// 3. Fondo de emergencia
function EmergencyCalc() {
  const [expenses, setExpenses] = useState('');
  const [saved, setSaved] = useState('');
  const E = n(expenses);
  const S = n(saved);
  const months = E > 0 ? S / E : 0;
  const recommended = E * 6;
  const gap = Math.max(recommended - S, 0);

  return (
    <>
      <p className={styles.hint}>Se recomienda tener entre 3 y 6 meses de gastos como fondo de emergencia.</p>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Gastos mensuales</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="3000" value={expenses} onChange={e => setExpenses(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Ahorros actuales</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="5000" value={saved} onChange={e => setSaved(e.target.value)} />
        </div>
      </div>
      {E > 0 && S >= 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Cobertura actual</p>
          <p className={styles.resultMain}>{fmt(months, 1)} meses</p>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Meta recomendada (6 meses)</span>
            <span className={styles.resultValue}>Q {fmt(recommended)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Falta para llegar</span>
            <span className={`${styles.resultValue} ${gap > 0 ? styles.resultValueRed : styles.resultValueGreen}`}>
              {gap > 0 ? `Q ${fmt(gap)}` : '¡Meta alcanzada!'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

// 4. Costo real de deuda
function DebtCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');

  const P = n(principal);
  const r = n(rate) / 100 / 12;
  const m = n(months);
  const hasResult = P > 0 && r > 0 && m > 0;

  // Cuota mensual: P * r * (1+r)^m / ((1+r)^m - 1)
  const cuota = hasResult ? P * r * Math.pow(1 + r, m) / (Math.pow(1 + r, m) - 1) : 0;
  const totalPay = cuota * m;
  const interest = totalPay - P;

  return (
    <>
      <p className={styles.hint}>Calcula la cuota mensual y el costo total de un préstamo con interés.</p>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Monto del préstamo</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="20000" value={principal} onChange={e => setPrincipal(e.target.value)} />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Tasa mensual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="2.5" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Plazo (meses)</label>
          <input className={styles.input} type="number" inputMode="numeric" placeholder="24" value={months} onChange={e => setMonths(e.target.value)} />
        </div>
      </div>
      {hasResult && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Cuota mensual</p>
          <p className={styles.resultMain}>Q {fmt(cuota)}</p>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Total a pagar</span>
            <span className={styles.resultValue}>Q {fmt(totalPay)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Total en intereses</span>
            <span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(interest)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Costo extra</span>
            <span className={`${styles.resultValue} ${styles.resultValueRed}`}>{fmt((interest / P) * 100, 1)}%</span>
          </div>
        </div>
      )}
    </>
  );
}

// 5. Proyección de ahorro
function SavingsCalc() {
  const [goal, setGoal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [current, setCurrent] = useState('');

  const G = n(goal);
  const M = n(monthly);
  const C = n(current);
  const remaining = Math.max(G - C, 0);
  const months = M > 0 ? Math.ceil(remaining / M) : 0;
  const years = months / 12;

  return (
    <>
      <p className={styles.hint}>Calcula cuánto tiempo necesitas para alcanzar tu meta de ahorro.</p>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Meta de ahorro</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="50000" value={goal} onChange={e => setGoal(e.target.value)} />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Ya tengo ahorrado</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="0" value={current} onChange={e => setCurrent(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Ahorro mensual</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="1000" value={monthly} onChange={e => setMonthly(e.target.value)} />
        </div>
      </div>
      {G > 0 && M > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Tiempo estimado</p>
          <p className={styles.resultMain}>{months} meses</p>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Equivale a</span>
            <span className={styles.resultValue}>{fmt(years, 1)} años</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Falta ahorrar</span>
            <span className={`${styles.resultValue} ${styles.resultValueYellow}`}>Q {fmt(remaining)}</span>
          </div>
        </div>
      )}
    </>
  );
}

// 6. ROI
function RoiCalc() {
  const [invested, setInvested] = useState('');
  const [returned, setReturned] = useState('');

  const I = n(invested);
  const R = n(returned);
  const roi = I > 0 ? ((R - I) / I) * 100 : 0;
  const gain = R - I;

  return (
    <>
      <p className={styles.hint}>Retorno sobre inversión — qué tan rentable fue una inversión.</p>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Capital invertido</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="10000" value={invested} onChange={e => setInvested(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Valor final / retorno</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="13000" value={returned} onChange={e => setReturned(e.target.value)} />
        </div>
      </div>
      {I > 0 && R > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>ROI</p>
          <p className={`${styles.resultMain} ${roi >= 0 ? '' : styles.resultValueRed}`}>{fmt(roi, 2)}%</p>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Ganancia / Pérdida</span>
            <span className={`${styles.resultValue} ${gain >= 0 ? styles.resultValueGreen : styles.resultValueRed}`}>
              {gain >= 0 ? '+' : ''}Q {fmt(gain)}
            </span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Veredicto</span>
            <span className={`${styles.resultValue} ${roi >= 0 ? styles.resultValueGreen : styles.resultValueRed}`}>
              {roi >= 10 ? 'Excelente' : roi >= 0 ? 'Positivo' : 'Pérdida'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

// 7. Inflación
function InflationCalc() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('');

  const A = n(amount);
  const r = n(rate) / 100;
  const t = n(years);
  const future = A * Math.pow(1 + r, t);
  const purchasing = A / Math.pow(1 + r, t);
  const loss = A - purchasing;

  return (
    <>
      <p className={styles.hint}>Cómo la inflación erosiona el poder adquisitivo de tu dinero con el tiempo.</p>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Monto actual</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="10000" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Inflación anual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="5" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Años</label>
          <input className={styles.input} type="number" inputMode="numeric" placeholder="10" value={years} onChange={e => setYears(e.target.value)} />
        </div>
      </div>
      {A > 0 && r > 0 && t > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Poder adquisitivo en {t} años</p>
          <p className={styles.resultMain}>Q {fmt(purchasing)}</p>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Lo que costará hoy Q{fmt(A, 0)}</span>
            <span className={styles.resultValue}>Q {fmt(future)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Pérdida de valor</span>
            <span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(loss)}</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Devaluación</span>
            <span className={`${styles.resultValue} ${styles.resultValueRed}`}>{fmt((loss / A) * 100, 1)}%</span>
          </div>
        </div>
      )}
    </>
  );
}

const CALC_COMPONENTS: Record<CalcId, React.ReactNode> = {
  compound:   <CompoundCalc />,
  rule503020: <Rule503020Calc />,
  emergency:  <EmergencyCalc />,
  debt:       <DebtCalc />,
  savings:    <SavingsCalc />,
  roi:        <RoiCalc />,
  inflation:  <InflationCalc />,
};

// ── Pantalla principal ─────────────────────────────────────────────────────
export default function CalculatorsScreen() {
  const [active, setActive] = useState<CalcId | null>(null);

  if (active) {
    const calc = CALCS.find((c) => c.id === active)!;
    return (
      <div className={styles.calcScreen}>
        <header className={styles.calcHeader}>
          <button className={styles.backBtn} onClick={() => setActive(null)} type="button" aria-label="Volver">
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <h1 className={styles.calcTitle}>{calc.name}</h1>
        </header>
        <div className={styles.calcBody}>
          {CALC_COMPONENTS[active]}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Calculadoras</h1>
        <p className={styles.subtitle}>Herramientas para tomar mejores decisiones financieras</p>
      </header>
      <div className={styles.body}>
        {CALCS.map((calc) => (
          <button key={calc.id} className={styles.calcItem} onClick={() => setActive(calc.id)} type="button">
            <span className={styles.calcIcon} style={{ background: calc.color }}>
              {calc.icon}
            </span>
            <div className={styles.calcText}>
              <p className={styles.calcName}>{calc.name}</p>
              <p className={styles.calcDesc}>{calc.desc}</p>
            </div>
            <ChevronRight size={18} strokeWidth={2} className={styles.calcChevron} />
          </button>
        ))}
      </div>
    </div>
  );
}

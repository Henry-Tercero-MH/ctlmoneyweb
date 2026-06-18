import { useState } from 'react';
import {
  TrendingUp, PieChart, Shield, CreditCard,
  Target, BarChart2, DollarSign, ChevronRight, ChevronLeft,
  Flame, Landmark, Tag, Users, Scale,
} from 'lucide-react';
import styles from './CalculatorsScreen.module.css';

// ── Tipos ──────────────────────────────────────────────────────────────────
type CalcId =
  // Finanzas personales
  | 'compound' | 'rule503020' | 'emergency' | 'debt' | 'savings' | 'roi' | 'inflation'
  // Independencia financiera
  | 'fire' | 'fireRate'
  // Negocios
  | 'breakeven' | 'margin' | 'priceSuggested' | 'payroll';

interface CalcDef {
  id: CalcId;
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

interface CalcGroup {
  label: string;
  items: CalcDef[];
}

const GROUPS: CalcGroup[] = [
  {
    label: 'Finanzas personales',
    items: [
      { id: 'compound',   name: 'Interés compuesto',   desc: 'Proyecta el crecimiento de una inversión.',         icon: <TrendingUp size={20} strokeWidth={1.75} />,  color: '#3f7a3a' },
      { id: 'rule503020', name: 'Regla 50/30/20',       desc: 'Divide tu ingreso en necesidades, deseos y ahorro.',icon: <PieChart size={20} strokeWidth={1.75} />,    color: '#f5c800' },
      { id: 'emergency',  name: 'Fondo de emergencia',  desc: 'Cuántos meses de gastos tienes cubiertos.',         icon: <Shield size={20} strokeWidth={1.75} />,      color: '#60a5fa' },
      { id: 'debt',       name: 'Costo real de deuda',  desc: 'Total a pagar con intereses en un crédito.',        icon: <CreditCard size={20} strokeWidth={1.75} />,  color: '#f87171' },
      { id: 'savings',    name: 'Proyección de ahorro', desc: '¿Cuándo alcanzas tu meta ahorrando X al mes?',      icon: <Target size={20} strokeWidth={1.75} />,      color: '#a78bfa' },
      { id: 'roi',        name: 'ROI',                  desc: 'Retorno sobre una inversión.',                      icon: <BarChart2 size={20} strokeWidth={1.75} />,   color: '#fb923c' },
      { id: 'inflation',  name: 'Inflación',             desc: 'Poder adquisitivo de tu dinero en el tiempo.',     icon: <DollarSign size={20} strokeWidth={1.75} />,  color: '#34d399' },
    ],
  },
  {
    label: 'Independencia financiera',
    items: [
      { id: 'fire',     name: 'Número FIRE',         desc: 'Cuánto capital necesitas para vivir de tus inversiones sin trabajar.', icon: <Flame size={20} strokeWidth={1.75} />,    color: '#ef4444' },
      { id: 'fireRate', name: 'Tasa de ahorro FIRE', desc: '¿En cuántos años alcanzas la independencia financiera según lo que ahorras?', icon: <Landmark size={20} strokeWidth={1.75} />, color: '#8b5cf6' },
    ],
  },
  {
    label: 'Negocios',
    items: [
      { id: 'breakeven',      name: 'Punto de equilibrio', desc: 'Cuántas unidades debes vender para cubrir costos.',          icon: <Scale size={20} strokeWidth={1.75} />,    color: '#0ea5e9' },
      { id: 'margin',         name: 'Margen de ganancia',  desc: 'Margen bruto, neto y markup de tu producto o servicio.',     icon: <BarChart2 size={20} strokeWidth={1.75} />, color: '#10b981' },
      { id: 'priceSuggested', name: 'Precio sugerido',     desc: 'Calcula el precio de venta según costo y margen deseado.',   icon: <Tag size={20} strokeWidth={1.75} />,      color: '#f59e0b' },
      { id: 'payroll',        name: 'Costo real empleado', desc: 'Cuánto te cuesta realmente contratar a alguien.',            icon: <Users size={20} strokeWidth={1.75} />,    color: '#6366f1' },
    ],
  },
];

const ALL_CALCS = GROUPS.flatMap((g) => g.items);

// ── Helpers ────────────────────────────────────────────────────────────────
function n(v: string) { return parseFloat(v.replace(',', '.')) || 0; }
function fmt(v: number, decimals = 2) {
  return v.toLocaleString('es-GT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── 1. Interés compuesto ───────────────────────────────────────────────────
function CompoundCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate]         = useState('');
  const [years, setYears]       = useState('');
  const [monthly, setMonthly]   = useState('');

  const P = n(principal), r = n(rate) / 100, t = n(years), m = n(monthly);
  const hasResult = P > 0 && r > 0 && t > 0;
  const fv = hasResult ? P * Math.pow(1 + r, t) + m * 12 * ((Math.pow(1 + r, t) - 1) / r) : 0;
  const totalInvested = P + m * 12 * t;
  const gains = fv - totalInvested;

  return (
    <>
      <p className={styles.hint}>Calcula el valor futuro de una inversión con aportaciones mensuales opcionales.</p>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Capital inicial</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="10000" value={principal} onChange={e => setPrincipal(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Aporte mensual</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="500" value={monthly} onChange={e => setMonthly(e.target.value)} /></div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Tasa anual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="8" value={rate} onChange={e => setRate(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Años</label>
          <input className={styles.input} type="number" inputMode="numeric" placeholder="10" value={years} onChange={e => setYears(e.target.value)} /></div>
      </div>
      {hasResult && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Valor futuro</p>
          <p className={styles.resultMain}>Q {fmt(fv)}</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Total invertido</span><span className={styles.resultValue}>Q {fmt(totalInvested)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Ganancias</span><span className={`${styles.resultValue} ${styles.resultValueGreen}`}>Q {fmt(gains)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Rendimiento</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>{fmt((gains / totalInvested) * 100, 1)}%</span></div>
        </div>
      )}
    </>
  );
}

// ── 2. Regla 50/30/20 ─────────────────────────────────────────────────────
function Rule503020Calc() {
  const [income, setIncome] = useState('');
  const I = n(income);
  return (
    <>
      <p className={styles.hint}>Distribución recomendada de tu ingreso mensual neto.</p>
      <div className={styles.field}><label className={styles.fieldLabel}>Ingreso mensual neto</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="5000" value={income} onChange={e => setIncome(e.target.value)} /></div>
      {I > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Distribución sugerida</p>
          <div className={styles.barSegments}>
            <div className={styles.barSeg} style={{ width: '50%', background: '#f87171' }} />
            <div className={styles.barSeg} style={{ width: '30%', background: '#f5c800' }} />
            <div className={styles.barSeg} style={{ width: '20%', background: '#4ade80' }} />
          </div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>50% Necesidades</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(I * 0.5)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>30% Deseos</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>Q {fmt(I * 0.3)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>20% Ahorro / deudas</span><span className={`${styles.resultValue} ${styles.resultValueGreen}`}>Q {fmt(I * 0.2)}</span></div>
        </div>
      )}
    </>
  );
}

// ── 3. Fondo de emergencia ────────────────────────────────────────────────
function EmergencyCalc() {
  const [expenses, setExpenses] = useState('');
  const [saved, setSaved]       = useState('');
  const E = n(expenses), S = n(saved);
  const months = E > 0 ? S / E : 0;
  const gap = Math.max(E * 6 - S, 0);
  return (
    <>
      <p className={styles.hint}>Se recomienda tener entre 3 y 6 meses de gastos como fondo de emergencia.</p>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Gastos mensuales</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="3000" value={expenses} onChange={e => setExpenses(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Ahorros actuales</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="5000" value={saved} onChange={e => setSaved(e.target.value)} /></div>
      </div>
      {E > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Cobertura actual</p>
          <p className={styles.resultMain}>{fmt(months, 1)} meses</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Meta recomendada (6 meses)</span><span className={styles.resultValue}>Q {fmt(E * 6)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Falta para llegar</span>
            <span className={`${styles.resultValue} ${gap > 0 ? styles.resultValueRed : styles.resultValueGreen}`}>{gap > 0 ? `Q ${fmt(gap)}` : '¡Meta alcanzada!'}</span></div>
        </div>
      )}
    </>
  );
}

// ── 4. Costo real de deuda ────────────────────────────────────────────────
function DebtCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate]           = useState('');
  const [months, setMonths]       = useState('');
  const P = n(principal), r = n(rate) / 100 / 12, m = n(months);
  const hasResult = P > 0 && r > 0 && m > 0;
  const cuota = hasResult ? P * r * Math.pow(1 + r, m) / (Math.pow(1 + r, m) - 1) : 0;
  const totalPay = cuota * m;
  return (
    <>
      <p className={styles.hint}>Calcula la cuota mensual y el costo total de un préstamo con interés.</p>
      <div className={styles.field}><label className={styles.fieldLabel}>Monto del préstamo</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="20000" value={principal} onChange={e => setPrincipal(e.target.value)} /></div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Tasa mensual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="2.5" value={rate} onChange={e => setRate(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Plazo (meses)</label>
          <input className={styles.input} type="number" inputMode="numeric" placeholder="24" value={months} onChange={e => setMonths(e.target.value)} /></div>
      </div>
      {hasResult && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Cuota mensual</p>
          <p className={styles.resultMain}>Q {fmt(cuota)}</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Total a pagar</span><span className={styles.resultValue}>Q {fmt(totalPay)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Total en intereses</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(totalPay - P)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Costo extra</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>{fmt(((totalPay - P) / P) * 100, 1)}%</span></div>
        </div>
      )}
    </>
  );
}

// ── 5. Proyección de ahorro ───────────────────────────────────────────────
function SavingsCalc() {
  const [goal, setGoal]       = useState('');
  const [monthly, setMonthly] = useState('');
  const [current, setCurrent] = useState('');
  const G = n(goal), M = n(monthly), C = n(current);
  const remaining = Math.max(G - C, 0);
  const months = M > 0 ? Math.ceil(remaining / M) : 0;
  return (
    <>
      <p className={styles.hint}>Calcula cuánto tiempo necesitas para alcanzar tu meta de ahorro.</p>
      <div className={styles.field}><label className={styles.fieldLabel}>Meta de ahorro</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="50000" value={goal} onChange={e => setGoal(e.target.value)} /></div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Ya tengo ahorrado</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="0" value={current} onChange={e => setCurrent(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Ahorro mensual</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="1000" value={monthly} onChange={e => setMonthly(e.target.value)} /></div>
      </div>
      {G > 0 && M > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Tiempo estimado</p>
          <p className={styles.resultMain}>{months} meses</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Equivale a</span><span className={styles.resultValue}>{fmt(months / 12, 1)} años</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Falta ahorrar</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>Q {fmt(remaining)}</span></div>
        </div>
      )}
    </>
  );
}

// ── 6. ROI ────────────────────────────────────────────────────────────────
function RoiCalc() {
  const [invested, setInvested] = useState('');
  const [returned, setReturned] = useState('');
  const I = n(invested), R = n(returned);
  const roi = I > 0 ? ((R - I) / I) * 100 : 0;
  const gain = R - I;
  return (
    <>
      <p className={styles.hint}>Retorno sobre inversión — qué tan rentable fue una inversión.</p>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Capital invertido</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="10000" value={invested} onChange={e => setInvested(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Valor final / retorno</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="13000" value={returned} onChange={e => setReturned(e.target.value)} /></div>
      </div>
      {I > 0 && R > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>ROI</p>
          <p className={`${styles.resultMain} ${roi < 0 ? styles.resultValueRed : ''}`}>{fmt(roi, 2)}%</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Ganancia / Pérdida</span>
            <span className={`${styles.resultValue} ${gain >= 0 ? styles.resultValueGreen : styles.resultValueRed}`}>{gain >= 0 ? '+' : ''}Q {fmt(gain)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Veredicto</span>
            <span className={`${styles.resultValue} ${roi >= 0 ? styles.resultValueGreen : styles.resultValueRed}`}>{roi >= 10 ? 'Excelente' : roi >= 0 ? 'Positivo' : 'Pérdida'}</span></div>
        </div>
      )}
    </>
  );
}

// ── 7. Inflación ──────────────────────────────────────────────────────────
function InflationCalc() {
  const [amount, setAmount] = useState('');
  const [rate, setRate]     = useState('');
  const [years, setYears]   = useState('');
  const A = n(amount), r = n(rate) / 100, t = n(years);
  const purchasing = A / Math.pow(1 + r, t);
  const loss = A - purchasing;
  return (
    <>
      <p className={styles.hint}>Cómo la inflación erosiona el poder adquisitivo de tu dinero con el tiempo.</p>
      <div className={styles.field}><label className={styles.fieldLabel}>Monto actual</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="10000" value={amount} onChange={e => setAmount(e.target.value)} /></div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Inflación anual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="5" value={rate} onChange={e => setRate(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Años</label>
          <input className={styles.input} type="number" inputMode="numeric" placeholder="10" value={years} onChange={e => setYears(e.target.value)} /></div>
      </div>
      {A > 0 && r > 0 && t > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Poder adquisitivo en {t} años</p>
          <p className={styles.resultMain}>Q {fmt(purchasing)}</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Pérdida de valor</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(loss)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Devaluación</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>{fmt((loss / A) * 100, 1)}%</span></div>
        </div>
      )}
    </>
  );
}

// ── 8. Número FIRE ────────────────────────────────────────────────────────
function FireCalc() {
  const [expenses, setExpenses]   = useState('');
  const [rate, setRate]           = useState('4');
  const [inflation, setInflation] = useState('4');

  const E = n(expenses), r = n(rate) / 100, inf = n(inflation) / 100;
  const fireNumber = r > 0 ? E * 12 / r : 0;
  // Ajustado por inflación: capital real necesario
  const fireReal = inf > 0 ? E * 12 / (r - inf) : fireNumber;
  const monthly4pct = fireNumber * r / 12;

  return (
    <>
      <p className={styles.hint}>
        La <strong>regla del 4%</strong> (Trinity Study) dice que si inviertes 25× tus gastos anuales, puedes retirar el 4% cada año indefinidamente sin agotar el capital.
      </p>
      <div className={styles.field}><label className={styles.fieldLabel}>Gastos mensuales actuales</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="5000" value={expenses} onChange={e => setExpenses(e.target.value)} /></div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Tasa de retiro (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="4" value={rate} onChange={e => setRate(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Inflación anual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="4" value={inflation} onChange={e => setInflation(e.target.value)} /></div>
      </div>
      {E > 0 && r > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Tu número FIRE</p>
          <p className={styles.resultMain}>Q {fmt(fireNumber, 0)}</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Regla del 25× (gastos anuales)</span><span className={styles.resultValue}>Q {fmt(E * 12 * 25, 0)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Con inflación ajustada</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(fireReal, 0)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Retiro mensual posible</span><span className={`${styles.resultValue} ${styles.resultValueGreen}`}>Q {fmt(monthly4pct)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Equivale a</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>{fmt(fireNumber / (E * 12), 1)} años de gastos</span></div>
        </div>
      )}
    </>
  );
}

// ── 9. Tasa de ahorro FIRE ────────────────────────────────────────────────
function FireRateCalc() {
  const [income, setIncome]       = useState('');
  const [expenses, setExpenses]   = useState('');
  const [currentNet, setCurrentNet] = useState('');
  const [returnRate, setReturnRate] = useState('7');

  const I = n(income), E = n(expenses), C = n(currentNet), r = n(returnRate) / 100;
  const savings = I - E;
  const savingsRate = I > 0 ? (savings / I) * 100 : 0;
  const annualExpenses = E * 12;
  const fireNumber = annualExpenses * 25;
  const remaining = Math.max(fireNumber - C, 0);

  // Años hasta FIRE: FV = C*(1+r)^n + S*12*((1+r)^n-1)/r = fireNumber
  // Resolvemos numéricamente
  let yearsToFire = 0;
  if (savings > 0 && r > 0 && remaining > 0) {
    let acc = C;
    const monthlySavings = savings;
    const monthlyRate = r / 12;
    for (let m = 1; m <= 12 * 100; m++) {
      acc = acc * (1 + monthlyRate) + monthlySavings;
      if (acc >= fireNumber) { yearsToFire = m / 12; break; }
    }
  }

  return (
    <>
      <p className={styles.hint}>
        Calcula en cuántos años alcanzas la independencia financiera según tu tasa de ahorro y el rendimiento esperado de tus inversiones.
      </p>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Ingreso mensual</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="8000" value={income} onChange={e => setIncome(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Gastos mensuales</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="5000" value={expenses} onChange={e => setExpenses(e.target.value)} /></div>
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Inversiones actuales</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="0" value={currentNet} onChange={e => setCurrentNet(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Rendimiento anual (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="7" value={returnRate} onChange={e => setReturnRate(e.target.value)} /></div>
      </div>
      {I > 0 && E > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Independencia financiera</p>
          <p className={styles.resultMain}>{yearsToFire > 0 ? `${fmt(yearsToFire, 1)} años` : savings <= 0 ? 'Gastas más de lo que ganas' : 'Calculando…'}</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Tasa de ahorro</span>
            <span className={`${styles.resultValue} ${savingsRate >= 20 ? styles.resultValueGreen : styles.resultValueRed}`}>{fmt(savingsRate, 1)}%</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Ahorro mensual</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>Q {fmt(savings)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Número FIRE necesario</span><span className={styles.resultValue}>Q {fmt(fireNumber, 0)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Falta acumular</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(remaining, 0)}</span></div>
        </div>
      )}
    </>
  );
}

// ── 10. Punto de equilibrio ───────────────────────────────────────────────
function BreakevenCalc() {
  const [fixedCosts, setFixedCosts]   = useState('');
  const [priceUnit, setPriceUnit]     = useState('');
  const [varCostUnit, setVarCostUnit] = useState('');

  const FC = n(fixedCosts), P = n(priceUnit), VC = n(varCostUnit);
  const contribution = P - VC;
  const hasResult = contribution > 0 && FC > 0;
  const units = hasResult ? FC / contribution : 0;
  const revenue = units * P;
  const marginPct = P > 0 ? (contribution / P) * 100 : 0;

  return (
    <>
      <p className={styles.hint}>
        El punto de equilibrio es donde ingresos = costos. Por encima de él, cada unidad vendida genera ganancia.
      </p>
      <div className={styles.field}><label className={styles.fieldLabel}>Costos fijos mensuales</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="15000" value={fixedCosts} onChange={e => setFixedCosts(e.target.value)} /></div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Precio de venta / unidad</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="250" value={priceUnit} onChange={e => setPriceUnit(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Costo variable / unidad</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="100" value={varCostUnit} onChange={e => setVarCostUnit(e.target.value)} /></div>
      </div>
      {hasResult && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Punto de equilibrio</p>
          <p className={styles.resultMain}>{fmt(units, 0)} unidades</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Ingresos en equilibrio</span><span className={styles.resultValue}>Q {fmt(revenue)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Margen de contribución</span><span className={`${styles.resultValue} ${styles.resultValueGreen}`}>Q {fmt(contribution)} / ud.</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Margen sobre precio</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>{fmt(marginPct, 1)}%</span></div>
        </div>
      )}
      {P > 0 && VC >= P && (
        <p className={styles.hint} style={{ color: 'var(--color-expense)' }}>⚠ El costo variable es mayor o igual al precio — no hay ganancia posible.</p>
      )}
    </>
  );
}

// ── 11. Margen de ganancia ────────────────────────────────────────────────
function MarginCalc() {
  const [cost, setCost]     = useState('');
  const [revenue, setRevenue] = useState('');

  const C = n(cost), R = n(revenue);
  const grossProfit = R - C;
  const grossMargin = R > 0 ? (grossProfit / R) * 100 : 0;
  const markup = C > 0 ? (grossProfit / C) * 100 : 0;

  return (
    <>
      <p className={styles.hint}>
        <strong>Margen bruto</strong> = (Ingreso − Costo) / Ingreso. <strong>Markup</strong> = ganancia sobre el costo.
      </p>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Costo del producto/servicio</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="80" value={cost} onChange={e => setCost(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Precio de venta</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="150" value={revenue} onChange={e => setRevenue(e.target.value)} /></div>
      </div>
      {C > 0 && R > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Rentabilidad</p>
          <p className={`${styles.resultMain} ${grossProfit >= 0 ? styles.resultValueGreen : styles.resultValueRed}`}>
            {grossProfit >= 0 ? '+' : ''}Q {fmt(grossProfit)}
          </p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Margen bruto</span><span className={`${styles.resultValue} ${grossMargin >= 30 ? styles.resultValueGreen : styles.resultValueYellow}`}>{fmt(grossMargin, 1)}%</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Markup sobre costo</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>{fmt(markup, 1)}%</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Veredicto</span>
            <span className={`${styles.resultValue} ${grossMargin >= 40 ? styles.resultValueGreen : grossMargin >= 20 ? styles.resultValueYellow : styles.resultValueRed}`}>
              {grossMargin >= 40 ? 'Excelente' : grossMargin >= 20 ? 'Aceptable' : grossMargin >= 0 ? 'Bajo' : 'Pérdida'}
            </span></div>
        </div>
      )}
    </>
  );
}

// ── 12. Precio sugerido ───────────────────────────────────────────────────
function PriceSuggestedCalc() {
  const [cost, setCost]     = useState('');
  const [margin, setMargin] = useState('');
  const [tax, setTax]       = useState('12');

  const C = n(cost), M = n(margin) / 100, T = n(tax) / 100;
  const priceBeforeTax = M < 1 && C > 0 ? C / (1 - M) : 0;
  const priceWithTax = priceBeforeTax * (1 + T);
  const profit = priceBeforeTax - C;

  return (
    <>
      <p className={styles.hint}>
        Calcula el precio de venta óptimo a partir de tu costo y el margen de ganancia que deseas obtener.
      </p>
      <div className={styles.field}><label className={styles.fieldLabel}>Costo del producto</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="100" value={cost} onChange={e => setCost(e.target.value)} /></div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Margen deseado (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="40" value={margin} onChange={e => setMargin(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>IVA / impuesto (%)</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="12" value={tax} onChange={e => setTax(e.target.value)} /></div>
      </div>
      {C > 0 && M > 0 && M < 1 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Precio de venta sugerido</p>
          <p className={styles.resultMain}>Q {fmt(priceBeforeTax)}</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Con IVA ({fmt(n(tax), 0)}%)</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>Q {fmt(priceWithTax)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Ganancia neta</span><span className={`${styles.resultValue} ${styles.resultValueGreen}`}>Q {fmt(profit)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Markup real</span><span className={styles.resultValue}>{fmt((profit / C) * 100, 1)}%</span></div>
        </div>
      )}
    </>
  );
}

// ── 13. Costo real empleado ───────────────────────────────────────────────
function PayrollCalc() {
  const [salary, setSalary]     = useState('');
  const [bonuses, setBonuses]   = useState('');
  const [benefits, setBenefits] = useState('');

  const S = n(salary), B = n(bonuses), Ex = n(benefits);
  // Estimación Guatemala: IGSS patronal ~12.67%, IRTRA 1%, INTECAP 1%
  const igss = S * 0.1267;
  const irtra = S * 0.01;
  const intecap = S * 0.01;
  // Prestaciones: aguinaldo (1 mes/año = S/12), bono14 (1 mes/año = S/12), vacaciones (15 días = S/24), indemnización (1 mes/año = S/12)
  const aguinaldo = S / 12;
  const bono14 = S / 12;
  const vacaciones = S / 24;
  const indemnizacion = S / 12;
  const prestacionesMes = aguinaldo + bono14 + vacaciones + indemnizacion;
  const totalMonthly = S + igss + irtra + intecap + prestacionesMes + B + Ex;
  const totalAnnual = totalMonthly * 12;
  const overhead = totalMonthly - S;

  return (
    <>
      <p className={styles.hint}>
        Estimación para Guatemala (IGSS 12.67%, IRTRA 1%, INTECAP 1%, aguinaldo, bono 14, vacaciones e indemnización).
      </p>
      <div className={styles.field}><label className={styles.fieldLabel}>Salario base mensual</label>
        <input className={styles.input} type="number" inputMode="decimal" placeholder="4000" value={salary} onChange={e => setSalary(e.target.value)} /></div>
      <div className={styles.fieldRow}>
        <div className={styles.field}><label className={styles.fieldLabel}>Bonificaciones mensuales</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="250" value={bonuses} onChange={e => setBonuses(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Otros beneficios / mes</label>
          <input className={styles.input} type="number" inputMode="decimal" placeholder="0" value={benefits} onChange={e => setBenefits(e.target.value)} /></div>
      </div>
      {S > 0 && (
        <div className={styles.resultCard}>
          <p className={styles.resultTitle}>Costo real mensual</p>
          <p className={styles.resultMain}>Q {fmt(totalMonthly)}</p>
          <div className={styles.resultRow}><span className={styles.resultLabel}>IGSS patronal (12.67%)</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(igss)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>IRTRA + INTECAP (2%)</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(irtra + intecap)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Prestaciones prorrateadas</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(prestacionesMes)}</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Costo extra sobre salario</span><span className={`${styles.resultValue} ${styles.resultValueRed}`}>Q {fmt(overhead)} ({fmt((overhead / S) * 100, 1)}%)</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>Costo anual total</span><span className={`${styles.resultValue} ${styles.resultValueYellow}`}>Q {fmt(totalAnnual, 0)}</span></div>
        </div>
      )}
    </>
  );
}

// ── Mapa de componentes ────────────────────────────────────────────────────
const CALC_COMPONENTS: Record<CalcId, React.ReactNode> = {
  compound:       <CompoundCalc />,
  rule503020:     <Rule503020Calc />,
  emergency:      <EmergencyCalc />,
  debt:           <DebtCalc />,
  savings:        <SavingsCalc />,
  roi:            <RoiCalc />,
  inflation:      <InflationCalc />,
  fire:           <FireCalc />,
  fireRate:       <FireRateCalc />,
  breakeven:      <BreakevenCalc />,
  margin:         <MarginCalc />,
  priceSuggested: <PriceSuggestedCalc />,
  payroll:        <PayrollCalc />,
};

// ── Pantalla principal ─────────────────────────────────────────────────────
export default function CalculatorsScreen() {
  const [active, setActive] = useState<CalcId | null>(null);

  if (active) {
    const calc = ALL_CALCS.find((c) => c.id === active)!;
    return (
      <div className={styles.calcScreen}>
        <header className={styles.calcHeader}>
          <button className={styles.backBtn} onClick={() => setActive(null)} type="button" aria-label="Volver">
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <span className={styles.calcIconSmall} style={{ background: calc.color }}>{calc.icon}</span>
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
        {GROUPS.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupLabel}>{group.label}</p>
            {group.items.map((calc) => (
              <button key={calc.id} className={styles.calcItem} onClick={() => setActive(calc.id)} type="button">
                <span className={styles.calcIcon} style={{ background: calc.color }}>{calc.icon}</span>
                <div className={styles.calcText}>
                  <p className={styles.calcName}>{calc.name}</p>
                  <p className={styles.calcDesc}>{calc.desc}</p>
                </div>
                <ChevronRight size={18} strokeWidth={2} className={styles.calcChevron} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

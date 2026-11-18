import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Brain,
  Calculator,
  Database,
  Download,
  Droplets,
  Gauge,
  Info,
  Layers3,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Moon,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const api = axios.create({ baseURL: API_BASE_URL, timeout: 25000 });
const REFRESH_MS = 5 * 60 * 1000;
const DAY_MS = 86400000;

const RANGES = [
  { id: "1M", days: 30 },
  { id: "3M", days: 90 },
  { id: "6M", days: 180 },
  { id: "1Y", days: 365 },
  { id: "5Y", days: 1825 },
  { id: "ALL", days: null },
];

const PERIODS = [
  ["1W", 7],
  ["1M", 30],
  ["3M", 90],
  ["6M", 180],
  ["1Y", 365],
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const VIEWS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "market", label: "Market", icon: LineChartIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "oil", label: "Oil Signals", icon: Droplets },
  { id: "model", label: "Model", icon: Brain },
  { id: "about", label: "About", icon: Info },
];

const TITLES = {
  overview: ["Overview", "USD/INR intelligence at a glance"],
  market: ["Market", "Rates, moving averages, comparison and converter"],
  analytics: ["Analytics", "Volatility, monthly trends and return heatmap"],
  oil: ["Oil signals", "WTI crude-oil context used by the model"],
  model: ["Model", "How the forecast is produced"],
  about: ["About", "Project summary, architecture and tech stack"],
};

const PIPELINE = [
  { icon: Database, title: "RBI reference rates", text: "Daily exchange-rate history is validated and stored in PostgreSQL." },
  { icon: Droplets, title: "WTI crude signals", text: "Oil price, returns, moving averages and volatility add market context." },
  { icon: Layers3, title: "Feature engineering", text: "Lags, moving averages, returns and volatility build the model input." },
  { icon: Brain, title: "Random Forest", text: "A trained regression model estimates the next-day move." },
  { icon: Zap, title: "Next-day forecast", text: "The estimate is converted into a USD/INR rate and direction." },
];

const TECH = [
  { group: "Data", items: ["RBI reference rates", "WTI crude oil", "PostgreSQL", "SQL"] },
  { group: "Backend", items: ["Python", "FastAPI", "Pandas", "NumPy", "SQLAlchemy"] },
  { group: "Machine learning", items: ["Scikit-learn", "Random Forest", "Feature engineering", "Baseline comparison"] },
  { group: "Frontend", items: ["React", "Vite", "Recharts", "Axios", "Lucide icons"] },
];

const CAPABILITIES = [
  "Automated ingestion, validation and storage of RBI exchange-rate data",
  "Engineered features: lags, returns, moving averages and rolling volatility",
  "WTI crude-oil signals combined with currency features",
  "Next-day USD/INR forecast with direction and expected return",
  "REST API with caching, gzip and health checks",
  "Interactive dashboard: multi-currency comparison, MA overlays, heatmap, converter, CSV and PDF export",
];

const PALETTE = {
  dark: {
    grid: "rgba(148,163,184,0.12)",
    axis: "#8392aa",
    accent: "#4f9dff",
    accent2: "#a78bfa",
    ma7: "#fbbf24",
    ma30: "#34d399",
    up: "#34d399",
    down: "#f87171",
    tooltipBg: "#0b1220",
    tooltipBorder: "#24324a",
    tooltipText: "#e6ebf4",
    lines: ["#4f9dff", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee", "#f472b6"],
  },
  light: {
    grid: "rgba(71,85,105,0.14)",
    axis: "#64748b",
    accent: "#2563eb",
    accent2: "#7c3aed",
    ma7: "#d97706",
    ma30: "#059669",
    up: "#059669",
    down: "#dc2626",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d5deeb",
    tooltipText: "#0f172a",
    lines: ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777"],
  },
};

/* =========================================================
   HELPERS
========================================================= */

const isNum = (v) =>
  v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

const fmt = (v, d = 4) => (isNum(v) ? Number(v).toFixed(d) : "--");

const fmtINR = (v, d = 4) => (isNum(v) ? `₹${Number(v).toFixed(d)}` : "₹--");

const fmtSigned = (v, d = 4, suffix = "") =>
  isNum(v) ? `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(d)}${suffix}` : "--";

const fmtDate = (v) => {
  if (!v) return "--";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const labelOf = (code) => (code || "").replace(/_inr$/i, "").toUpperCase() + "/INR";

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return null;
};

const toNum = (v) => (isNum(v) ? Number(v) : null);

function makeTickFormatter(days) {
  return (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return days && days <= 180
      ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      : d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  };
}

function monthTick(value) {
  const d = new Date(`${value}-01`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function downsample(rows, max = 700) {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  const out = rows.filter((_, i) => i % step === 0);
  const last = rows[rows.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function sliceRange(rows, days) {
  if (!days || !rows.length) return rows;
  const cutoff = new Date(rows[rows.length - 1].date).getTime() - days * DAY_MS;
  return rows.filter((r) => new Date(r.date).getTime() >= cutoff);
}

function periodChanges(rows) {
  if (rows.length < 2) return [];
  const last = rows[rows.length - 1];
  const lastTime = new Date(last.date).getTime();

  return PERIODS.map(([label, days]) => {
    const cutoff = lastTime - days * DAY_MS;
    let base = null;

    for (let i = rows.length - 1; i >= 0; i--) {
      if (new Date(rows[i].date).getTime() <= cutoff) {
        base = rows[i];
        break;
      }
    }

    if (!base) return { label, abs: null, pct: null };

    return {
      label,
      abs: last.rate - base.rate,
      pct: (last.rate / base.rate - 1) * 100,
    };
  });
}

function monthlyReturnGrid(rows) {
  const monthEnd = new Map();
  rows.forEach((r) => monthEnd.set(r.date.slice(0, 7), r.rate));

  const keys = [...monthEnd.keys()].sort();
  const byYear = {};

  keys.forEach((key, i) => {
    if (i === 0) return;
    const [year, month] = key.split("-");
    const value = (monthEnd.get(key) / monthEnd.get(keys[i - 1]) - 1) * 100;
    if (!byYear[year]) byYear[year] = Array(12).fill(null);
    byYear[year][Number(month) - 1] = value;
  });

  return Object.keys(byYear)
    .sort()
    .reverse()
    .slice(0, 7)
    .map((year) => ({ year, months: byYear[year] }));
}

function buildInsights({ stats, perf, prediction, label, isUsd }) {
  const out = [];
  const base = label.split("/")[0];
  const month = perf.find((p) => p.label === "1M");

  if (month && isNum(month.pct)) {
    const up = month.pct >= 0;
    out.push(
      `${label} is ${up ? "up" : "down"} ${Math.abs(month.pct).toFixed(2)}% over the past month, so the rupee has ${
        up ? "weakened" : "strengthened"
      } against the ${base}.`
    );
  }

  if (stats && isNum(stats.ma_7) && isNum(stats.ma_30)) {
    out.push(
      stats.ma_7 >= stats.ma_30
        ? "The 7-day average is above the 30-day average, which points to upward short-term momentum."
        : "The 7-day average is below the 30-day average, which points to downward short-term momentum."
    );
  }

  if (stats && isNum(stats.high_52w) && isNum(stats.low_52w) && stats.high_52w > stats.low_52w) {
    const position = ((stats.latest - stats.low_52w) / (stats.high_52w - stats.low_52w)) * 100;
    out.push(
      `The rate sits at ${position.toFixed(0)}% of its 52-week range (${fmt(stats.low_52w, 2)} to ${fmt(
        stats.high_52w,
        2
      )}).`
    );
  }

  if (stats?.regime && stats.regime !== "unknown") {
    out.push(
      `Volatility is in a ${stats.regime} regime compared with its own history (30-day volatility ${fmt(
        stats.volatility_30,
        3
      )}%).`
    );
  }

  if (isUsd && prediction && isNum(prediction.forecast) && prediction.direction) {
    out.push(
      `The model expects USD/INR to move ${prediction.direction} to ${fmtINR(prediction.forecast)} (${fmtSigned(
        prediction.returnPct,
        4,
        "%"
      )}) on the next trading day.`
    );
  }

  return out;
}

function nextTradingDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

function downloadCsv(rows, currency) {
  const header = ["date", "rate", "ma_7", "ma_30", "change_pct", "volatility_30"];
  const lines = [
    header.join(","),
    ...rows.map((r) => header.map((h) => r[h] ?? "").join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `insightiq_${currency}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizePrediction(raw) {
  if (!raw || typeof raw !== "object") return null;

  const current = toNum(pick(raw, ["current_usd_inr", "current_rate", "current"]));
  const forecast = toNum(pick(raw, ["predicted_usd_inr", "predicted_rate", "forecast"]));
  let expectedChange = toNum(pick(raw, ["expected_change", "expected_change_inr"]));
  let returnPct = toNum(
    pick(raw, ["predicted_return_percent", "predicted_return", "return_percent"])
  );

  if (expectedChange === null && current !== null && forecast !== null) {
    expectedChange = forecast - current;
  }
  if (returnPct === null && current && forecast !== null) {
    returnPct = ((forecast - current) / current) * 100;
  }

  let direction = String(raw.direction ?? "").toUpperCase();
  if (direction !== "UP" && direction !== "DOWN") {
    direction = expectedChange === null ? "" : expectedChange >= 0 ? "UP" : "DOWN";
  }

  return {
    current,
    forecast,
    expectedChange,
    returnPct,
    direction,
    date: pick(raw, ["prediction_date", "date"]),
  };
}

function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable - ignore */
    }
  }, [key, value]);

  return [value, setValue];
}

const axisProps = (pal) => ({
  tick: { fill: pal.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
});

const tooltipProps = (pal, digits = 4, labelFormatter = fmtDate) => ({
  contentStyle: {
    background: pal.tooltipBg,
    border: `1px solid ${pal.tooltipBorder}`,
    borderRadius: 10,
    color: pal.tooltipText,
    fontSize: 12,
  },
  labelStyle: { color: pal.axis, marginBottom: 4 },
  itemStyle: { color: pal.tooltipText },
  labelFormatter,
  formatter: (value, name) => [isNum(value) ? Number(value).toFixed(digits) : "--", name],
  cursor: { stroke: pal.axis, strokeDasharray: "4 4" },
});

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function CountUp({ value, format }) {
  const [shown, setShown] = useState(null);
  const previous = useRef(null);

  useEffect(() => {
    if (!isNum(value)) return undefined;

    const to = Number(value);
    const from = previous.current ?? to;
    previous.current = to;

    if (from === to) return undefined;

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / 700, 1);
      setShown(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const display = shown !== null && isNum(value) ? shown : value;
  return <>{format(display)}</>;
}

function Panel({ title, subtitle, icon: Icon, actions, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div className="panel-title">
          {Icon && (
            <span className="panel-icon">
              <Icon size={16} />
            </span>
          )}
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function ChartBox({ loading, empty, emptyText, size = "", children }) {
  return (
    <div className={`chart-box ${size}`}>
      {loading ? (
        <div className="skeleton" />
      ) : empty ? (
        <div className="empty">
          <Activity size={26} />
          <span>{emptyText}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o}
          role="tab"
          aria-selected={value === o}
          className={value === o ? "active" : ""}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function DirectionBadge({ direction }) {
  const cls = direction === "UP" ? "up" : direction === "DOWN" ? "down" : "neutral";
  const Icon = direction === "UP" ? TrendingUp : direction === "DOWN" ? TrendingDown : Activity;
  return (
    <span className={`badge ${cls}`}>
      <Icon size={14} />
      {direction || "WAITING"}
    </span>
  );
}

/* =========================================================
   HERO
========================================================= */

function Hero({ label, stats, prediction, sparkRows, pal, marketLoading, coreLoading }) {
  const up = isNum(stats?.change) && stats.change >= 0;
  const regimeTone =
    stats?.regime === "high" ? "neg" : stats?.regime === "low" ? "pos" : "";

  return (
    <section className="hero">
      <div className="hero-main">
        <span className="eyebrow">
          <Sparkles size={13} />
          {label} · RBI reference rate
        </span>

        <div className="hero-rate">
          {marketLoading && !stats ? (
            <div className="skeleton line big" />
          ) : (
            <strong>
              <CountUp value={stats?.latest} format={fmtINR} />
            </strong>
          )}

          {isNum(stats?.change) && (
            <span className={`delta ${up ? "up" : "down"}`}>
              {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {fmtSigned(stats.change, 4)} ({fmtSigned(stats.change_pct, 3, "%")})
            </span>
          )}
        </div>

        <small className="muted">
          As of {fmtDate(stats?.last_date)} · a higher rate means a weaker rupee
        </small>

        <div className="spark">
          {sparkRows.length > 1 && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sparkRows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pal.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={pal.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip {...tooltipProps(pal)} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  name={label}
                  stroke={pal.accent}
                  strokeWidth={2}
                  fill="url(#sparkFill)"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="hero-side">
        <div className="tile">
          <span>AI forecast · USD/INR</span>
          {coreLoading && !prediction ? (
            <div className="skeleton line" />
          ) : (
            <strong>
              <CountUp value={prediction?.forecast} format={fmtINR} />
            </strong>
          )}
          <small>Next trading day</small>
        </div>

        <div className="tile">
          <span>Expected return</span>
          <strong className={isNum(prediction?.returnPct) ? (prediction.returnPct >= 0 ? "pos" : "neg") : ""}>
            {fmtSigned(prediction?.returnPct, 4, "%")}
          </strong>
          <small>Predicted next-day return</small>
        </div>

        <div className="tile">
          <span>Model outlook</span>
          <DirectionBadge direction={prediction?.direction} />
          <small>Random Forest direction</small>
        </div>

        <div className="tile">
          <span>Volatility regime</span>
          <strong className={regimeTone}>{(stats?.regime ?? "--").toUpperCase()}</strong>
          <small>30-day volatility {fmt(stats?.volatility_30, 3)}%</small>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CHARTS
========================================================= */

function MarketChart({ rows, pal, showMa7, showMa30, forecastPoint, tickFmt, label }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pal.accent} stopOpacity={0.3} />
            <stop offset="100%" stopColor={pal.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={pal.grid} strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="date" tickFormatter={tickFmt} minTickGap={40} {...axisProps(pal)} />
        <YAxis
          domain={["dataMin - 0.4", "dataMax + 0.4"]}
          width={56}
          tickFormatter={(v) => Number(v).toFixed(2)}
          {...axisProps(pal)}
        />
        <Tooltip {...tooltipProps(pal)} />
        <Legend wrapperStyle={{ fontSize: 12, color: pal.axis }} />
        <Area
          type="monotone"
          dataKey="rate"
          name={label}
          stroke={pal.accent}
          strokeWidth={2}
          fill="url(#rateFill)"
          dot={false}
          isAnimationActive={false}
        />
        {showMa7 && (
          <Line
            type="monotone"
            dataKey="ma_7"
            name="7-day MA"
            stroke={pal.ma7}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        )}
        {showMa30 && (
          <Line
            type="monotone"
            dataKey="ma_30"
            name="30-day MA"
            stroke={pal.ma30}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        )}
        {forecastPoint && (
          <Line
            type="linear"
            dataKey="forecast"
            name="AI forecast"
            stroke={pal.accent2}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        )}
        {forecastPoint && (
          <ReferenceDot
            x={forecastPoint.date}
            y={forecastPoint.value}
            r={6}
            fill={pal.accent2}
            stroke={pal.tooltipBg}
            strokeWidth={2}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function VolatilityChart({ rows, pal, tickFmt }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pal.accent2} stopOpacity={0.32} />
            <stop offset="100%" stopColor={pal.accent2} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={pal.grid} strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="date" tickFormatter={tickFmt} minTickGap={40} {...axisProps(pal)} />
        <YAxis width={48} tickFormatter={(v) => `${Number(v).toFixed(2)}%`} {...axisProps(pal)} />
        <Tooltip {...tooltipProps(pal, 3)} />
        <Area
          type="monotone"
          dataKey="volatility_30"
          name="30-day volatility (%)"
          stroke={pal.accent2}
          strokeWidth={2}
          fill="url(#volFill)"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function MonthlyChart({ rows, pal }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={pal.grid} strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthTick} minTickGap={20} {...axisProps(pal)} />
        <YAxis width={48} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} {...axisProps(pal)} />
        <Tooltip {...tooltipProps(pal, 3, monthTick)} cursor={{ fill: pal.grid }} />
        <ReferenceLine y={0} stroke={pal.axis} />
        <Bar dataKey="change_pct" name="Change in monthly average (%)" radius={[3, 3, 0, 0]}>
          {rows.map((r) => (
            <Cell key={r.month} fill={Number(r.change_pct) >= 0 ? pal.up : pal.down} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CompareChart({ rows, codes, currency, pal, tickFmt }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={pal.grid} strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="date" tickFormatter={tickFmt} minTickGap={40} {...axisProps(pal)} />
        <YAxis
          domain={["auto", "auto"]}
          width={48}
          tickFormatter={(v) => Number(v).toFixed(0)}
          {...axisProps(pal)}
        />
        <Tooltip {...tooltipProps(pal, 2)} />
        <Legend wrapperStyle={{ fontSize: 12, color: pal.axis }} />
        <ReferenceLine y={100} stroke={pal.axis} strokeDasharray="4 4" />
        {codes.map((code, i) => (
          <Line
            key={code}
            type="monotone"
            dataKey={code}
            name={labelOf(code)}
            stroke={pal.lines[i % pal.lines.length]}
            strokeWidth={code === currency ? 2.5 : 1.5}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* =========================================================
   SECTIONS
========================================================= */

function StatsGrid({ stats, loading }) {
  if (loading && !stats) {
    return (
      <div className="grid-stats">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="stat skeleton" />
        ))}
      </div>
    );
  }
  if (!stats) return null;

  const trendUp = isNum(stats.ma_7) && isNum(stats.ma_30) && stats.ma_7 >= stats.ma_30;

  const items = [
    { label: "52-week high", value: fmt(stats.high_52w), sub: fmtDate(stats.high_52w_date) },
    { label: "52-week low", value: fmt(stats.low_52w), sub: fmtDate(stats.low_52w_date) },
    { label: "30-day average", value: fmt(stats.avg_30d), sub: `Latest ${fmt(stats.latest)}` },
    {
      label: "30-day volatility",
      value: `${fmt(stats.volatility_30, 3)}%`,
      sub: `Regime: ${stats.regime}`,
    },
    {
      label: "Largest daily rise (1Y)",
      value: fmtSigned(stats.best_day?.change_pct, 3, "%"),
      sub: fmtDate(stats.best_day?.date),
    },
    {
      label: "Largest daily fall (1Y)",
      value: fmtSigned(stats.worst_day?.change_pct, 3, "%"),
      sub: fmtDate(stats.worst_day?.date),
    },
    {
      label: "Trend (7D vs 30D MA)",
      value: trendUp ? "Rising" : "Falling",
      sub: "Higher rate = weaker rupee",
    },
    {
      label: "Data points",
      value: String(stats.data_points ?? "--"),
      sub: `${fmtDate(stats.first_date)} → ${fmtDate(stats.last_date)}`,
    },
  ];

  return (
    <div className="grid-stats">
      {items.map((item) => (
        <div className="stat" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.sub}</small>
        </div>
      ))}
    </div>
  );
}

function PerformanceStrip({ perf, loading }) {
  return (
    <Panel title="Performance" subtitle="Change in the rate over each period" icon={TrendingUp}>
      {loading && !perf.length ? (
        <div className="perf-strip">
          {PERIODS.map(([label]) => (
            <div key={label} className="perf-item skeleton" />
          ))}
        </div>
      ) : (
        <div className="perf-strip">
          {perf.map((p) => (
            <div className="perf-item" key={p.label}>
              <span>{p.label}</span>
              <strong className={isNum(p.pct) ? (p.pct >= 0 ? "pos" : "neg") : ""}>
                {fmtSigned(p.pct, 2, "%")}
              </strong>
              <small>{fmtSigned(p.abs, 3)}</small>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function InsightsPanel({ insights, loading }) {
  return (
    <Panel
      title="Key insights"
      subtitle="Generated automatically from the latest data"
      icon={Sparkles}
    >
      {insights.length ? (
        <ul className="insights">
          {insights.map((text) => (
            <li key={text}>
              <Sparkles size={14} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <Sparkles size={24} />
          <span>{loading ? "Analysing data..." : "Not enough data for insights."}</span>
        </div>
      )}
    </Panel>
  );
}

function PredictionPanel({ prediction, loading, features }) {
  const p = prediction;

  return (
    <Panel title="AI forecast" subtitle="Next trading day · USD/INR" icon={Brain}>
      <div className="forecast">
        <span className="muted">Predicted rate</span>
        {loading && !p ? (
          <div className="skeleton line big" />
        ) : (
          <strong className="forecast-value">{fmtINR(p?.forecast)}</strong>
        )}
        <DirectionBadge direction={p?.direction} />
      </div>

      <dl className="kv">
        <div>
          <dt>Latest rate</dt>
          <dd>{fmtINR(p?.current)}</dd>
        </div>
        <div>
          <dt>Expected change</dt>
          <dd>{fmtSigned(p?.expectedChange, 4)}</dd>
        </div>
        <div>
          <dt>Expected return</dt>
          <dd>{fmtSigned(p?.returnPct, 4, "%")}</dd>
        </div>
        <div>
          <dt>Based on data of</dt>
          <dd>{fmtDate(p?.date)}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>
            Random Forest
            {features?.features?.count ? ` · ${features.features.count} features` : ""}
          </dd>
        </div>
      </dl>

      <p className="note">
        Experimental model output for learning and analysis. It is not financial advice.
      </p>
    </Panel>
  );
}

function Heatmap({ grid }) {
  if (!grid.length) {
    return (
      <div className="empty">
        <Activity size={26} />
        <span>Not enough monthly data for a heatmap.</span>
      </div>
    );
  }

  return (
    <div className="heatmap">
      <div className="hm-row hm-head">
        <span />
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      {grid.map(({ year, months }) => (
        <div className="hm-row" key={year}>
          <b>{year}</b>
          {months.map((v, i) => {
            if (v === null) {
              return (
                <span key={i} className="hm-cell blank">
                  –
                </span>
              );
            }
            const strength = Math.min(Math.abs(v) / 1.5, 1);
            const tone = v >= 0 ? "var(--up)" : "var(--down)";
            return (
              <span
                key={i}
                className="hm-cell"
                title={`${MONTHS[i]} ${year}: ${fmtSigned(v, 2, "%")}`}
                style={{
                  background: `color-mix(in srgb, ${tone} ${Math.round(15 + strength * 65)}%, transparent)`,
                }}
              >
                {v.toFixed(1)}
              </span>
            );
          })}
        </div>
      ))}

      <p className="hm-legend">
        <span className="pos">■ Rate rose (rupee weaker)</span>
        <span className="neg">■ Rate fell (rupee stronger)</span>
        <span>Month-end to month-end change, %</span>
      </p>
    </div>
  );
}

function Converter({ label, latest, forecast, isUsd }) {
  const [amount, setAmount] = useState("100");
  const [toInr, setToInr] = useState(true);
  const base = label.split("/")[0];
  const n = Number(amount);

  const calc = (rate) => {
    if (!isNum(rate) || !isNum(amount) || n < 0) return null;
    return toInr ? n * rate : n / rate;
  };

  const outUnit = toInr ? "INR" : base;
  const format = (v) =>
    v === null ? "--" : `${toInr ? "₹" : ""}${v.toLocaleString("en-IN", { maximumFractionDigits: 4 })}${toInr ? "" : ` ${base}`}`;

  return (
    <Panel title="Currency converter" subtitle={`${base} ⇄ INR using the latest and forecast rate`} icon={Calculator}>
      <div className="conv">
        <div className="conv-input">
          <label htmlFor="amount">{toInr ? base : "INR"}</label>
          <input
            id="amount"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="icon-btn"
            onClick={() => setToInr((v) => !v)}
            aria-label="Swap direction"
            title="Swap direction"
          >
            <ArrowRightLeft size={16} />
          </button>
        </div>

        <dl className="kv">
          <div>
            <dt>At latest rate ({fmt(latest, 4)})</dt>
            <dd>{format(calc(latest))}</dd>
          </div>
          {isUsd && (
            <div>
              <dt>At AI forecast ({fmt(forecast, 4)})</dt>
              <dd>{format(calc(forecast))}</dd>
            </div>
          )}
          {isUsd && isNum(calc(latest)) && isNum(calc(forecast)) && (
            <div>
              <dt>Difference in {outUnit}</dt>
              <dd className={calc(forecast) - calc(latest) >= 0 ? "pos" : "neg"}>
                {fmtSigned(calc(forecast) - calc(latest), 4)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Panel>
  );
}

function OilView({ signals, loading, pal }) {
  const oil = signals?.oil;

  if (!oil) {
    return (
      <Panel title="Oil signals" subtitle="WTI crude-oil context" icon={Droplets}>
        {loading ? (
          <div className="chart-box short">
            <div className="skeleton" />
          </div>
        ) : (
          <div className="empty">
            <Droplets size={26} />
            <span>Oil signals are unavailable. Check the /api/signals endpoint.</span>
          </div>
        )}
      </Panel>
    );
  }

  const returns = [
    { name: "1D", value: oil.return_1d },
    { name: "7D", value: oil.return_7d },
    { name: "30D", value: oil.return_30d },
  ];
  const above = isNum(oil.price) && isNum(oil.ma_30) && oil.price >= oil.ma_30;

  const items = [
    { label: "WTI price", value: fmt(oil.price, 2), sub: `As of ${fmtDate(signals.date)}` },
    { label: "7-day MA", value: fmt(oil.ma_7, 2), sub: "Short-term average" },
    { label: "30-day MA", value: fmt(oil.ma_30, 2), sub: "Medium-term average" },
    { label: "7-day volatility", value: fmt(oil.volatility_7, 4), sub: "Model units" },
    { label: "30-day volatility", value: fmt(oil.volatility_30, 4), sub: "Model units" },
  ];

  return (
    <>
      <div className="grid-stats">
        {items.map((item) => (
          <div className="stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.sub}</small>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <Panel title="Oil returns" subtitle="1, 7 and 30-day returns (model units)" icon={Droplets}>
          <ChartBox size="short">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={returns} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={pal.grid} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="name" {...axisProps(pal)} />
                <YAxis width={48} {...axisProps(pal)} />
                <Tooltip {...tooltipProps(pal, 4, (l) => `${l} return`)} cursor={{ fill: pal.grid }} />
                <ReferenceLine y={0} stroke={pal.axis} />
                <Bar dataKey="value" name="Return" radius={[3, 3, 0, 0]}>
                  {returns.map((r) => (
                    <Cell key={r.name} fill={Number(r.value) >= 0 ? pal.up : pal.down} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Panel>

        <Panel title="Reading the signal" subtitle="Context, not a rule" icon={Gauge}>
          <ul className="insight-list">
            <li>
              Oil is trading <strong>{above ? "above" : "below"}</strong> its 30-day average, so
              recent momentum is <strong>{above ? "positive" : "negative"}</strong>.
            </li>
            <li>
              India imports most of its crude, so higher oil can raise the import bill and put
              pressure on the rupee. The link is not constant.
            </li>
            <li>
              The model uses these oil features alongside the USD/INR features. It does not
              assume a fixed relationship.
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

function ModelView({ features, prediction, loading }) {
  const names = features?.features?.names ?? [];

  return (
    <>
      <div className="grid-2">
        <PredictionPanel prediction={prediction} loading={loading} features={features} />

        <Panel
          title="Model inputs"
          subtitle={`${features?.features?.count ?? "--"} engineered features at ${fmtDate(features?.date)}`}
          icon={Layers3}
        >
          {names.length ? (
            <div className="chips">
              {names.map((n) => (
                <span className="tag" key={n}>
                  {n}
                </span>
              ))}
            </div>
          ) : (
            <div className="empty">
              <Layers3 size={26} />
              <span>{loading ? "Loading features..." : "Feature list unavailable."}</span>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Data pipeline" subtitle="From raw observations to the forecast" icon={Zap}>
        <div className="pipeline">
          {PIPELINE.map(({ icon: Icon, title, text }, i) => (
            <div className="pipe-step" key={title}>
              <span className="pipe-icon">
                <Icon size={18} />
              </span>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function AboutView() {
  return (
    <>
      <Panel
        title="InsightIQ AI"
        subtitle="AI-powered currency intelligence and analytics platform"
        icon={Brain}
      >
        <p className="about-text">
          InsightIQ AI is an end-to-end data analytics and machine learning platform that analyses
          and forecasts the USD/INR exchange rate using historical RBI reference-rate data and
          external WTI crude-oil signals. It joins data ingestion, PostgreSQL storage, feature
          engineering, statistical analytics, a Random Forest model, a FastAPI service and this
          interactive dashboard into one pipeline.
        </p>
        <p className="about-text">
          Built by <strong>Soumya Prakash Satapathy</strong> · B.Tech (Hons.) Computer Science &amp;
          Engineering, XIM University, Bhubaneswar.
        </p>
      </Panel>

      <div className="grid-2">
        <Panel title="Key capabilities" subtitle="What the platform does" icon={Sparkles}>
          <ul className="insight-list">
            {CAPABILITIES.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Tech stack" subtitle="Technologies used" icon={Layers3}>
          <div className="tech">
            {TECH.map(({ group, items }) => (
              <div key={group}>
                <span className="tech-title">{group}</span>
                <div className="chips">
                  {items.map((i) => (
                    <span className="tag" key={i}>
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Architecture" subtitle="Data flow from source to dashboard" icon={Zap}>
        <div className="pipeline">
          {PIPELINE.map(({ icon: Icon, title, text }, i) => (
            <div className="pipe-step" key={title}>
              <span className="pipe-icon">
                <Icon size={18} />
              </span>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Panel>

      <p className="note">
        Disclaimer: forecasts are experimental model outputs for learning and analysis. They are not
        financial advice and should not be used for trading decisions.
      </p>
    </>
  );
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  const [theme, setTheme] = usePersistedState("insightiq-theme", "dark");
  const [view, setView] = useState("overview");
  const [currency, setCurrency] = useState("usd_inr");
  const [range, setRange] = useState("1Y");
  const [showMa7, setShowMa7] = useState(true);
  const [showMa30, setShowMa30] = useState(true);

  const [currencies, setCurrencies] = useState([{ code: "usd_inr", label: "USD/INR" }]);
  const [prediction, setPrediction] = useState(null);
  const [signals, setSignals] = useState(null);
  const [features, setFeatures] = useState(null);

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [compare, setCompare] = useState(null);

  const [coreLoading, setCoreLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [errors, setErrors] = useState({ core: null, market: null });
  const [apiOnline, setApiOnline] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const requestId = useRef(0);

  /* ---------- theme ---------- */

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /* ---------- core data ---------- */

  const loadCore = useCallback(async () => {
    setCoreLoading(true);

    const results = await Promise.allSettled([
      api.get("/api/prediction"),
      api.get("/api/currencies"),
      api.get("/api/signals"),
      api.get("/api/features"),
    ]);

    const [pred, curr, sig, feat] = results;

    if (pred.status === "fulfilled") setPrediction(normalizePrediction(pred.value.data));
    if (curr.status === "fulfilled" && curr.value.data?.currencies?.length) {
      setCurrencies(curr.value.data.currencies);
    }
    if (sig.status === "fulfilled") setSignals(sig.value.data);
    if (feat.status === "fulfilled") setFeatures(feat.value.data);

    const names = ["prediction", "currencies", "signals", "features"];
    const failed = results
      .map((r, i) => (r.status === "rejected" ? names[i] : null))
      .filter(Boolean);

    setApiOnline(failed.length < results.length);
    setErrors((prev) => ({
      ...prev,
      core: failed.length ? `Could not load: ${failed.join(", ")}.` : null,
    }));
    setUpdatedAt(new Date());
    setCoreLoading(false);
  }, []);

  /* ---------- market data (full history, sliced in the browser) ---------- */

  const loadMarket = useCallback(async () => {
    const id = ++requestId.current;
    setMarketLoading(true);

    const results = await Promise.allSettled([
      api.get("/api/history", { params: { currency } }),
      api.get("/api/stats", { params: { currency } }),
      api.get("/api/monthly", { params: { currency, months: 24 } }),
      api.get("/api/compare"),
    ]);

    if (id !== requestId.current) return;

    const [h, s, m, c] = results;

    setHistory(h.status === "fulfilled" ? h.value.data?.data ?? [] : []);
    setStats(s.status === "fulfilled" ? s.value.data : null);
    setMonthly(m.status === "fulfilled" ? m.value.data?.data ?? [] : []);
    setCompare(c.status === "fulfilled" ? c.value.data : null);

    const names = ["history", "stats", "monthly", "comparison"];
    const failed = results
      .map((r, i) => (r.status === "rejected" ? names[i] : null))
      .filter(Boolean);

    setErrors((prev) => ({
      ...prev,
      market: failed.length ? `Could not load: ${failed.join(", ")}.` : null,
    }));
    setUpdatedAt(new Date());
    setMarketLoading(false);
  }, [currency]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadCore();
      loadMarket();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadCore, loadMarket]);

  const refreshAll = () => {
    loadCore();
    loadMarket();
  };

  /* ---------- derived ---------- */

  const pal = PALETTE[theme] ?? PALETTE.dark;
  const loading = coreLoading || marketLoading;
  const isUsd = currency === "usd_inr";
  const currentLabel = currencies.find((c) => c.code === currency)?.label ?? labelOf(currency);
  const rangeDays = RANGES.find((r) => r.id === range)?.days ?? null;
  const tickFmt = useMemo(() => makeTickFormatter(rangeDays), [rangeDays]);

  const rangeRows = useMemo(() => sliceRange(history, rangeDays), [history, rangeDays]);
  const sparkRows = useMemo(() => history.slice(-60), [history]);
  const perf = useMemo(() => periodChanges(history), [history]);
  const heatGrid = useMemo(() => monthlyReturnGrid(history), [history]);

  const forecastPoint = useMemo(() => {
    if (!isUsd || !isNum(prediction?.forecast) || !rangeRows.length) return null;

    const last = rangeRows[rangeRows.length - 1];
    let date = prediction.date ? String(prediction.date).slice(0, 10) : null;

    if (!date || date <= last.date) {
      date = nextTradingDate(last.date);
    }

    return { date, value: prediction.forecast };
  }, [isUsd, prediction, rangeRows]);

  const chartRows = useMemo(() => {
    const base = downsample(rangeRows);
    if (!forecastPoint || !base.length) return base;

    const withBridge = base.map((r, i) =>
      i === base.length - 1 ? { ...r, forecast: r.rate } : r
    );

    return [...withBridge, { date: forecastPoint.date, forecast: forecastPoint.value }];
  }, [rangeRows, forecastPoint]);

  const compareCodes = compare?.currencies ?? [];

  const compareRows = useMemo(() => {
    const rows = sliceRange(compare?.data ?? [], rangeDays);
    if (!rows.length) return [];

    const codes = compare.currencies ?? [];
    const baseValues = {};

    codes.forEach((code) => {
      const first = rows.find((r) => isNum(r[code]));
      baseValues[code] = first ? first[code] : null;
    });

    return downsample(
      rows.map((r) => {
        const item = { date: r.date };
        codes.forEach((code) => {
          item[code] =
            isNum(r[code]) && baseValues[code] ? (r[code] / baseValues[code]) * 100 : null;
        });
        return item;
      })
    );
  }, [compare, rangeDays]);

  const insights = useMemo(
    () => buildInsights({ stats, perf, prediction, label: currentLabel, isUsd }),
    [stats, perf, prediction, currentLabel, isUsd]
  );

  const banner = [errors.core, errors.market].filter(Boolean).join(" ");
  const showToolbar = ["overview", "market", "analytics"].includes(view);
  const statsLoading = marketLoading && !stats;
  const [title, subtitle] = TITLES[view];

  /* ---------- reusable blocks ---------- */

  const toolbar = (
    <div className="toolbar">
      <div className="toolbar-group">
        <label className="muted" htmlFor="currency">
          Currency
        </label>
        <select
          id="currency"
          className="select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <Segmented options={RANGES.map((r) => r.id)} value={range} onChange={setRange} />

      <div className="toolbar-group">
        <button className={`chip ${showMa7 ? "on" : ""}`} onClick={() => setShowMa7((v) => !v)}>
          7-day MA
        </button>
        <button className={`chip ${showMa30 ? "on" : ""}`} onClick={() => setShowMa30((v) => !v)}>
          30-day MA
        </button>
        <button
          className="btn ghost"
          onClick={() => downloadCsv(rangeRows, currency)}
          disabled={!rangeRows.length}
        >
          <Download size={14} />
          CSV
        </button>
      </div>
    </div>
  );

  const marketPanel = (size) => (
    <Panel
      title={`${currentLabel} price`}
      subtitle={
        forecastPoint
          ? "RBI reference rate with the AI forecast shown as a dashed line"
          : "RBI reference rate · higher means a weaker rupee"
      }
      icon={LineChartIcon}
      actions={<span className="muted small">{rangeRows.length} records</span>}
    >
      <ChartBox
        size={size}
        loading={marketLoading && !history.length}
        empty={!history.length}
        emptyText="No data received. Check the /api/history endpoint."
      >
        <MarketChart
          rows={chartRows}
          pal={pal}
          showMa7={showMa7}
          showMa30={showMa30}
          forecastPoint={forecastPoint}
          tickFmt={tickFmt}
          label={currentLabel}
        />
      </ChartBox>
    </Panel>
  );

  /* ---------- render ---------- */

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Brain size={20} />
          </span>
          <div>
            <h1>
              InsightIQ <span>AI</span>
            </h1>
            <p>Currency intelligence</p>
          </div>
        </div>

        <nav className="nav">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => setView(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="api-status">
            <span className={`dot ${apiOnline === false ? "bad" : apiOnline ? "ok" : ""}`} />
            {apiOnline === null
              ? "Connecting..."
              : apiOnline
              ? "API connected"
              : "API unreachable"}
          </div>
          <small>{API_BASE_URL}</small>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="topbar-actions">
            {updatedAt && (
              <span className="muted small">
                Updated {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              className="icon-btn"
              onClick={() => window.print()}
              aria-label="Print or save as PDF"
              title="Print or save as PDF"
            >
              <Printer size={16} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="btn" onClick={refreshAll} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        <main className="content">
          {banner && (
            <div className="banner">
              <div>
                <strong>Some data is unavailable.</strong> {banner} Is the API running at{" "}
                {API_BASE_URL}?
              </div>
              <button className="btn ghost" onClick={refreshAll}>
                Try again
              </button>
            </div>
          )}

          {showToolbar && toolbar}

          {view === "overview" && (
            <>
              <Hero
                label={currentLabel}
                stats={stats}
                prediction={prediction}
                sparkRows={sparkRows}
                pal={pal}
                marketLoading={marketLoading}
                coreLoading={coreLoading}
              />

              <section className="grid-main">
                {marketPanel("")}
                <PredictionPanel prediction={prediction} loading={coreLoading} features={features} />
              </section>

              <div className="grid-2">
                <PerformanceStrip perf={perf} loading={marketLoading} />
                <InsightsPanel insights={insights} loading={loading} />
              </div>

              <StatsGrid stats={stats} loading={statsLoading} />
            </>
          )}

          {view === "market" && (
            <>
              {marketPanel("tall")}

              <Panel
                title="Currency comparison"
                subtitle="All currencies rebased to 100 at the start of the selected range"
                icon={Layers3}
              >
                <ChartBox
                  size="tall"
                  loading={marketLoading && !compare}
                  empty={!compareRows.length}
                  emptyText="No comparison data. Check the /api/compare endpoint."
                >
                  <CompareChart
                    rows={compareRows}
                    codes={compareCodes}
                    currency={currency}
                    pal={pal}
                    tickFmt={tickFmt}
                  />
                </ChartBox>
              </Panel>

              <div className="grid-2">
                <PerformanceStrip perf={perf} loading={marketLoading} />
                <Converter
                  label={currentLabel}
                  latest={stats?.latest}
                  forecast={prediction?.forecast}
                  isUsd={isUsd}
                />
              </div>
            </>
          )}

          {view === "analytics" && (
            <>
              <StatsGrid stats={stats} loading={statsLoading} />

              <div className="grid-2">
                <Panel
                  title="Rolling volatility"
                  subtitle="30-day standard deviation of daily % changes"
                  icon={Activity}
                >
                  <ChartBox
                    size="short"
                    loading={marketLoading && !history.length}
                    empty={!rangeRows.length}
                    emptyText="No volatility data available."
                  >
                    <VolatilityChart rows={downsample(rangeRows)} pal={pal} tickFmt={tickFmt} />
                  </ChartBox>
                </Panel>

                <Panel
                  title="Monthly trend"
                  subtitle="Change in monthly average rate (last 24 months)"
                  icon={BarChart3}
                >
                  <ChartBox
                    size="short"
                    loading={marketLoading && !monthly.length}
                    empty={!monthly.length}
                    emptyText="No monthly data available."
                  >
                    <MonthlyChart rows={monthly} pal={pal} />
                  </ChartBox>
                </Panel>
              </div>

              <Panel
                title="Monthly returns heatmap"
                subtitle={`${currentLabel} month-end changes by year`}
                icon={Layers3}
              >
                <Heatmap grid={heatGrid} />
              </Panel>
            </>
          )}

          {view === "oil" && <OilView signals={signals} loading={coreLoading} pal={pal} />}

          {view === "model" && (
            <ModelView features={features} prediction={prediction} loading={coreLoading} />
          )}

          {view === "about" && <AboutView />}

          <footer className="footer">
            <span>
              <ShieldCheck size={13} /> InsightIQ AI · experimental analytics, not financial advice
            </span>
            <span>Data: RBI reference rates + WTI crude oil</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
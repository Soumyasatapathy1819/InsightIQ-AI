import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  CircleDollarSign,
  Cpu,
  Database,
  Droplets,
  Gauge,
  Layers3,
  LayoutDashboard,
  LineChart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE_URL = "http://127.0.0.1:8000";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "market", label: "Market Monitor", icon: LineChart },
  { id: "prediction", label: "Predictions", icon: TrendingUp },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "pipeline", label: "Pipeline", icon: Cpu },
  { id: "insights", label: "Model Insights", icon: Brain },
];

/* =========================================================
   FORMATTERS
========================================================= */

function formatCurrency(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "₹--";
  }

  return `₹${Number(value).toFixed(4)}`;
}

function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "--";
  }

  return `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(4)}%`;
}

function formatDate(dateValue) {
  if (!dateValue) return "--";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue).slice(0, 10);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   NORMALIZE HISTORY DATA

   Handles:
   - Array response
   - { history: [] }
   - { data: [] }
   - { results: [] }

   Also supports different backend field names.
========================================================= */

function normalizeHistoryResponse(responseData) {
  let rows = [];

  if (Array.isArray(responseData)) {
    rows = responseData;
  } else if (Array.isArray(responseData?.history)) {
    rows = responseData.history;
  } else if (Array.isArray(responseData?.data)) {
    rows = responseData.data;
  } else if (Array.isArray(responseData?.results)) {
    rows = responseData.results;
  }

  return rows
    .map((row) => {
      const date =
        row?.date ??
        row?.Date ??
        row?.prediction_date ??
        row?.predictionDate ??
        row?.timestamp;

      const usd =
        row?.usd_inr ??
        row?.USD_INR ??
        row?.usdInr ??
        row?.usd_inr_rate ??
        row?.usd_rate ??
        row?.rate ??
        row?.value ??
        row?.close;

      const numericUsd = Number(usd);

      if (!date || !Number.isFinite(numericUsd)) {
        return null;
      }

      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }

      return {
        date: parsedDate.toISOString().slice(0, 10),
        usd_inr: numericUsd,
        dateLabel: parsedDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* =========================================================
   INTERACTIVE 3D CARD
========================================================= */

function TiltCard({ children, className = "", ...props }) {
  const handleMove = (event) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    element.style.setProperty("--rx", `${y * -4}deg`);
    element.style.setProperty("--ry", `${x * 4}deg`);
    element.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
    element.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  };

  const reset = (event) => {
    const element = event.currentTarget;

    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
    element.style.setProperty("--mx", "50%");
    element.style.setProperty("--my", "50%");
  };

  return (
    <div
      className={`tilt-card ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      {...props}
    >
      {children}
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");

  /* =======================================================
     FETCH PREDICTION
  ======================================================= */

  const fetchPrediction = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/prediction`,
        {
          timeout: 10000,
        }
      );

      console.log("Prediction API response:", response.data);

      setPrediction(response.data);

      return response.data;
    } catch (err) {
      console.error("Prediction API error:", err);
      throw err;
    }
  }, []);

  /* =======================================================
     FETCH HISTORY
  ======================================================= */

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/history`,
        {
          timeout: 10000,
        }
      );

      console.log(
        "Historical API response:",
        response.data
      );

      const normalized = normalizeHistoryResponse(
        response.data
      );

      console.log(
        "Normalized chart rows:",
        normalized.length,
        normalized.slice(0, 3)
      );

      setHistory(normalized);

      return normalized;
    } catch (err) {
      console.error("History API error:", err);

      setHistory([]);

      throw err;
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /* =======================================================
     REFRESH EVERYTHING
  ======================================================= */

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      fetchPrediction(),
      fetchHistory(),
    ]);

    const predictionFailed =
      results[0].status === "rejected";

    const historyFailed =
      results[1].status === "rejected";

    if (predictionFailed && historyFailed) {
      setError(
        "Unable to connect to the InsightIQ AI backend."
      );
    } else if (predictionFailed) {
      setError(
        "Prediction service is unavailable. Historical data may still be available."
      );
    } else if (historyFailed) {
      setError(
        "Historical data could not be loaded. Prediction service is still available."
      );
    }

    setLoading(false);
  }, [fetchPrediction, fetchHistory]);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  /* =======================================================
     AUTO REFRESH
     Refreshes data every 5 minutes.
======================================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAll]);

  /* =======================================================
     SIDEBAR SECTION OBSERVER
  ======================================================= */

  useEffect(() => {
    const sections = navItems
      .map((item) =>
        document.querySelector(
          `[data-section="${item.id}"]`
        )
      )
      .filter(Boolean);

    if (!sections.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio -
              a.intersectionRatio
          )[0];

        if (visible?.target?.dataset?.section) {
          setActiveSection(
            visible.target.dataset.section
          );
        }
      },
      {
        rootMargin: "-15% 0px -65% 0px",
        threshold: [0.05, 0.15, 0.3],
      }
    );

    sections.forEach((section) =>
      observer.observe(section)
    );

    return () => observer.disconnect();
  }, []);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigateTo = useCallback((section) => {
    setActiveSection(section);

    const target = document.querySelector(
      `[data-section="${section}"]`
    );

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const direction =
    prediction?.direction?.toUpperCase();

  const directionUp = direction === "UP";
  const directionDown = direction === "DOWN";

  const current =
    prediction?.current_usd_inr ??
    prediction?.current_rate ??
    prediction?.current;

  const forecast =
    prediction?.predicted_usd_inr ??
    prediction?.predicted_rate ??
    prediction?.forecast;

  const expectedChange =
    prediction?.expected_change ??
    prediction?.expected_change_inr;

  const predictedReturn =
    prediction?.predicted_return_percent ??
    prediction?.predicted_return ??
    prediction?.return_percent;

  /* =======================================================
     CHART DATA
  ======================================================= */

  const chartData = useMemo(() => {
    if (!history.length) {
      return [];
    }

    return history.map((row) => ({
      date: row.date,
      dateLabel: row.dateLabel,
      usd_inr: Number(row.usd_inr),
    }));
  }, [history]);

  /* =======================================================
     LAST DATE
  ======================================================= */

  const lastDate =
    prediction?.prediction_date ||
    prediction?.date ||
    (history.length
      ? history[history.length - 1]?.date
      : null);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="app-shell">

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="background-grid" />

      <div className="ambient ambient-blue" />
      <div className="ambient ambient-purple" />
      <div className="ambient ambient-cyan" />

      <div className="scanline" />

      <div
        className="particles"
        aria-hidden="true"
      >
        {Array.from({ length: 18 }).map(
          (_, index) => (
            <span
              className="particle"
              key={index}
            />
          )
        )}
      </div>

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-logo">

            <Brain
              size={24}
              strokeWidth={2.2}
            />

            <span className="brand-status" />

          </div>

          <div>

            <h1>
              InsightIQ{" "}
              <span>AI</span>
            </h1>

            <p>
              Currency Intelligence Platform
            </p>

          </div>

        </div>

        <div className="sidebar-label">
          INTELLIGENCE CONSOLE
        </div>

        <nav className="sidebar-nav">

          {navItems.map(
            ({
              id,
              label,
              icon: Icon,
            }) => (
              <button
                key={id}
                className={`nav-item ${
                  activeSection === id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  navigateTo(id)
                }
              >

                <span className="nav-icon">
                  <Icon size={17} />
                </span>

                <span>{label}</span>

                {activeSection === id && (
                  <i className="nav-active-glow" />
                )}

              </button>
            )
          )}

        </nav>

        <div className="sidebar-status">

          <div className="status-title">
            AI ENGINE STATUS
          </div>

          <div className="status-online">
            <span />
            ONLINE
          </div>

          <div
            className="mini-wave"
            aria-hidden="true"
          >
            {[
              18,
              28,
              21,
              35,
              25,
              42,
              32,
              46,
            ].map(
              (height, index) => (
                <span
                  key={index}
                  style={{
                    height,
                  }}
                />
              )
            )}
          </div>

          <div className="sidebar-update">
            Latest model connection

            <strong>
              Pipeline synchronized
            </strong>
          </div>

          <div className="system-operational">
            <ShieldCheck size={13} />

            All systems operational
          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="main-content">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="topbar-context">

            <span className="context-dot" />

            LIVE MARKET INTELLIGENCE

          </div>

          <div className="topbar-actions">

            <div className="engine-online">

              <span />

              <div>

                <strong>
                  AI Engine Online
                </strong>

                <small>
                  Pipeline synchronized
                </small>

              </div>

            </div>

            <button
              className="refresh-button"
              onClick={refreshAll}
              disabled={loading}
            >

              <RefreshCw
                size={15}
                className={
                  loading
                    ? "spin"
                    : ""
                }
              />

              {loading
                ? "Refreshing..."
                : "Refresh Data"}

            </button>

          </div>

        </header>

        <main className="dashboard-content">

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="error-box">

              <div>

                <strong>
                  Backend connection issue
                </strong>

                <span>
                  {error}
                </span>

              </div>

              <button
                onClick={refreshAll}
              >
                Try Again
              </button>

            </div>
          )}

          {/* =================================================
              HERO
          ================================================= */}

          <section
            className="hero-dashboard section-anchor"
            data-section="dashboard"
          >

            <div className="hero-copy">

              <div className="hero-kicker">

                <Sparkles size={13} />

                AI-POWERED MARKET INTELLIGENCE

              </div>

              <h2>
                Intelligence
                <br />

                <span>
                  that moves markets.
                </span>
              </h2>

              <p>
                InsightIQ AI predicts tomorrow&apos;s
                USD/INR exchange rate using
                engineered currency features,
                RBI reference data and crude-oil
                market signals.
              </p>

              <div className="hero-chips">

                <span>
                  <Database size={12} />
                  RBI data
                </span>

                <span>
                  <Droplets size={12} />
                  WTI signals
                </span>

                <span>
                  <Brain size={12} />
                  Random Forest
                </span>

                <span>
                  <Layers3 size={12} />
                  20 features
                </span>

              </div>

              <div className="prediction-date">

                <CalendarDays size={14} />

                Prediction for

                <strong>
                  {formatDate(lastDate)}
                </strong>

              </div>

            </div>

            {/* =================================================
                3D AI SCENE
            ================================================= */}

            <div
              className="hero-visual"
              aria-label="InsightIQ AI engine visualization"
            >

              <div className="scene-grid" />
              <div className="energy-floor" />

              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />

              <div className="core-halo" />

              <div className="ai-core">

                <div className="core-shine" />

                <Brain size={38} />

                <strong>
                  InsightIQ
                </strong>

                <span>
                  AI Engine
                </span>

              </div>

              <div className="scene-node node-rbi">

                <Database size={18} />

                <strong>
                  RBI
                </strong>

                <small>
                  Reference Rates
                </small>

              </div>

              <div className="scene-node node-oil">

                <Droplets size={18} />

                <strong>
                  WTI
                </strong>

                <small>
                  Oil Signals
                </small>

              </div>

              <div className="scene-node node-features">

                <Layers3 size={18} />

                <strong>
                  FEATURES
                </strong>

                <small>
                  20 engineered inputs
                </small>

              </div>

              <div className="scene-node node-model">

                <Brain size={18} />

                <strong>
                  RANDOM FOREST
                </strong>

                <small>
                  Regression model
                </small>

              </div>

              <div
                className={`scene-outlook ${
                  directionUp
                    ? "up"
                    : directionDown
                    ? "down"
                    : ""
                }`}
              >

                <span>
                  MODEL OUTLOOK
                </span>

                <strong>
                  {loading
                    ? "..."
                    : direction || "WAITING"}
                </strong>

              </div>

            </div>

          </section>

          {/* =================================================
              KPI CARDS
          ================================================= */}

          <section className="kpi-grid">

            <TiltCard className="kpi-card blue">

              <div className="kpi-icon">
                <CircleDollarSign size={20} />
              </div>

              <span className="kpi-label">
                CURRENT USD/INR
              </span>

              <strong>
                {loading
                  ? "--"
                  : formatCurrency(current)}
              </strong>

              <small>
                Latest RBI reference rate
              </small>

              <div className="kpi-scan" />

            </TiltCard>

            <TiltCard className="kpi-card purple">

              <div className="kpi-icon">
                <Brain size={20} />
              </div>

              <span className="kpi-label">
                AI FORECAST
              </span>

              <strong>
                {loading
                  ? "--"
                  : formatCurrency(forecast)}
              </strong>

              <small>
                Predicted next-day rate
              </small>

              <div className="kpi-scan" />

            </TiltCard>

            <TiltCard className="kpi-card green">

              <div className="kpi-icon">
                <Activity size={20} />
              </div>

              <span className="kpi-label">
                EXPECTED RETURN
              </span>

              <strong>
                {loading
                  ? "--"
                  : formatPercent(
                      predictedReturn
                    )}
              </strong>

              <small>
                Predicted next-day return
              </small>

              <div className="kpi-scan" />

            </TiltCard>

            <TiltCard
              className={`kpi-card ${
                directionDown
                  ? "red"
                  : "purple"
              }`}
            >

              <div className="kpi-icon">

                {directionDown ? (
                  <TrendingDown size={20} />
                ) : (
                  <TrendingUp size={20} />
                )}

              </div>

              <span className="kpi-label">
                MODEL OUTLOOK
              </span>

              <strong>
                {loading
                  ? "--"
                  : direction || "WAITING"}
              </strong>

              <small>
                Random Forest direction
              </small>

              <div className="kpi-scan" />

            </TiltCard>

          </section>

          {/* =================================================
              MARKET + PREDICTION
          ================================================= */}

          <section
            className="main-grid section-anchor"
            data-section="market"
          >

            {/* =================================================
                HISTORICAL CHART
            ================================================= */}

            <TiltCard className="panel chart-panel">

              <div className="panel-header">

                <div>

                  <span className="section-kicker">
                    MARKET MONITOR
                  </span>

                  <h3>
                    USD/INR Price Movement
                  </h3>

                  <p>
                    Historical RBI reference-rate
                    observations.
                  </p>

                </div>

                <div className="panel-icon">
                  <LineChart size={19} />
                </div>

              </div>

              <div className="chart-summary">

                <div>

                  <span>
                    Latest observed
                  </span>

                  <strong>
                    {formatCurrency(current)}
                  </strong>

                </div>

                <div>

                  <span>
                    Model target
                  </span>

                  <strong className="green-text">
                    {formatCurrency(forecast)}
                  </strong>

                </div>

                <div>

                  <span>
                    Expected change
                  </span>

                  <strong
                    className={
                      Number(expectedChange) >= 0
                        ? "green-text"
                        : "red-text"
                    }
                  >
                    {expectedChange == null ||
                    !Number.isFinite(
                      Number(expectedChange)
                    )
                      ? "--"
                      : `${
                          Number(
                            expectedChange
                          ) >= 0
                            ? "+"
                            : ""
                        }₹${Number(
                          expectedChange
                        ).toFixed(4)}`}
                  </strong>

                </div>

              </div>

              <div
                className="chart-container"
                style={{
                  width: "100%",
                  height: "360px",
                  minHeight: "360px",
                  position: "relative",
                }}
              >

                {historyLoading ? (

                  <div className="chart-placeholder">

                    <RefreshCw
                      size={30}
                      className="spin"
                    />

                    <strong>
                      Loading historical data...
                    </strong>

                    <span>
                      Connecting to FastAPI
                      history endpoint.
                    </span>

                  </div>

                ) : chartData.length > 0 ? (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <RechartsLineChart
                      data={chartData}
                      margin={{
                        top: 15,
                        right: 20,
                        left: 5,
                        bottom: 5,
                      }}
                    >

                      <CartesianGrid
                        stroke="rgba(74,126,185,.12)"
                        strokeDasharray="3 5"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="dateLabel"
                        stroke="#566b88"
                        tick={{
                          fill: "#7890ad",
                          fontSize: 10,
                        }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={25}
                      />

                      <YAxis
                        domain={["auto", "auto"]}
                        stroke="#566b88"
                        tick={{
                          fill: "#7890ad",
                          fontSize: 10,
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={55}
                        tickFormatter={(value) =>
                          `₹${Number(
                            value
                          ).toFixed(1)}`
                        }
                      />

                      <Tooltip
                        cursor={{
                          stroke:
                            "rgba(89,168,255,.35)",
                          strokeWidth: 1,
                          strokeDasharray:
                            "4 4",
                        }}
                        contentStyle={{
                          background:
                            "#071325",
                          border:
                            "1px solid rgba(76,153,255,.35)",
                          borderRadius: 12,
                          color: "#edf5ff",
                          boxShadow:
                            "0 20px 60px rgba(0,0,0,.4)",
                        }}
                        labelStyle={{
                          color: "#86a0c0",
                          marginBottom: 5,
                        }}
                        formatter={(value) => [
                          `₹${Number(
                            value
                          ).toFixed(4)}`,
                          "USD/INR",
                        ]}
                      />

                      <Line
                        type="monotone"
                        dataKey="usd_inr"
                        name="USD/INR"
                        stroke="#59a8ff"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{
                          r: 6,
                          fill: "#19f7a1",
                          stroke:
                            "#071325",
                          strokeWidth: 3,
                        }}
                        isAnimationActive={false}
                      />

                    </RechartsLineChart>

                  </ResponsiveContainer>

                ) : (

                  <div className="chart-placeholder">

                    <Activity size={34} />

                    <strong>
                      No historical data received
                    </strong>

                    <span>
                      Check the FastAPI
                      <b> /api/history </b>
                      response.
                    </span>

                    <small>
                      Current API:
                      {API_BASE_URL}/api/history
                    </small>

                  </div>

                )}

              </div>

              {/* DATA STATUS */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  marginTop: "10px",
                  padding:
                    "8px 12px",
                  borderRadius: "10px",
                  background:
                    "rgba(255,255,255,.025)",
                  border:
                    "1px solid rgba(255,255,255,.05)",
                  fontSize: "11px",
                  color: "#7188a4",
                }}
              >

                <span>
                  Historical observations
                </span>

                <strong
                  style={{
                    color:
                      chartData.length > 0
                        ? "#19f7a1"
                        : "#ff6b81",
                  }}
                >
                  {chartData.length} records
                </strong>

              </div>

            </TiltCard>

            {/* =================================================
                PREDICTION PANEL
            ================================================= */}

            <TiltCard
              className="panel prediction-panel section-anchor"
              data-section="prediction"
            >

              <div className="panel-header">

                <div>

                  <span className="section-kicker">
                    MODEL OUTPUT
                  </span>

                  <h3>
                    Next-day outlook
                  </h3>

                  <p>
                    Generated from the latest
                    feature vector.
                  </p>

                </div>

                <div className="panel-icon purple-icon">
                  <Brain size={19} />
                </div>

              </div>

              <div className="forecast-value">

                <span>
                  Predicted USD/INR
                </span>

                <strong>
                  {loading
                    ? "--"
                    : formatCurrency(forecast)}
                </strong>

              </div>

              <div className="forecast-bridge">

                <div>

                  <span>
                    Current
                  </span>

                  <strong>
                    {formatCurrency(current)}
                  </strong>

                </div>

                <ArrowUpRight size={21} />

                <div>

                  <span>
                    Forecast
                  </span>

                  <strong className="green-text">
                    {formatCurrency(forecast)}
                  </strong>

                </div>

              </div>

              <div
                className={`outlook-box ${
                  directionUp
                    ? "up"
                    : directionDown
                    ? "down"
                    : ""
                }`}
              >

                {directionUp ? (
                  <TrendingUp size={24} />
                ) : directionDown ? (
                  <TrendingDown size={24} />
                ) : (
                  <Activity size={24} />
                )}

                <div>

                  <strong>
                    {direction || "WAITING"}
                  </strong>

                  <span>
                    Model expects the USD/INR
                    rate to move{" "}
                    {directionUp
                      ? "higher"
                      : directionDown
                      ? "lower"
                      : "sideways"}.
                  </span>

                </div>

              </div>

              <div className="forecast-mini-grid">

                <div>

                  <span>
                    Expected movement
                  </span>

                  <strong>
                    {expectedChange == null ||
                    !Number.isFinite(
                      Number(expectedChange)
                    )
                      ? "--"
                      : `${
                          Number(
                            expectedChange
                          ) >= 0
                            ? "+"
                            : ""
                        }₹${Number(
                          expectedChange
                        ).toFixed(4)}`}
                  </strong>

                </div>

                <div>

                  <span>
                    Return
                  </span>

                  <strong>
                    {formatPercent(
                      predictedReturn
                    )}
                  </strong>

                </div>

              </div>

              <div className="model-engine-line">

                <Zap size={13} />

                Random Forest inference active

              </div>

            </TiltCard>

          </section>

          {/* =================================================
              ANALYTICS
          ================================================= */}

          <section
            className="analytics-grid section-anchor"
            data-section="analytics"
          >

            <TiltCard className="panel analytics-panel">

              <div className="panel-header">

                <div>

                  <span className="section-kicker">
                    MODEL ANALYTICS
                  </span>

                  <h3>
                    Prediction system
                  </h3>

                  <p>
                    Current production
                    configuration.
                  </p>

                </div>

                <Gauge size={21} />

              </div>

              <div className="analytics-orb-row">

                <div className="metric-orb cyan-orb">

                  <div>

                    <strong>
                      20
                    </strong>

                    <span>
                      FEATURES
                    </span>

                  </div>

                </div>

                <div className="metric-orb purple-orb">

                  <div>

                    <strong>
                      RF
                    </strong>

                    <span>
                      MODEL
                    </span>

                  </div>

                </div>

                <div className="metric-orb green-orb">

                  <div>

                    <strong>
                      LIVE
                    </strong>

                    <span>
                      PIPELINE
                    </span>

                  </div>

                </div>

              </div>

              <div className="analytics-list">

                <div>

                  <span>
                    Prediction target
                  </span>

                  <strong>
                    Next-day USD/INR
                  </strong>

                </div>

                <div>

                  <span>
                    Currency source
                  </span>

                  <strong>
                    RBI reference rates
                  </strong>

                </div>

                <div>

                  <span>
                    Market signal
                  </span>

                  <strong>
                    WTI crude oil
                  </strong>

                </div>

                <div>

                  <span>
                    Inference status
                  </span>

                  <strong className="green-text">
                    Operational
                  </strong>

                </div>

              </div>

            </TiltCard>

            {/* SIGNALS */}

            <TiltCard className="panel signals-panel">

              <div className="panel-header">

                <div>

                  <span className="section-kicker">
                    MARKET INTELLIGENCE
                  </span>

                  <h3>
                    Top model signals
                  </h3>

                  <p>
                    Inputs currently visible
                    to the prediction layer.
                  </p>

                </div>

                <Waves size={21} />

              </div>

              <div className="signal-list">

                <div className="signal-row">

                  <span className="signal-icon blue">
                    <TrendingUp size={16} />
                  </span>

                  <div>

                    <strong>
                      USD/INR momentum
                    </strong>

                    <small>
                      Lagged exchange-rate
                      behaviour
                    </small>

                  </div>

                  <b>
                    LIVE
                  </b>

                </div>

                <div className="signal-row">

                  <span className="signal-icon amber">
                    <Droplets size={16} />
                  </span>

                  <div>

                    <strong>
                      Oil price momentum
                    </strong>

                    <small>
                      WTI market signal
                    </small>

                  </div>

                  <b>
                    LIVE
                  </b>

                </div>

                <div className="signal-row">

                  <span className="signal-icon purple">
                    <Activity size={16} />
                  </span>

                  <div>

                    <strong>
                      USD volatility
                    </strong>

                    <small>
                      Short-term market risk
                    </small>

                  </div>

                  <b>
                    20D
                  </b>

                </div>

                <div className="signal-row">

                  <span className="signal-icon cyan">
                    <ShieldCheck size={16} />
                  </span>

                  <div>

                    <strong>
                      Pipeline status
                    </strong>

                    <small>
                      RBI + WTI +
                      feature engineering
                    </small>

                  </div>

                  <b className="green-text">
                    ONLINE
                  </b>

                </div>

              </div>

            </TiltCard>

          </section>

          {/* =================================================
              PIPELINE
          ================================================= */}

          <section
            className="pipeline-panel panel section-anchor"
            data-section="pipeline"
          >

            <div className="panel-header">

              <div>

                <span className="section-kicker">
                  END-TO-END INTELLIGENCE FLOW
                </span>

                <h3>
                  InsightIQ AI Data Pipeline
                </h3>

                <p>
                  From raw market observations
                  to the next-day forecast.
                </p>

              </div>

              <Cpu size={21} />

            </div>

            <div className="pipeline-flow">

              <div className="pipeline-node blue-node">

                <div className="node-cube">
                  <Database size={27} />
                </div>

                <b>01</b>

                <strong>
                  RBI Data
                </strong>

                <small>
                  Exchange rates
                </small>

              </div>

              <div className="flow-arrow">
                →
              </div>

              <div className="pipeline-node amber-node">

                <div className="node-cube">
                  <Droplets size={27} />
                </div>

                <b>02</b>

                <strong>
                  Oil Signals
                </strong>

                <small>
                  WTI crude prices
                </small>

              </div>

              <div className="flow-arrow">
                →
              </div>

              <div className="pipeline-node cyan-node">

                <div className="node-cube">
                  <Layers3 size={27} />
                </div>

                <b>03</b>

                <strong>
                  Feature Engineering
                </strong>

                <small>
                  20 engineered features
                </small>

              </div>

              <div className="flow-arrow">
                →
              </div>

              <div className="pipeline-node purple-node">

                <div className="node-cube">
                  <Brain size={27} />
                </div>

                <b>04</b>

                <strong>
                  Random Forest
                </strong>

                <small>
                  Model inference
                </small>

              </div>

              <div className="flow-arrow">
                →
              </div>

              <div className="pipeline-node green-node">

                <div className="node-cube">
                  <TrendingUp size={27} />
                </div>

                <b>05</b>

                <strong>
                  AI Forecast
                </strong>

                <small>
                  Next-day USD/INR
                </small>

              </div>

            </div>

          </section>

          {/* =================================================
              MODEL INSIGHTS
          ================================================= */}

          <section
            className="insights-grid section-anchor"
            data-section="insights"
          >

            <TiltCard className="panel insight-panel">

              <div className="panel-header">

                <div>

                  <span className="section-kicker">
                    MODEL INSIGHTS
                  </span>

                  <h3>
                    How the forecast is produced
                  </h3>

                  <p>
                    A compact explanation of
                    the deployed inference path.
                  </p>

                </div>

                <Sparkles size={21} />

              </div>

              <div className="insight-list">

                <div className="insight-item">

                  <span>
                    01
                  </span>

                  <div>

                    <strong>
                      RBI exchange-rate data
                    </strong>

                    <p>
                      Historical USD/INR observations
                      are transformed into lag,
                      moving-average and volatility
                      features.
                    </p>

                  </div>

                </div>

                <div className="insight-item">

                  <span>
                    02
                  </span>

                  <div>

                    <strong>
                      Crude-oil intelligence
                    </strong>

                    <p>
                      WTI price, return,
                      moving-average and volatility
                      signals provide additional
                      market context.
                    </p>

                  </div>

                </div>

                <div className="insight-item">

                  <span>
                    03
                  </span>

                  <div>

                    <strong>
                      20 engineered inputs
                    </strong>

                    <p>
                      The latest market state is
                      converted into the same feature
                      structure used during inference.
                    </p>

                  </div>

                </div>

                <div className="insight-item">

                  <span>
                    04
                  </span>

                  <div>

                    <strong>
                      Random Forest prediction
                    </strong>

                    <p>
                      The trained regression model
                      estimates the next-day return
                      and converts it into the
                      forecast USD/INR rate.
                    </p>

                  </div>

                </div>

              </div>

            </TiltCard>

            {/* SYSTEM VISUAL */}

            <TiltCard className="panel system-panel">

              <div className="system-visual">

                <div className="system-ring ring-a" />
                <div className="system-ring ring-b" />
                <div className="system-ring ring-c" />

                <div className="system-core">

                  <Brain size={34} />

                  <span>
                    AI
                  </span>

                </div>

                <div className="system-dot dot-a" />
                <div className="system-dot dot-b" />
                <div className="system-dot dot-c" />

              </div>

              <div className="system-copy">

                <span className="section-kicker">
                  SYSTEM STATUS
                </span>

                <h3>
                  Inference engine online
                </h3>

                <p>
                  The dashboard is connected
                  to the FastAPI service and can
                  request the latest prediction
                  and historical series.
                </p>

                <div className="status-pill">

                  <span />

                  Production-ready interface

                </div>

              </div>

            </TiltCard>

          </section>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="footer">

            <span>
              InsightIQ AI
            </span>

            <span>
              AI-powered currency intelligence
            </span>

            <span className="footer-online">

              <i />

              Backend connected

            </span>

          </footer>

        </main>

      </div>

    </div>
  );
}

export default App;
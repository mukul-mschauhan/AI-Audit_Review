import { useState, useRef } from "react";

const NAVY = "#0B2545";

function formatUSD(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatNum(val: number) {
  return new Intl.NumberFormat("en-US").format(val);
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-semibold text-slate-900 font-mono">{format(value)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${NAVY} ${pct}%, #e2e8f0 ${pct}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        accent
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`text-2xl font-bold font-mono ${
          accent ? "text-blue-800" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

const COMPARISON_ROWS = [
  {
    metric: "Avg time per document",
    manual: "45 min",
    agentic: "18 sec",
    delta: "−99.3%",
    positive: true,
  },
  {
    metric: "Coverage",
    manual: "8%",
    agentic: "100%",
    delta: "+12.5×",
    positive: true,
  },
  {
    metric: "Reviewer variance",
    manual: "±18%",
    agentic: "0%",
    delta: "Eliminated",
    positive: true,
  },
  {
    metric: "Cost per document",
    manual: "$187.50",
    agentic: "$0.04",
    delta: "−99.98%",
    positive: true,
  },
  {
    metric: "Traceability",
    manual: "Partial",
    agentic: "Full",
    delta: "New capability",
    positive: true,
  },
];

const RISK_ROWS = [
  {
    risk: "Hallucination",
    likelihood: "Medium",
    mitigation:
      "Critic agent (Agent 4) independently reviews every finding. Confidence score < 0.7 routes to human-in-the-loop queue.",
    residual: "Low",
    verifyAt: "Trace Explorer → Span tree → Critic notes",
  },
  {
    risk: "Model drift",
    likelihood: "Low",
    mitigation:
      "All LLM calls logged with model version, prompt hash, and output. Regression alerts fire if output distribution shifts.",
    residual: "Very Low",
    verifyAt: "Cost & Performance → Model mix chart",
  },
  {
    risk: "Data leakage",
    likelihood: "Low",
    mitigation:
      "Documents processed in isolated compute. No training on client data. Full audit log of every access with user attribution.",
    residual: "Very Low",
    verifyAt: "Governance → Immutable Audit Log",
  },
  {
    risk: "Over-flagging",
    likelihood: "Medium",
    mitigation:
      "Deterministic rule engine (R1–R5) gates LLM classification. False positive rate tracked per control rule.",
    residual: "Low",
    verifyAt: "Governance → Human-in-the-Loop Queue",
  },
  {
    risk: "Vendor lock-in",
    likelihood: "Low",
    mitigation:
      "Model abstracted behind callOpenAI wrapper. Swap provider by changing DEFAULT_MODEL env var. Replay feature validates alternatives.",
    residual: "Very Low",
    verifyAt: "Trace Explorer → Re-run with gpt-4o-mini",
  },
];

const LIKELIHOOD_BADGE: Record<string, string> = {
  "Very Low": "bg-green-100 text-green-700",
  Low: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
};

export default function BusinessCase() {
  const [docsPerMonth, setDocsPerMonth] = useState(5000);
  const [minsPerDoc, setMinsPerDoc] = useState(45);
  const [hourlyRate, setHourlyRate] = useState(250);
  const printRef = useRef<HTMLDivElement>(null);

  const PLATFORM_INVESTMENT = 50_000;
  const AI_COST_PER_DOC = 0.04;

  const manualCostPerDoc = (minsPerDoc / 60) * hourlyRate;
  const manualMonthly = manualCostPerDoc * docsPerMonth;
  const aiMonthly = AI_COST_PER_DOC * docsPerMonth;
  const savingsMonthly = manualMonthly - aiMonthly;
  const savingsAnnual = savingsMonthly * 12;
  const paybackMonths =
    savingsMonthly > 0 ? PLATFORM_INVESTMENT / savingsMonthly : Infinity;
  const reductionPct = manualMonthly > 0
    ? ((savingsMonthly / manualMonthly) * 100).toFixed(1)
    : "0";

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #business-case-print, #business-case-print * { visibility: visible; }
          #business-case-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: A4 landscape; }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${NAVY};
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${NAVY};
          cursor: pointer;
          border: none;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 font-[system-ui,sans-serif]">
        <div
          className="px-6 py-4 flex items-center justify-between no-print"
          style={{ backgroundColor: NAVY }}
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-base">
              Audit Evidence Review Assistant
            </span>
            <span className="text-slate-400 text-sm">·</span>
            <span className="text-slate-300 text-sm">Business Case</span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            <span>↓</span>
            Export as PDF
          </button>
        </div>

        <div id="business-case-print" ref={printRef} className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Confidential · Prepared for Executive Leadership
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                AI-Powered Audit Evidence Review
              </h1>
              <p className="text-slate-500 mt-1">
                Business Case &amp; ROI Analysis · May 2026
              </p>
            </div>
            <div className="text-right text-sm text-slate-400">
              <div className="font-semibold text-slate-700">Platform Investment</div>
              <div className="text-xl font-bold text-slate-900 font-mono">$50,000</div>
              <div className="text-xs">one-time</div>
            </div>
          </div>

          {/* ── Section 1: ROI Calculator ── */}
          <section className="mb-10">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: NAVY }}
              >
                1
              </span>
              Interactive ROI Calculator
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-sm font-semibold text-slate-700 mb-4">
                  Adjust your parameters
                </div>
                <Slider
                  label="Documents per month"
                  value={docsPerMonth}
                  min={500}
                  max={50000}
                  step={500}
                  format={(v) => formatNum(v)}
                  onChange={setDocsPerMonth}
                />
                <Slider
                  label="Average minutes per manual review"
                  value={minsPerDoc}
                  min={15}
                  max={120}
                  step={5}
                  format={(v) => `${v} min`}
                  onChange={setMinsPerDoc}
                />
                <Slider
                  label="Auditor blended hourly rate"
                  value={hourlyRate}
                  min={100}
                  max={600}
                  step={10}
                  format={(v) => `$${v}`}
                  onChange={setHourlyRate}
                />
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Manual cost per document</span>
                    <span className="font-mono">{formatUSD(manualCostPerDoc)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI cost per document</span>
                    <span className="font-mono text-emerald-600">$0.04</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost reduction per document</span>
                    <span className="font-mono text-emerald-600">{reductionPct}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard
                    label="Monthly savings"
                    value={formatUSD(savingsMonthly)}
                    sub={`vs ${formatUSD(manualMonthly)} manual`}
                    accent
                  />
                  <KpiCard
                    label="Annual savings"
                    value={formatUSD(savingsAnnual)}
                    sub="recurring"
                    accent
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <KpiCard
                    label="Payback period"
                    value={
                      paybackMonths === Infinity
                        ? "∞"
                        : paybackMonths < 1
                        ? "< 1 month"
                        : `${paybackMonths.toFixed(1)} mo`
                    }
                    sub={`on $50K investment`}
                  />
                  <KpiCard
                    label="AI monthly spend"
                    value={formatUSD(aiMonthly)}
                    sub={`${formatNum(docsPerMonth)} docs × $0.04`}
                  />
                </div>
                <div
                  className="rounded-xl p-4 text-white"
                  style={{ backgroundColor: NAVY }}
                >
                  <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    Bottom line
                  </div>
                  <p className="text-sm leading-relaxed">
                    Automating <strong>{formatNum(docsPerMonth)}</strong> documents per month saves{" "}
                    <strong>{formatUSD(savingsMonthly)}</strong> monthly — a{" "}
                    <strong>{reductionPct}%</strong> cost reduction. The $50K platform investment
                    pays back in{" "}
                    <strong>
                      {paybackMonths === Infinity
                        ? "N/A"
                        : paybackMonths < 1
                        ? "under one month"
                        : `${paybackMonths.toFixed(1)} months`}
                    </strong>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 2: Comparison Table ── */}
          <section className="mb-10">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: NAVY }}
              >
                2
              </span>
              Manual vs. Agentic — Side-by-Side
            </h2>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: NAVY }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-blue-200 uppercase tracking-wider w-1/3">
                      Metric
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-blue-200 uppercase tracking-wider w-1/5">
                      Manual
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-blue-200 uppercase tracking-wider w-1/5">
                      Agentic AI
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-blue-200 uppercase tracking-wider w-1/5">
                      Delta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.metric}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {row.metric}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500 font-mono">
                        {row.manual}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">
                        {row.agentic}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${
                            row.positive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.delta}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 3: Risk-Adjusted View ── */}
          <section className="mb-10">
            <h2 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: NAVY }}
              >
                3
              </span>
              Risk-Adjusted View
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Agentic AI introduces new risks. The observability layer is designed to mitigate each one — with a direct link to where it can be verified in the platform.
            </p>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Risk
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                      Likelihood
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Mitigation
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                      Residual Risk
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Where to Verify
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {RISK_ROWS.map((row, i) => (
                    <tr
                      key={row.risk}
                      className={`border-b border-slate-100 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-5 py-4 font-semibold text-slate-800 align-top">
                        {row.risk}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            LIKELIHOOD_BADGE[row.likelihood] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.likelihood}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-sm leading-relaxed align-top">
                        {row.mitigation}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            LIKELIHOOD_BADGE[row.residual] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.residual}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100">
                          {row.verifyAt}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 4: Export note ── */}
          <section className="no-print">
            <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 text-sm">Export Business Case as PDF</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Generates a 1-page landscape PDF optimised for inclusion in client decks. Includes live ROI figures from your current slider settings.
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0 ml-6"
                style={{ backgroundColor: NAVY }}
              >
                <span>↓</span>
                Export PDF
              </button>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 no-print">
            <span>Audit Evidence Review Assistant · Business Case · Confidential</span>
            <span>Prepared {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </>
  );
}

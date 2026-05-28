import { useState } from "react";

const NAVY = "#0B2545";

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

const COMPARISON = [
  { metric: "Avg time per document", manual: "45 min", agentic: "18 sec", delta: "−99.3%", positive: true },
  { metric: "Coverage", manual: "8%", agentic: "100%", delta: "+12.5×", positive: true },
  { metric: "Reviewer variance", manual: "±18%", agentic: "0%", delta: "Eliminated", positive: true },
  { metric: "Cost per document", manual: "$187.50", agentic: "$0.04", delta: "−99.98%", positive: true },
  { metric: "Traceability", manual: "Partial", agentic: "Full", delta: "New capability", positive: true },
];

const RISKS = [
  { risk: "Hallucination", likelihood: "Medium", mitigation: "Critic agent (Agent 4) independently reviews every finding. Confidence < 0.7 triggers human-in-the-loop review queue.", residual: "Low", verifyAt: "Trace Explorer → Critic notes" },
  { risk: "Model drift", likelihood: "Low", mitigation: "All LLM calls logged with model version, prompt hash, and output. Regression alerts on output distribution shifts.", residual: "Very Low", verifyAt: "Cost & Performance → Model mix" },
  { risk: "Data leakage", likelihood: "Low", mitigation: "Documents processed in isolated compute. No training on client data. Every access timestamped and user-attributed.", residual: "Very Low", verifyAt: "Governance → Audit Log" },
  { risk: "Over-flagging", likelihood: "Medium", mitigation: "Deterministic rule engine (R1–R5) gates LLM classification. False positive rate tracked per control rule.", residual: "Low", verifyAt: "Governance → Queue" },
  { risk: "Vendor lock-in", likelihood: "Low", mitigation: "Model abstracted behind wrapper. Swap provider by changing one env var. Replay feature validates alternatives live.", residual: "Very Low", verifyAt: "Trace Explorer → Re-run with gpt-4o-mini" },
];

const BADGE: Record<string, string> = {
  "Very Low": "bg-green-100 text-green-700",
  Low: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
};

export default function BusinessCase() {
  const [docs, setDocs] = useState(5000);
  const [mins, setMins] = useState(45);
  const [rate, setRate] = useState(250);

  const INVEST = 50_000;
  const AI_PER_DOC = 0.04;
  const manualPerDoc = (mins / 60) * rate;
  const manualMonthly = manualPerDoc * docs;
  const aiMonthly = AI_PER_DOC * docs;
  const savingsMonthly = manualMonthly - aiMonthly;
  const savingsAnnual = savingsMonthly * 12;
  const payback = savingsMonthly > 0 ? INVEST / savingsMonthly : Infinity;
  const reductionPct = manualMonthly > 0 ? ((savingsMonthly / manualMonthly) * 100).toFixed(1) : "0";

  const paybackStr = payback === Infinity ? "N/A" : payback < 1 ? "< 1 month" : `${payback.toFixed(1)} months`;

  return (
    <>
      <style>{`
        @media print {
          aside, nav, header { display: none !important; }
          #bc-print { padding: 1.5cm !important; }
          .no-print { display: none !important; }
          @page { margin: 1cm; size: A4 landscape; }
        }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${NAVY}; cursor: pointer; }
        input[type=range]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: ${NAVY}; border: none; cursor: pointer; }
      `}</style>

      <div id="bc-print" className="p-6">
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Confidential · Executive Leadership</div>
            <h1 className="text-xl font-bold text-slate-900">AI-Powered Audit Evidence Review</h1>
            <p className="text-sm text-slate-500">Business Case & ROI Analysis · May 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Platform Investment</div>
              <div className="text-xl font-bold text-slate-900 font-mono">$50,000 one-time</div>
            </div>
            <button onClick={() => window.print()} className="no-print flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: NAVY }}>
              ↓ Export PDF
            </button>
          </div>
        </div>

        {/* Section 1: ROI Calculator */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: NAVY }}>1</span>
            Interactive ROI Calculator
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="text-sm font-medium text-slate-700 mb-4">Adjust parameters</div>
              {[
                { label: "Documents per month", value: docs, set: setDocs, min: 500, max: 50000, step: 500, fmt: (v: number) => v.toLocaleString() },
                { label: "Avg minutes per manual review", value: mins, set: setMins, min: 15, max: 120, step: 5, fmt: (v: number) => `${v} min` },
                { label: "Auditor blended hourly rate", value: rate, set: setRate, min: 100, max: 600, step: 10, fmt: (v: number) => `$${v}` },
              ].map(sl => {
                const pct = ((sl.value - sl.min) / (sl.max - sl.min)) * 100;
                return (
                  <div key={sl.label} className="mb-5">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-slate-600">{sl.label}</span>
                      <span className="text-sm font-semibold font-mono">{sl.fmt(sl.value)}</span>
                    </div>
                    <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.value}
                      onChange={e => sl.set(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, ${NAVY} ${pct}%, #e2e8f0 ${pct}%)` }}
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                      <span>{sl.fmt(sl.min)}</span><span>{sl.fmt(sl.max)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-slate-100 space-y-1">
                {[["Manual cost per document", `$${manualPerDoc.toFixed(2)}`], ["AI cost per document", "$0.04"], ["Reduction per document", `${reductionPct}%`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs text-slate-500">
                    <span>{k}</span><span className="font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Monthly savings", value: fmt(savingsMonthly), sub: `vs ${fmt(manualMonthly)} manual`, accent: true },
                  { label: "Annual savings", value: fmt(savingsAnnual), sub: "recurring", accent: true },
                  { label: "Payback period", value: paybackStr, sub: "on $50K investment" },
                  { label: "AI monthly spend", value: fmt(aiMonthly), sub: `${docs.toLocaleString()} × $0.04` },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl p-4 border ${c.accent ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{c.label}</div>
                    <div className={`text-xl font-bold font-mono ${c.accent ? "text-blue-800" : "text-slate-900"}`}>{c.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.sub}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4 text-white" style={{ backgroundColor: NAVY }}>
                <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">Bottom line</div>
                <p className="text-sm leading-relaxed">
                  Automating <strong>{docs.toLocaleString()}</strong> documents/month saves <strong>{fmt(savingsMonthly)}</strong> monthly — a <strong>{reductionPct}%</strong> reduction. The $50K investment pays back in <strong>{paybackStr}</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Comparison Table */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: NAVY }}>2</span>
            Manual vs. Agentic AI
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: NAVY }}>
                  {["Metric", "Manual", "Agentic AI", "Delta"].map((h, i) => (
                    <th key={h} className={`py-3 px-5 text-xs font-semibold text-blue-200 uppercase tracking-wider ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r, i) => (
                  <tr key={r.metric} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{r.metric}</td>
                    <td className="px-5 py-3 text-right text-slate-400 font-mono">{r.manual}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">{r.agentic}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{r.delta}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Risk Table */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: NAVY }}>3</span>
            Risk-Adjusted View
          </h2>
          <p className="text-sm text-slate-500 mb-4">Agentic AI introduces new risks. The observability layer mitigates each one — with a direct link to where it can be verified.</p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Risk", "Likelihood", "Mitigation", "Residual", "Where to Verify"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RISKS.map((r, i) => (
                  <tr key={r.risk} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 align-top">{r.risk}</td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[r.likelihood]}`}>{r.likelihood}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs leading-relaxed align-top max-w-xs">{r.mitigation}</td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[r.residual]}`}>{r.residual}</span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100 whitespace-nowrap">{r.verifyAt}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-200 pt-4 no-print">
          <span>Audit Evidence Review Assistant · Business Case · Confidential</span>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: NAVY }}>↓ Export 1-Page PDF</button>
        </div>
      </div>
    </>
  );
}

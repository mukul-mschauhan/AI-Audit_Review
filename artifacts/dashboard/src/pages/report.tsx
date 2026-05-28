import { useRef } from "react";
import { useDocuments } from "@/lib/store";

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

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: NAVY }}>{num}</span>
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">{title}</h2>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${accent ? "text-blue-800" : "text-slate-900"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Report() {
  const { documents } = useDocuments();
  const ref = useRef<HTMLDivElement>(null);

  const completed = documents.filter(d => d.status === "completed");
  const findings = completed.flatMap(d => d.findings);
  const totalCost = completed.reduce((a, d) => a + d.totalCost, 0);
  const totalTokens = completed.reduce((a, d) => a + d.totalTokens, 0);
  const criticalCount = findings.filter(f => f.risk === "Critical").length;
  const auditorHours = (completed.length * 45) / 60;
  const auditorCost = auditorHours * 250;
  const netSavings = auditorCost - totalCost;
  const savingsAnnualised = (netSavings / Math.max(completed.length, 1)) * 5000 * 12;

  return (
    <>
      <style>{`
        @media print {
          aside, nav, .no-print { display: none !important; }
          body { background: white !important; }
          #report-root { padding: 0 !important; }
          #report-content { padding: 1.8cm 2cm !important; max-width: 100% !important; }
          @page { margin: 0; size: A4 portrait; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div id="report-root" className="p-6 bg-slate-50 min-h-screen">
        <div className="no-print flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Executive Report</h1>
            <p className="text-sm text-slate-500">Print-ready · A4 portrait · Live data from {completed.length} documents</p>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow hover:opacity-90 transition" style={{ backgroundColor: NAVY }}>
            ↓ &nbsp;Export as PDF
          </button>
        </div>

        <div id="report-content" ref={ref} className="bg-white rounded-2xl shadow-md max-w-4xl mx-auto p-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-10 pb-6 border-b-2" style={{ borderColor: NAVY }}>
            <div>
              <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-2">Confidential · Executive Leadership</div>
              <h1 className="text-3xl font-bold leading-tight" style={{ color: NAVY }}>AI-Powered Audit Evidence Review</h1>
              <p className="text-lg text-slate-500 mt-1">Enterprise Observability Platform</p>
            </div>
            <div className="text-right shrink-0 ml-8">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Prepared</div>
              <div className="text-sm font-semibold text-slate-700">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div className="text-xs text-slate-400 mt-2 uppercase tracking-wider">Documents</div>
              <div className="text-sm font-semibold text-slate-700">{completed.length} analyzed</div>
            </div>
          </div>

          <Section num="1" title="Problem Statement">
            <div className="grid grid-cols-2 gap-5 mb-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">The Status Quo</div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  {["Manual evidence review covers only 8% of documents — 92% go unreviewed.", "Each document takes 45 min at $250/hr: $187.50 per document.", "Reviewer variance of ±18% — identical documents get different risk ratings.", "No end-to-end traceability — findings cannot be traced to source evidence.", "Duplicate invoices and expired-contract payments slip through sampling."].map((item, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />{item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">The Risk</div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  {["Regulatory exposure from undetected control violations.", "Financial leakage from duplicate payments — avg $124K per incident.", "No defensible audit trail for regulators or audit committees.", "Scalability ceiling: more documents require proportional headcount.", "Inconsistent findings weaken the firm's legal position."].map((item, i) => (
                    <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Stat label="Manual coverage" value="8%" sub="of documents reviewed" />
              <Stat label="Cost per document" value="$187.50" sub="at $250/hr · 45 min" />
              <Stat label="Reviewer variance" value="±18%" sub="same doc, different result" />
              <Stat label="Traceability" value="Partial" sub="no end-to-end chain" />
            </div>
          </Section>

          <Section num="2" title="Approach Taken">
            <p className="text-sm text-slate-600 leading-relaxed mb-5">A <strong>4-agent sequential pipeline</strong> where each agent is a discrete, observable LLM call with its own system prompt, model, and trace span. Precision-critical decisions use deterministic rules; LLMs handle extraction, classification, and reflection.</p>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { num: "1", name: "Extractor", model: "gpt-4o", color: "#2563EB", desc: "Parses raw document and extracts structured entities as validated JSON." },
                { num: "2", name: "Validator", model: "gpt-4o", color: "#7C3AED", desc: "Checks 5 deterministic control rules (R1–R5). Rules are hard-coded for precision." },
                { num: "3", name: "Classifier", model: "gpt-4o", color: "#0891B2", desc: "Classifies violations as Low/Medium/High/Critical and drafts audit observations." },
                { num: "4", name: "Critic", model: "gpt-4o", color: "#059669", desc: "Independently reviews all findings. Reflection pattern — the AI checks itself." },
              ].map(a => (
                <div key={a.name} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: a.color }}>{a.num}</span>
                    <span className="text-sm font-bold text-slate-900">{a.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mb-2">{a.model}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="page-break" />

          <Section num="3" title="Solution Built">
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { page: "Executive Overview", desc: "6 live KPI cards, risk distribution, cost trend, ROI snapshot in USD & INR." },
                { page: "Upload & Analyze", desc: "Drag-drop upload with live streaming trace panel. Results sync to all tabs instantly." },
                { page: "Trace Explorer", desc: "Waterfall, cost pie, span tree with token breakdown, context viewer, gpt-4o-mini replay." },
                { page: "Cost & Performance", desc: "Spend trend, token by agent, latency p50/p95/p99, model mix, per-finding cost." },
                { page: "Governance", desc: "Human-in-the-loop queue with Approve/Reject, failure anatomy, immutable audit log." },
                { page: "Observability & Eval", desc: "Groundedness, faithfulness, Critic override rate, confidence distribution, hallucination log." },
              ].map(p => (
                <div key={p.page} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-200">
                  <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: NAVY }} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{p.page}</div>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section num="4" title="Business Impact">
            <div className="grid grid-cols-4 gap-3 mb-5">
              <Stat label="Documents analyzed" value={String(completed.length)} sub="this session" accent />
              <Stat label="Findings detected" value={String(findings.length)} sub={`${criticalCount} Critical`} accent />
              <Stat label="Auditor cost (manual)" value={`$${auditorCost.toFixed(0)}`} sub={`${auditorHours.toFixed(1)} hrs @ $250/hr`} />
              <Stat label="Actual AI spend" value={`$${totalCost.toFixed(3)}`} sub={`${totalTokens.toLocaleString()} tokens`} />
            </div>
            <div className="rounded-xl p-5 text-white mb-5" style={{ backgroundColor: NAVY }}>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-blue-200 uppercase tracking-wider mb-1">Net savings (session)</div>
                  <div className="text-3xl font-bold font-mono text-emerald-300">${netSavings.toFixed(2)}</div>
                  <div className="text-xs text-blue-300 mt-1">{auditorCost > 0 ? `${((netSavings / auditorCost) * 100).toFixed(1)}% cost reduction` : ""}</div>
                </div>
                <div>
                  <div className="text-xs text-blue-200 uppercase tracking-wider mb-1">Annualised @ 5,000 docs/mo</div>
                  <div className="text-3xl font-bold font-mono text-emerald-300">${(savingsAnnualised / 1_000_000).toFixed(1)}M</div>
                </div>
                <div>
                  <div className="text-xs text-blue-200 uppercase tracking-wider mb-1">$50K investment payback</div>
                  <div className="text-3xl font-bold font-mono text-emerald-300">&lt; 1 month</div>
                </div>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: NAVY }}>
                    {["Metric", "Manual", "Agentic AI", "Delta"].map((h, i) => (
                      <th key={h} className={`py-2.5 px-4 text-xs font-semibold text-blue-200 uppercase ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((r, i) => (
                    <tr key={r.metric} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{r.metric}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400 font-mono text-xs">{r.manual}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900 text-xs">{r.agentic}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{r.delta}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <span>AI-Powered Audit Evidence Review · Executive Report · Confidential</span>
            <span>Prepared {new Date().toLocaleDateString("en-GB")} · {completed.length} documents · ${totalCost.toFixed(3)} AI spend</span>
          </div>
        </div>
      </div>
    </>
  );
}

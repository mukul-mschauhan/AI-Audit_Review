import { useDocuments } from "@/lib/store";
import { COST_TREND, RISK_COLORS } from "@/lib/mock-data";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";

const NAVY = "#0B2545";
const INR_RATE = 83;
const AUDITOR_RATE = 250;
const MINS_PER_DOC = 45;

function KpiCard({ label, value, sub, badge }: { label: string; value: string; sub?: string; badge?: { text: string; color: string } }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 font-mono">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      {badge && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: badge.color }}>{badge.text}</span>}
    </div>
  );
}

export default function Overview() {
  const { documents: docs } = useDocuments();
  const completed = docs.filter(d => d.status === "completed");
  const allFindings = completed.flatMap(d => d.findings);
  const critical = allFindings.filter(f => f.risk === "Critical").length;
  const totalTokens = docs.reduce((a, d) => a + d.totalTokens, 0);
  const totalCost = docs.reduce((a, d) => a + d.totalCost, 0);
  const compliance = completed.length > 0
    ? Math.round((completed.filter(d => d.findings.length === 0).length / completed.length) * 100)
    : 0;

  const riskDist = [
    { name: "Critical", value: allFindings.filter(f => f.risk === "Critical").length, color: RISK_COLORS.Critical },
    { name: "High", value: allFindings.filter(f => f.risk === "High").length, color: RISK_COLORS.High },
    { name: "Medium", value: allFindings.filter(f => f.risk === "Medium").length, color: RISK_COLORS.Medium },
    { name: "Low", value: allFindings.filter(f => f.risk === "Low").length, color: RISK_COLORS.Low },
  ].filter(r => r.value > 0);

  const auditorHours = (completed.length * MINS_PER_DOC) / 60;
  const auditorCost = auditorHours * AUDITOR_RATE;
  const netSavings = auditorCost - totalCost;
  const costPerFinding = allFindings.length > 0 ? totalCost / allFindings.length : 0;

  // Live cost trend from actual documents
  const spendTrend = [...completed].reverse().slice(0, 20).map((d, i) => ({
    label: `Doc ${i + 1}`,
    cost: d.totalCost,
  }));
  const trendData = spendTrend.length >= 3 ? spendTrend : COST_TREND;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Executive Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live observability across all document analyses</p>
        </div>
        <div className="flex items-center gap-2">
          {docs.length > 8 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              {docs.length - 8} new since session start
            </span>
          )}
          <div className="text-xs text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono">
            Live · {docs.length} documents
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard label="Documents" value={String(docs.length)} sub={`${completed.length} complete · ${docs.filter(d => d.status === "error").length} errors`} />
        <KpiCard label="Total Findings" value={String(allFindings.length)} sub="across all documents" />
        <KpiCard label="Critical Findings" value={String(critical)} badge={critical > 0 ? { text: "Needs attention", color: RISK_COLORS.Critical } : undefined} sub={critical === 0 ? "None detected" : undefined} />
        <KpiCard label="Compliance" value={`${compliance}%`} sub="Clean documents" />
        <KpiCard label="Total Tokens" value={totalTokens.toLocaleString()} sub="Across all agents" />
        <KpiCard label="Total Spend" value={`$${totalCost.toFixed(3)}`} sub={`₹${(totalCost * INR_RATE).toFixed(2)} INR`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Risk Distribution</div>
          {allFindings.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No findings yet</div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskDist} cx="50%" cy="50%" innerRadius={36} outerRadius={64} paddingAngle={2} dataKey="value">
                      {riskDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "Findings"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {riskDist.map(r => (
                  <div key={r.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
                      <span className="text-sm text-slate-700">{r.name}</span>
                    </div>
                    <span className="text-sm font-semibold font-mono">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Cost-per-Document Trend</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v.toFixed(2)}`} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, "Cost"]} />
                <Line type="monotone" dataKey="cost" stroke={NAVY} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROI Snapshot */}
      <div className="rounded-xl p-6 text-white" style={{ backgroundColor: NAVY }}>
        <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-4">ROI Snapshot · Live</div>
        <div className="grid grid-cols-4 gap-6 mb-4">
          <div>
            <div className="text-xs text-blue-300 mb-1">Documents analyzed</div>
            <div className="text-2xl font-bold font-mono">{completed.length}</div>
          </div>
          <div>
            <div className="text-xs text-blue-300 mb-1">Auditor hours saved</div>
            <div className="text-2xl font-bold font-mono">{auditorHours.toFixed(1)} hrs</div>
            <div className="text-xs text-blue-300 mt-0.5">@ {MINS_PER_DOC} min/doc baseline</div>
          </div>
          <div>
            <div className="text-xs text-blue-300 mb-1">Cost at $250/hr</div>
            <div className="text-2xl font-bold font-mono">${auditorCost.toFixed(0)}</div>
            <div className="text-xs text-blue-300 mt-0.5">₹{(auditorCost * INR_RATE).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-blue-300 mb-1">Actual AI spend</div>
            <div className="text-2xl font-bold font-mono">${totalCost.toFixed(3)}</div>
            <div className="text-xs text-blue-300 mt-0.5">₹{(totalCost * INR_RATE).toFixed(2)}</div>
          </div>
        </div>
        <div className="border-t border-white/15 pt-4 grid grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-blue-300 mb-1">Net savings</div>
            <div className="text-xl font-bold font-mono text-emerald-300">${netSavings.toFixed(2)}</div>
            <div className="text-xs text-emerald-300">
              {auditorCost > 0 ? `${((netSavings / auditorCost) * 100).toFixed(1)}% reduction` : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-300 mb-1">Cost per finding</div>
            <div className="text-xl font-bold font-mono">{allFindings.length > 0 ? `$${costPerFinding.toFixed(4)}` : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-blue-300 mb-1">Coverage</div>
            <div className="text-xl font-bold font-mono text-emerald-300">100%</div>
            <div className="text-xs text-blue-300">vs 8% manual sample</div>
          </div>
        </div>
      </div>
    </div>
  );
}

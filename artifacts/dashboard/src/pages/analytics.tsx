import { useState } from "react";
import { useDocuments } from "@/lib/store";
import { AGENT_COLORS, NAVY } from "@/lib/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";

const INR_RATE = 83;

export default function Analytics() {
  const { documents } = useDocuments();
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const completed = documents.filter(d => d.status === "completed");
  const allSpans = completed.flatMap(d => d.spans);

  const tokenByAgent = ["Extractor", "Validator", "Classifier", "Critic"].map(agent => {
    const total = allSpans.filter(s => s.agentName === agent).reduce((a, s) => a + s.totalTokens, 0);
    return { agent, tokens: total, color: AGENT_COLORS[agent] };
  });

  const latencyByAgent = ["Extractor", "Validator", "Classifier", "Critic"].map(agent => {
    const spans = allSpans.filter(s => s.agentName === agent);
    if (!spans.length) return { agent, p50: 0, p95: 0, p99: 0 };
    const sorted = [...spans].sort((a, b) => a.latencyMs - b.latencyMs);
    const p50 = sorted[Math.floor(sorted.length * 0.5)]?.latencyMs ?? 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]?.latencyMs ?? 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)]?.latencyMs ?? sorted[sorted.length - 1]?.latencyMs ?? 0;
    return { agent, p50, p95, p99 };
  });

  const spendTrend = completed.slice(-20).map((d, i) => ({
    name: `${i + 1}`,
    usd: parseFloat(d.totalCost.toFixed(4)),
    inr: parseFloat((d.totalCost * INR_RATE).toFixed(2)),
    label: d.name.split("_")[0],
  }));

  const modelMix = [
    { name: "gpt-4o", value: allSpans.filter(s => s.model === "gpt-4o").length, color: NAVY },
    { name: "gpt-4o-mini", value: allSpans.filter(s => s.model === "gpt-4o-mini").length, color: "#0891B2" },
  ];

  const topDocs = [...completed]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10)
    .map((d, i) => ({ rank: i + 1, name: d.name, cost: d.totalCost, tokens: d.totalTokens, findings: d.findings.length, riskLevel: d.riskLevel }));

  const costByRisk = (["Critical", "High", "Medium", "Low"] as const).map(r => {
    const docsAtRisk = completed.filter(d => d.riskLevel === r);
    const totalFindings = docsAtRisk.flatMap(d => d.findings).length;
    const totalCost = docsAtRisk.reduce((a, d) => a + d.totalCost, 0);
    return { risk: r, costPerFinding: totalFindings > 0 ? totalCost / totalFindings : 0 };
  });

  const fmt = (v: number) => currency === "USD" ? `$${v.toFixed(4)}` : `₹${(v * INR_RATE).toFixed(2)}`;
  const totalCost = completed.reduce((a, d) => a + d.totalCost, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cost & Performance Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {completed.length} documents · {allSpans.length} spans · live data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {documents.length > 8 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
              {documents.length - 8} new documents included
            </span>
          )}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(["USD", "INR"] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currency === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Total Spend per Document</div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendTrend} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => currency === "USD" ? `$${v}` : `₹${(v * INR_RATE).toFixed(0)}`} />
                <Tooltip
                  formatter={(v: number) => [fmt(v), "Cost"]}
                  labelFormatter={(label) => {
                    const item = spendTrend.find(s => s.name === String(label));
                    return item?.label ?? `Doc ${label}`;
                  }}
                />
                <Line type="monotone" dataKey={currency === "USD" ? "usd" : "inr"} stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Token Consumption by Agent</div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenByAgent} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="agent" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), "Tokens"]} />
                <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                  {tokenByAgent.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
          <div className="text-sm font-semibold text-slate-900 mb-4">Latency Distribution — p50 / p95 / p99 per Agent</div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyByAgent} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="agent" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}ms`} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} ms`, ""]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="p50" fill="#93C5FD" name="p50" radius={[2, 2, 0, 0]} />
                <Bar dataKey="p95" fill="#3B82F6" name="p95" radius={[2, 2, 0, 0]} />
                <Bar dataKey="p99" fill={NAVY} name="p99" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Model Mix</div>
          <div className="h-32 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={modelMix} cx="50%" cy="50%" innerRadius={30} outerRadius={56} paddingAngle={3} dataKey="value">
                  {modelMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v, "Spans"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {modelMix.map(m => (
            <div key={m.name} className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: m.color }} />
                <span className="text-slate-700">{m.name}</span>
              </div>
              <span className="font-mono text-slate-600">{m.value} spans</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Cost per Finding by Risk Category</div>
          <div className="space-y-3">
            {costByRisk.map(r => (
              <div key={r.risk} className="flex items-center gap-3">
                <span className="text-xs font-medium text-white px-2 py-0.5 rounded w-16 text-center" style={{ backgroundColor: r.risk === "Critical" ? "#B91C1C" : r.risk === "High" ? "#EA580C" : r.risk === "Medium" ? "#CA8A04" : "#16A34A" }}>{r.risk}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                  <div className="h-full rounded" style={{ width: r.costPerFinding > 0 ? `${Math.min((r.costPerFinding / 0.02) * 100, 100)}%` : "0%", backgroundColor: r.risk === "Critical" ? "#B91C1C" : r.risk === "High" ? "#EA580C" : r.risk === "Medium" ? "#CA8A04" : "#16A34A" }} />
                </div>
                <span className="text-xs font-mono text-slate-600 w-20 text-right">{r.costPerFinding > 0 ? fmt(r.costPerFinding) : "—"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm font-semibold text-slate-900 mb-4">Summary Statistics</div>
          <div className="space-y-3">
            {[
              ["Total documents", String(completed.length)],
              ["Total spans executed", String(allSpans.length)],
              ["Total tokens consumed", allSpans.reduce((a, s) => a + s.totalTokens, 0).toLocaleString()],
              ["Total cost (USD)", `$${totalCost.toFixed(4)}`],
              ["Avg cost per document", `$${(totalCost / Math.max(completed.length, 1)).toFixed(4)}`],
              ["gpt-4o-mini adoption", `${allSpans.filter(s => s.model === "gpt-4o-mini").length} / ${allSpans.length} spans`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-sm text-slate-500">{k}</span>
                <span className="text-sm font-semibold font-mono text-slate-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-sm font-semibold text-slate-900">Top {topDocs.length} Most Expensive Analyses</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["#", "Document", "Tokens", "Cost", "Findings", "Risk"].map((h, i) => (
                <th key={h} className={`${i > 1 ? "text-right" : "text-left"} px-4 py-3 text-xs font-semibold text-slate-400 uppercase`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topDocs.map((d) => (
              <tr key={d.rank} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400 font-mono">{d.rank}</td>
                <td className="px-4 py-3 text-slate-800 max-w-xs truncate">{d.name}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{d.tokens.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-900 font-medium">{fmt(d.cost)}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{d.findings}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: d.riskLevel === "Critical" ? "#B91C1C" : d.riskLevel === "High" ? "#EA580C" : d.riskLevel === "Medium" ? "#CA8A04" : "#16A34A" }}>{d.riskLevel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

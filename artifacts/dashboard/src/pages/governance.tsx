import { useState } from "react";
import { useDocuments } from "@/lib/store";
import { AUDIT_LOG, RISK_COLORS, NAVY } from "@/lib/mock-data";

export default function Governance() {
  const { documents } = useDocuments();
  const [tab, setTab] = useState<"queue" | "failures" | "log">("queue");

  const allFindings = documents.filter(d => d.status === "completed").flatMap(d =>
    d.findings.filter(f => f.flaggedForReview).map(f => ({
      docName: d.name,
      docId: d.id,
      findingId: f.id,
      finding: f.finding,
      risk: f.risk,
      flaggedBy: f.criticNote?.includes("Critic") ? "Critic Agent" : "Low confidence",
      confidence: f.confidence,
    }))
  );

  const [queue, setQueue] = useState<(typeof allFindings[0] & { status: "pending" | "approved" | "rejected" })[]>(
    allFindings.map(q => ({ ...q, status: "pending" as const }))
  );

  // Sync queue when new flagged findings are uploaded
  const queueIds = new Set(queue.map(q => q.findingId));
  const newItems = allFindings.filter(f => !queueIds.has(f.findingId)).map(q => ({ ...q, status: "pending" as const }));
  const fullQueue = [...newItems, ...queue];

  const act = (findingId: string, action: "approved" | "rejected") => {
    setQueue(prev => {
      const existing = prev.find(q => q.findingId === findingId);
      if (existing) return prev.map(q => q.findingId === findingId ? { ...q, status: action } : q);
      return [...prev, { ...allFindings.find(f => f.findingId === findingId)!, status: action }];
    });
  };

  const getStatus = (findingId: string) => queue.find(q => q.findingId === findingId)?.status ?? "pending";

  const failedDocs = documents.filter(d => d.status === "error");
  const criticOverrides = documents.flatMap(d =>
    d.spans.filter(s => s.agentName === "Critic" && s.reasoningSummary.toLowerCase().includes("reclassified"))
      .map(s => ({ docName: d.name, summary: s.reasoningSummary }))
  );

  // Combine base audit log + session uploads
  const sessionUploads = documents.slice(8).map(d => ([
    { ts: d.uploadedAt, user: "session@firm.com", action: "UPLOAD", detail: d.name },
    { ts: d.uploadedAt, user: "system", action: "ANALYZE_COMPLETE", detail: `${d.findings.length} findings · ${d.totalTokens.toLocaleString()} tokens · $${d.totalCost.toFixed(4)}` },
  ])).flat();

  const fullLog = [...sessionUploads, ...AUDIT_LOG].sort((a, b) =>
    new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Governance & Failure Modes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Human-in-the-loop queue, failure anatomy, and immutable audit log</p>
        </div>
        {documents.length > 8 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">
            {documents.length - 8} session documents in log
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: "queue", label: `Human-in-the-Loop (${fullQueue.filter(q => getStatus(q.findingId) === "pending").length} pending)` },
          { key: "failures", label: "Failure Mode Anatomy" },
          { key: "log", label: `Audit Log (${fullLog.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
            Findings are flagged for human review when: <strong>Critic agent overrides Classifier</strong> · <strong>Confidence &lt; 0.7</strong> · <strong>Critical risk</strong> classification
          </div>
          {fullQueue.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="text-3xl mb-3">✓</div>
              <div className="text-sm font-medium text-slate-600">No items in review queue</div>
              <div className="text-xs text-slate-400 mt-1">Flagged findings from new uploads will appear here automatically</div>
            </div>
          ) : (
            <div className="space-y-3">
              {fullQueue.map(item => {
                const status = getStatus(item.findingId);
                return (
                  <div key={item.findingId} className={`bg-white rounded-xl border p-5 transition-all ${status === "approved" ? "border-green-200 bg-green-50/50" : status === "rejected" ? "border-red-200 bg-red-50/50" : "border-slate-200"}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold text-white px-2 py-0.5 rounded" style={{ backgroundColor: RISK_COLORS[item.risk as keyof typeof RISK_COLORS] }}>{item.risk}</span>
                          <span className="text-xs text-slate-400 truncate max-w-xs">{item.docName}</span>
                          <span className="text-xs text-slate-400">· {item.flaggedBy}</span>
                          <span className="text-xs text-slate-400">· {(item.confidence * 100).toFixed(0)}% conf</span>
                        </div>
                        <p className="text-sm text-slate-800">{item.finding}</p>
                      </div>
                      {status === "pending" ? (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => act(item.findingId, "approved")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Approve</button>
                          <button onClick={() => act(item.findingId, "rejected")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">Reject</button>
                        </div>
                      ) : (
                        <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg ${status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {status === "approved" ? "✓ Approved" : "✗ Rejected"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "failures" && (
        <div className="space-y-4">
          {failedDocs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-red-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span className="text-sm font-semibold text-red-800">Document Parse Failures ({failedDocs.length})</span>
              </div>
              {failedDocs.map(d => (
                <div key={d.id} className="px-5 py-4 border-b border-slate-100 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{d.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{d.errorMessage}</div>
                    </div>
                    <span className="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">parse_error</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {criticOverrides.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-blue-50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                <span className="text-sm font-semibold text-blue-800">Reflection / Critic Overrides ({criticOverrides.length})</span>
              </div>
              {criticOverrides.map((o, i) => (
                <div key={i} className="px-5 py-4 border-b border-slate-100 last:border-0">
                  <div className="text-sm font-medium text-slate-900 mb-1">{o.docName}</div>
                  <div className="text-xs text-slate-600 italic">"{o.summary}"</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-sm font-semibold text-slate-800">Failure Type Summary</span>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { type: "Document parse failure", count: failedDocs.length, last: failedDocs[0]?.uploadedAt ? new Date(failedDocs[0].uploadedAt).toLocaleString("en-GB") : "—", color: "#EF4444", desc: "Corrupt or password-protected file" },
                { type: "Reflection caught misclassification", count: criticOverrides.length, last: "2026-05-25 09:12", color: "#3B82F6", desc: "Critic agent overruled Classifier" },
                { type: "JSON parse failure", count: 0, last: "—", color: "#CA8A04", desc: "Model returned non-JSON output" },
                { type: "Rate limit (OpenAI)", count: 0, last: "—", color: "#6B7280", desc: "429 Too Many Requests from API" },
              ].map(row => (
                <div key={row.type} className="px-5 py-4 flex items-center gap-4">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{row.type}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{row.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold font-mono text-slate-900">{row.count}×</div>
                    <div className="text-xs text-slate-400">{row.last}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "log" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Immutable Audit Log</div>
            <div className="text-xs text-slate-400">Append-only · Never editable · All actions user-attributed</div>
          </div>
          <div className="divide-y divide-slate-50 max-h-[calc(100vh-280px)] overflow-y-auto">
            {fullLog.map((entry, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50">
                <span className="text-xs text-slate-400 font-mono w-36 shrink-0">
                  {new Date(entry.ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded font-mono w-36 shrink-0 text-center ${
                  entry.action === "UPLOAD" ? "bg-blue-100 text-blue-700" :
                  entry.action.startsWith("ANALYZE") ? "bg-purple-100 text-purple-700" :
                  entry.action === "PARSE_ERROR" ? "bg-red-100 text-red-700" :
                  entry.action === "EXPORT_PDF" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>{entry.action}</span>
                <span className="text-xs text-slate-400 w-40 shrink-0 font-mono">{entry.user}</span>
                <span className="text-sm text-slate-700 truncate">{entry.detail}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {fullLog.length} entries · Append-only in production · Session uploads shown above historical records
          </div>
        </div>
      )}
    </div>
  );
}

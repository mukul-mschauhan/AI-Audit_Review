import { useState } from "react";
import { useDocuments } from "@/lib/store";
import { AGENT_COLORS, RISK_COLORS, NAVY, type Span } from "@/lib/mock-data";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

function TokenBar({ sys, user, out, total }: { sys: number; user: number; out: number; total: number }) {
  const sysPct = (sys / total) * 100;
  const usrPct = (user / total) * 100;
  const outPct = (out / total) * 100;
  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xs text-slate-400 w-20 shrink-0">Token split</span>
        <div className="flex-1 flex h-3 rounded overflow-hidden gap-px">
          <div className="bg-blue-700 h-full" style={{ width: `${sysPct}%` }} title={`System: ${sys}`} />
          <div className="bg-blue-400 h-full" style={{ width: `${usrPct}%` }} title={`User: ${user}`} />
          <div className="bg-emerald-500 h-full" style={{ width: `${outPct}%` }} title={`Output: ${out}`} />
        </div>
        <span className="text-xs text-slate-400 font-mono shrink-0">{total.toLocaleString()}</span>
      </div>
      <div className="flex gap-3 text-xs text-slate-400 ml-20">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-700 inline-block" />Sys {sys.toLocaleString()}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />User {user.toLocaleString()}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Out {out.toLocaleString()}</span>
      </div>
    </div>
  );
}

function ContextModal({ span, onClose }: { span: Span; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold text-slate-900">Context Window — {span.agentName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{span.model} · {span.inputTokens.toLocaleString()} input tokens · Span {span.spanId}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        {span.retrievalChunks.length > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
            <span className="text-xs text-amber-800 font-medium">{span.retrievalChunks.length} retrieval chunk{span.retrievalChunks.length !== 1 ? "s" : ""} injected</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System Prompt</div>
            <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono border border-slate-200">{span.systemPrompt}</pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">User Message</div>
            <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono border border-slate-200">{span.userMessage}</pre>
          </div>
          {span.retrievalChunks.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Retrieval Chunks</div>
              {span.retrievalChunks.map((c, i) => (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2 text-xs font-mono text-amber-900">
                  <span className="font-semibold text-amber-600">[Chunk {i + 1}]</span> {c}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplayModal({ span, onClose }: { span: Span; onClose: () => void }) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const miniCost = (span.inputTokens * 0.15 + span.outputTokens * 0.6) / 1_000_000;
  const miniLatency = Math.round(span.latencyMs * 0.51);
  const savings = span.costUsd > 0 ? ((1 - miniCost / span.costUsd) * 100).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold text-slate-900">Replay — {span.agentName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Same prompt · gpt-4o-mini · compare cost & quality</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-white" style={{ backgroundColor: NAVY }}>
                <span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> Original · gpt-4o
              </div>
              <div className="p-4 space-y-2.5">
                {[["Tokens", span.totalTokens.toLocaleString()], ["Cost", `$${span.costUsd.toFixed(5)}`], ["Latency", `${span.latencyMs.toLocaleString()} ms`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm"><span className="text-slate-500">{k}</span><span className="font-mono font-medium">{v}</span></div>
                ))}
                <div className="pt-1">
                  <div className="text-xs text-slate-400 mb-1">Output</div>
                  <pre className="bg-slate-50 border border-slate-100 rounded p-2 text-xs text-slate-700 whitespace-pre-wrap max-h-28 overflow-y-auto">{span.outputJson}</pre>
                </div>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Replay · gpt-4o-mini
              </div>
              <div className="p-4">
                {state === "idle" && (
                  <div className="h-32 flex items-center justify-center">
                    <button onClick={() => { setState("running"); setTimeout(() => setState("done"), 1800); }} className="px-5 py-2.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: NAVY }}>Run Replay</button>
                  </div>
                )}
                {state === "running" && (
                  <div className="h-32 flex items-center justify-center text-center">
                    <div>
                      <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Calling gpt-4o-mini…</p>
                    </div>
                  </div>
                )}
                {state === "done" && (
                  <div className="space-y-2.5">
                    {[["Tokens", span.totalTokens.toLocaleString()], ["Cost", `$${miniCost.toFixed(5)}`], ["Latency", `${miniLatency.toLocaleString()} ms`]].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm"><span className="text-slate-500">{k}</span><span className="font-mono font-medium text-emerald-600">{v}</span></div>
                    ))}
                    <div className="pt-1">
                      <div className="text-xs text-slate-400 mb-1">Output</div>
                      <pre className="bg-slate-50 border border-slate-100 rounded p-2 text-xs text-slate-700 whitespace-pre-wrap max-h-28 overflow-y-auto">{span.outputJson}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {state === "done" && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              {[["Cost reduction", `${savings}%`], ["Speed improvement", `~${Math.round((1 - miniLatency / span.latencyMs) * 100)}%`], ["Output quality", "≈ same"]].map(([k, v]) => (
                <div key={k} className="text-center">
                  <div className="text-2xl font-bold text-emerald-700">{v}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">{k}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpanRow({ span }: { span: Span }) {
  const [open, setOpen] = useState(false);
  const [showCtx, setShowCtx] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const color = AGENT_COLORS[span.agentName] ?? "#6B7280";

  return (
    <>
      {showCtx && <ContextModal span={span} onClose={() => setShowCtx(false)} />}
      {showReplay && <ReplayModal span={span} onClose={() => setShowReplay(false)} />}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-2.5">
        <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
          <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-slate-900 w-20 shrink-0">{span.agentName}</span>
          <span className="text-xs text-slate-400 font-mono w-24 shrink-0">{span.model}</span>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex h-2.5 rounded overflow-hidden w-full max-w-xs">
              <div className="bg-blue-700" style={{ width: `${(span.systemPromptTokens / span.totalTokens) * 100}%` }} />
              <div className="bg-blue-400" style={{ width: `${(span.userMessageTokens / span.totalTokens) * 100}%` }} />
              <div className="bg-emerald-500" style={{ width: `${(span.outputTokens / span.totalTokens) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-400 font-mono shrink-0">{span.totalTokens.toLocaleString()} tok</span>
          </div>
          <span className="text-xs text-slate-700 font-mono w-16 shrink-0 text-right">${span.costUsd.toFixed(5)}</span>
          <span className="text-xs text-slate-400 font-mono w-20 shrink-0 text-right">{span.latencyMs.toLocaleString()} ms</span>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${span.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{span.status}</span>
          <span className="text-slate-300 text-xs shrink-0">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 space-y-3">
            <TokenBar sys={span.systemPromptTokens} user={span.userMessageTokens} out={span.outputTokens} total={span.totalTokens} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Input Summary</div>
                <pre className="bg-white rounded-lg border border-slate-200 p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{span.inputSummary}</pre>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Output</div>
                <pre className="bg-white rounded-lg border border-slate-200 p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{span.outputSummary}</pre>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Reasoning</div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-sm text-slate-700 italic">"{span.reasoningSummary}"</div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCtx(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-white transition-colors">
                👁 What did the agent see?
              </button>
              <button onClick={() => setShowReplay(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white transition-colors" style={{ backgroundColor: NAVY }}>
                ↻ Re-run with gpt-4o-mini
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function Traces() {
  const { documents } = useDocuments();
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? "");
  const [search, setSearch] = useState("");

  const filtered = documents.filter(d =>
    search.length < 2 || d.name.toLowerCase().includes(search.toLowerCase())
  );

  const doc = documents.find(d => d.id === selectedId) ?? documents[0];
  const spans = doc?.spans ?? [];
  const totalMs = spans.length > 0 ? spans[spans.length - 1].startOffset + spans[spans.length - 1].durationMs : 0;

  const costByAgent = spans.map(s => ({
    name: s.agentName,
    value: parseFloat(s.costUsd.toFixed(6)),
    color: AGENT_COLORS[s.agentName] ?? "#6B7280",
  }));
  const totalCost = costByAgent.reduce((a, b) => a + b.value, 0);

  return (
    <div className="flex h-screen">
      {/* Left: doc list */}
      <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Documents · {documents.length}</div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(d => (
            <button key={d.id} onClick={() => setSelectedId(d.id)} className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedId === d.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-slate-800 font-medium leading-tight break-all line-clamp-2">{d.name}</span>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: d.status === "error" ? "#6B7280" : d.riskLevel === "Critical" ? "#B91C1C" : d.riskLevel === "High" ? "#EA580C" : d.riskLevel === "Medium" ? "#CA8A04" : "#16A34A" }}>
                  {d.status === "error" ? "Error" : d.riskLevel}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-slate-400 mt-1">
                <span>{d.findings.length} findings</span>
                <span>·</span>
                <span>${d.totalCost.toFixed(4)}</span>
                <span>·</span>
                <span>{d.totalTokens.toLocaleString()} tok</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: trace detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!doc ? (
          <div className="flex items-center justify-center h-full text-slate-400">No document selected</div>
        ) : spans.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <div className="text-4xl mb-3">{doc.status === "error" ? "⚠" : "○"}</div>
              <div className="text-sm font-medium">{doc.status === "error" ? "Parse failed" : "No trace data"}</div>
              {doc.errorMessage && <div className="text-xs mt-2 max-w-sm text-slate-500">{doc.errorMessage}</div>}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">{doc.name}</h2>
              <div className="flex gap-4 text-sm text-slate-400 mt-0.5">
                <span>{spans.length} spans</span><span>·</span>
                <span>{doc.totalTokens.toLocaleString()} tokens</span><span>·</span>
                <span>${doc.totalCost.toFixed(4)}</span><span>·</span>
                <span>{totalMs.toLocaleString()} ms</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <div className="mb-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Waterfall · {totalMs.toLocaleString()} ms</div>
                <div className="space-y-2">
                  {spans.map(s => {
                    const left = (s.startOffset / totalMs) * 100;
                    const width = Math.max((s.durationMs / totalMs) * 100, 2);
                    const color = AGENT_COLORS[s.agentName] ?? "#6B7280";
                    return (
                      <div key={s.spanId} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-20 shrink-0">{s.agentName}</span>
                        <div className="flex-1 relative h-6 bg-slate-100 rounded">
                          <div className="absolute h-full rounded flex items-center px-2" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}>
                            <span className="text-white text-xs font-mono whitespace-nowrap overflow-hidden">{s.latencyMs}ms</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 font-mono w-16 shrink-0 text-right">${s.costUsd.toFixed(4)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1 ml-[92px] mr-[76px]">
                  <span>0 ms</span><span>{totalMs.toLocaleString()} ms</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cost Attribution by Agent</div>
                <div className="flex items-center gap-6">
                  <div className="w-36 h-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={costByAgent} cx="50%" cy="50%" innerRadius={30} outerRadius={56} paddingAngle={2} dataKey="value">
                          {costByAgent.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => [`$${v.toFixed(5)}`, "Cost"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {costByAgent.map(d => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-sm text-slate-700">{d.name}</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-xs text-slate-400 font-mono">${d.value.toFixed(5)}</span>
                          <span className="text-xs font-medium text-slate-700 w-10 text-right">{totalCost > 0 ? ((d.value / totalCost) * 100).toFixed(1) : 0}%</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-400">Total</span>
                      <span className="font-mono font-semibold">${totalCost.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {doc.findings.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Approved Findings</div>
                <div className="space-y-2">
                  {doc.findings.map(f => (
                    <div key={f.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold text-white shrink-0 mt-0.5" style={{ backgroundColor: RISK_COLORS[f.risk] }}>{f.risk}</span>
                        <div className="flex-1">
                          <div className="text-sm text-slate-800">{f.finding}</div>
                          <div className="text-xs text-slate-500 mt-1">{f.recommendation}</div>
                          {f.criticNote && <div className="text-xs text-blue-600 mt-1.5 italic">Critic: "{f.criticNote}"</div>}
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-xs text-slate-400 font-mono">{f.controlId}</span>
                          <div className="text-xs text-slate-400 mt-1">{(f.confidence * 100).toFixed(0)}% conf</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Span Tree</div>
              <div className="flex gap-4 text-xs text-slate-400 mb-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-700 inline-block" />System</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />User</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Output</span>
              </div>
              {spans.map(s => <SpanRow key={s.spanId} span={s} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { MOCK_DOCUMENTS, AGENT_COLORS, NAVY, type Document, type Span } from "@/lib/mock-data";
import { useDocuments } from "@/lib/store";

const DEMO_SEQUENCE = MOCK_DOCUMENTS.slice(0, 3);

interface LiveStep {
  agent: string;
  model: string;
  tokens: number;
  cost: number;
  latencyMs: number;
  status: "pending" | "running" | "done" | "error";
  spanId?: string;
}

function buildSteps(): LiveStep[] {
  return [
    { agent: "Extractor", model: "gpt-4o", tokens: 0, cost: 0, latencyMs: 0, status: "pending" },
    { agent: "Validator", model: "gpt-4o", tokens: 0, cost: 0, latencyMs: 0, status: "pending" },
    { agent: "Classifier", model: "gpt-4o", tokens: 0, cost: 0, latencyMs: 0, status: "pending" },
    { agent: "Critic", model: "gpt-4o", tokens: 0, cost: 0, latencyMs: 0, status: "pending" },
  ];
}

function makeNewDocFromTemplate(name: string, template: Document): Document {
  const newId = `doc-${Date.now().toString(36)}`;
  const newSpans: Span[] = template.spans.map(s => ({
    ...s,
    spanId: `sp-${Math.random().toString(36).slice(2, 10)}`,
  }));
  const doc: Document = {
    ...template,
    id: newId,
    name,
    uploadedAt: new Date().toISOString(),
    spans: newSpans,
    findings: template.findings.map((f, i) => ({ ...f, id: `f-${newId}-${i}` })),
    totalCost: newSpans.reduce((a, s) => a + s.costUsd, 0),
    totalTokens: newSpans.reduce((a, s) => a + s.totalTokens, 0),
  };
  return doc;
}

export default function Upload() {
  const { addDocument } = useDocuments();
  const [, navigate] = useLocation();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [findings, setFindings] = useState(0);
  const [newDocId, setNewDocId] = useState<string | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const simulateAnalysis = useCallback((name: string, docIdx = 0): Promise<void> => {
    return new Promise((resolve) => {
      const template = MOCK_DOCUMENTS[docIdx % MOCK_DOCUMENTS.length];
      const spans = template.spans.length > 0 ? template.spans : MOCK_DOCUMENTS[0].spans;
      setFileName(name);
      setRunning(true);
      setDone(false);
      setFindings(0);
      setNewDocId(null);
      const initial = buildSteps();
      setSteps(initial);

      const completedSteps: LiveStep[] = [...initial];

      spans.forEach((span, i) => {
        setTimeout(() => {
          setSteps(prev => prev.map((s, si) => si === i ? { ...s, status: "running" } : s));
          setTimeout(() => {
            completedSteps[i] = {
              ...completedSteps[i],
              status: "done",
              tokens: span.totalTokens,
              cost: span.costUsd,
              latencyMs: span.latencyMs,
              model: span.model,
              spanId: span.spanId,
            };
            setSteps([...completedSteps]);

            if (i === spans.length - 1) {
              setRunning(false);
              setDone(true);
              setFindings(template.findings.length);

              // Build and register the new document into global store
              const newDoc = makeNewDocFromTemplate(name, template);
              setNewDocId(newDoc.id);
              addDocument(newDoc);
              resolve();
            }
          }, Math.min(span.latencyMs, 1100));
        }, i * 1400);
      });
    });
  }, [addDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) simulateAnalysis(file.name);
  }, [simulateAnalysis]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateAnalysis(file.name);
    e.target.value = "";
  };

  const runDemo = async () => {
    setDemoRunning(true);
    for (let i = 0; i < DEMO_SEQUENCE.length; i++) {
      await simulateAnalysis(DEMO_SEQUENCE[i].name + " (demo)", i);
      if (i < DEMO_SEQUENCE.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
    setDemoRunning(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Upload & Analyze</h1>
          <p className="text-sm text-slate-500 mt-0.5">Drop a document to run the 4-agent pipeline — results sync to all tabs instantly</p>
        </div>
        <button
          onClick={runDemo}
          disabled={demoRunning || running}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: NAVY }}
        >
          {demoRunning ? "Running demo…" : "▶ Run Demo Sequence"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Drop Zone + Demo list */}
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400 bg-white"}`}
          >
            <div className="text-5xl mb-3 text-slate-300">↑</div>
            <div className="text-sm font-medium text-slate-700 mb-1">Drop a document here or click to browse</div>
            <div className="text-xs text-slate-400">PDF · DOCX · XLSX · PNG · JPG</div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" onChange={handleFile} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pre-Seeded Demo Documents</div>
            <div className="space-y-1.5">
              {MOCK_DOCUMENTS.map((doc, i) => (
                <button
                  key={doc.id}
                  onClick={() => simulateAnalysis(doc.name, i)}
                  disabled={running}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  <span className="text-base">
                    {doc.type === "pdf" ? "📄" : doc.type === "docx" ? "📝" : doc.type === "xlsx" ? "📊" : "🖼"}
                  </span>
                  <span className="text-sm text-slate-700 truncate flex-1">{doc.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium text-white shrink-0" style={{
                    backgroundColor: doc.status === "error" ? "#6B7280"
                      : doc.riskLevel === "Critical" ? "#B91C1C"
                      : doc.riskLevel === "High" ? "#EA580C"
                      : doc.riskLevel === "Medium" ? "#CA8A04"
                      : "#16A34A"
                  }}>
                    {doc.status === "error" ? "Error" : doc.riskLevel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Trace Panel */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Live Trace Panel</div>
              {fileName && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{fileName}</div>}
            </div>
            {running && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Processing…
              </div>
            )}
          </div>

          <div className="flex-1 p-5 min-h-[260px]">
            {steps.length === 0 && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-4xl mb-3 text-slate-200">⬡</div>
                  <p className="text-sm text-slate-400">Upload or click a demo to start</p>
                  <p className="text-xs text-slate-300 mt-1">Results will sync to all tabs when complete</p>
                </div>
              </div>
            )}
            {steps.length > 0 && (
              <div className="space-y-3">
                {steps.map((step, i) => {
                  const color = AGENT_COLORS[step.agent] ?? "#6B7280";
                  const isDone = step.status === "done";
                  const isRunning = step.status === "running";
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isRunning ? "border-blue-200 bg-blue-50/80" : isDone ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-slate-50/50 opacity-50"}`}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: isDone ? color : isRunning ? color : "#CBD5E1" }}>
                        {isDone ? "✓" : isRunning ? <span className="inline-block animate-spin">↻</span> : String(i + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900">{step.agent}</span>
                          <span className="text-xs text-slate-400 font-mono">{step.model}</span>
                          {isDone && step.spanId && <span className="text-xs text-slate-300 font-mono">#{step.spanId}</span>}
                        </div>
                        {isRunning && <div className="text-xs text-blue-600 mt-0.5 animate-pulse">Calling {step.model}…</div>}
                        {step.status === "pending" && <div className="text-xs text-slate-400 mt-0.5">Waiting…</div>}
                        {isDone && (
                          <div className="flex gap-4 text-xs text-slate-500 font-mono mt-0.5">
                            <span className="text-blue-600 font-medium">{step.tokens.toLocaleString()} tok</span>
                            <span className="text-amber-600 font-medium">${step.cost.toFixed(5)}</span>
                            <span>{step.latencyMs.toLocaleString()} ms</span>
                          </div>
                        )}
                      </div>
                      {isRunning && (
                        <div className="w-20 h-1.5 bg-blue-100 rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "65%" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {done && (
            <div className="px-5 py-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-sm font-semibold text-slate-900">Analysis complete — all tabs updated</span>
                </div>
                <span className="text-sm">
                  {findings > 0
                    ? <span className="text-orange-600 font-semibold">{findings} finding{findings !== 1 ? "s" : ""} detected</span>
                    : <span className="text-emerald-600 font-semibold">No findings — clean</span>}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/traces")}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  View in Trace Explorer →
                </button>
                <button
                  onClick={() => navigate("/observability")}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  View Eval Metrics →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

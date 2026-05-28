import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const NAVY = "#0B2545";
const RISK = {
  Critical: "#B91C1C",
  High: "#EA580C",
  Medium: "#CA8A04",
  Low: "#16A34A",
};

const AGENT_COLORS: Record<string, string> = {
  Extractor: "#2563EB",
  Validator: "#7C3AED",
  Classifier: "#0891B2",
  Critic: "#059669",
};

interface TokenBar {
  systemPrompt: number;
  userMessage: number;
  output: number;
}

interface SpanData {
  spanId: string;
  agentName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  status: "success" | "error";
  startOffset: number;
  durationMs: number;
  tokenBreakdown: TokenBar;
  systemPrompt: string;
  userMessage: string;
  retrievalChunks: string[];
  fullContext: string;
  inputSummary: string;
  outputSummary: string;
  reasoningSummary: string;
  outputJson: string;
}

interface DocumentItem {
  id: string;
  name: string;
  uploadedAt: string;
  status: "completed" | "error" | "processing";
  totalCost: number;
  totalTokens: number;
  findingCount: number;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  spans: SpanData[];
}

const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-001",
    name: "Acme_Corp_Invoice_87500.pdf",
    uploadedAt: "2026-05-25T09:12:00Z",
    status: "completed",
    totalCost: 0.0412,
    totalTokens: 8240,
    findingCount: 2,
    riskLevel: "High",
    spans: [
      {
        spanId: "sp-001",
        agentName: "Extractor",
        model: "gpt-4o",
        inputTokens: 1820,
        outputTokens: 420,
        totalTokens: 2240,
        costUsd: 0.0097,
        latencyMs: 1240,
        status: "success",
        startOffset: 0,
        durationMs: 1240,
        tokenBreakdown: { systemPrompt: 1100, userMessage: 720, output: 420 },
        systemPrompt:
          "You are an expert document extractor for Big 4 audit workflows. Extract structured entities from the document. Return valid JSON with keys: vendor, invoice_number, amount, currency, date, PO_reference, approver_name, contract_id, payment_terms, signature_present.",
        userMessage:
          "Extract entities from the following invoice document:\n\nACME CORP\nInvoice No: INV-2024-8821\nDate: 2026-04-15\nAmount: $87,500 USD\nPO Reference: PO-4492\nApprover: [BLANK]\nContract ID: C-2022-114\nPayment Terms: Net-30\nSignature: [ABSENT]",
        retrievalChunks: [],
        fullContext:
          "SYSTEM: You are an expert document extractor for Big 4 audit workflows...\n\nUSER: Extract entities from the following invoice document:\n\nACME CORP\nInvoice No: INV-2024-8821\nDate: 2026-04-15\nAmount: $87,500 USD\nPO Reference: PO-4492\nApprover: [BLANK]\nContract ID: C-2022-114\nPayment Terms: Net-30\nSignature: [ABSENT]",
        inputSummary:
          "Invoice document: Acme Corp, INV-2024-8821, $87,500, missing approver",
        outputSummary:
          '{\n  "vendor": "Acme Corp",\n  "invoice_number": "INV-2024-8821",\n  "amount": 87500,\n  "currency": "USD",\n  "date": "2026-04-15",\n  "PO_reference": "PO-4492",\n  "approver_name": null,\n  "contract_id": "C-2022-114",\n  "payment_terms": "Net-30",\n  "signature_present": false\n}',
        reasoningSummary:
          "Identified vendor 'Acme Corp', invoice $87,500 above approval threshold. Approver field blank. Signature absent.",
        outputJson:
          '{"vendor":"Acme Corp","invoice_number":"INV-2024-8821","amount":87500,"currency":"USD","date":"2026-04-15","PO_reference":"PO-4492","approver_name":null,"contract_id":"C-2022-114","payment_terms":"Net-30","signature_present":false}',
      },
      {
        spanId: "sp-002",
        agentName: "Validator",
        model: "gpt-4o",
        inputTokens: 1640,
        outputTokens: 380,
        totalTokens: 2020,
        costUsd: 0.0088,
        latencyMs: 980,
        status: "success",
        startOffset: 1240,
        durationMs: 980,
        tokenBreakdown: { systemPrompt: 980, userMessage: 660, output: 380 },
        systemPrompt:
          "You are an audit control validator. Given extracted document entities and the 5 control rules below, identify violations with supporting evidence quotes. Return JSON array.",
        userMessage:
          'Validate the following entities against control rules:\n\nEntities: {"vendor":"Acme Corp","amount":87500,"approver_name":null,"signature_present":false,"contract_id":"C-2022-114"}\n\nControl Rules:\nR1: amount > 50000 AND approver is null → violation\nR2: signature_present = false → violation\nR3: amount > vendor_contract_max_value → check DB\nR4: invoice date > contract_end_date → check DB\nR5: duplicate invoice_number for same vendor → check DB\n\nRetrieved contract data: {"C-2022-114": {"max_value": 75000, "end_date": "2026-12-31"}}',
        retrievalChunks: [
          'Contract C-2022-114: {"vendor":"Acme Corp","max_value":75000,"end_date":"2026-12-31","status":"active"}',
          'Prior invoices for Acme Corp: INV-2024-8800 ($42,000), INV-2024-8751 ($31,500) — no duplicate found',
        ],
        fullContext:
          "SYSTEM: You are an audit control validator...\n\nUSER: Validate the following entities against control rules:\n\nEntities: {\"vendor\":\"Acme Corp\",...}\n\n[RETRIEVAL CHUNK 1]: Contract C-2022-114: {\"vendor\":\"Acme Corp\",\"max_value\":75000,...}\n[RETRIEVAL CHUNK 2]: Prior invoices for Acme Corp: INV-2024-8800...",
        inputSummary: "Entities + R1-R5 rules + retrieved contract/invoice DB",
        outputSummary:
          "R1 violated (no approver, $87,500 > $50K), R2 violated (no signature), R3 violated ($87,500 > contract max $75,000)",
        reasoningSummary:
          "Three control violations: missing approval, missing signature, and threshold breach vs contract ceiling $75K.",
        outputJson:
          '[{"control_id":"R1","violated":true,"evidence_quote":"approver_name: null, amount: 87500","confidence":0.98},{"control_id":"R2","violated":true,"evidence_quote":"signature_present: false","confidence":0.95},{"control_id":"R3","violated":true,"evidence_quote":"invoice $87,500 exceeds contract max $75,000","confidence":0.97}]',
      },
      {
        spanId: "sp-003",
        agentName: "Classifier",
        model: "gpt-4o",
        inputTokens: 1280,
        outputTokens: 520,
        totalTokens: 1800,
        costUsd: 0.0084,
        latencyMs: 1420,
        status: "success",
        startOffset: 2220,
        durationMs: 1420,
        tokenBreakdown: { systemPrompt: 760, userMessage: 520, output: 520 },
        systemPrompt:
          "You are a Big 4 audit risk classifier. Classify each control violation as Low/Medium/High/Critical and draft a formal audit observation in house style. Each finding must include: finding, impact, recommendation.",
        userMessage:
          'Draft findings for the following violations:\n[{"control_id":"R1","violated":true,"evidence_quote":"approver_name: null, amount: 87500","confidence":0.98},{"control_id":"R2",...},{"control_id":"R3",...}]',
        retrievalChunks: [],
        fullContext:
          "SYSTEM: You are a Big 4 audit risk classifier...\n\nUSER: Draft findings for the following violations:\n[{...R1...},{...R2...},{...R3...}]",
        inputSummary: "3 control violations → classify & draft findings",
        outputSummary:
          "Finding 1 (R1): HIGH — Invoice approved without required authorisation. Finding 2 (R2): MEDIUM — Signature absent. Finding 3 (R3): HIGH — Threshold breach.",
        reasoningSummary:
          "R1 and R3 classified High due to financial exposure; R2 Medium as procedural.",
        outputJson:
          '[{"finding_id":"F1","control_id":"R1","risk":"High","finding":"Invoice INV-2024-8821 for $87,500 processed without required approver authorisation per Policy 3.1.","impact":"Unauthorised disbursement of $87,500 with no accountability chain.","recommendation":"Implement mandatory approval workflow gate for invoices exceeding $50,000."},{"finding_id":"F2","control_id":"R2","risk":"Medium","finding":"Invoice lacks required signature.","impact":"Document validity cannot be confirmed.","recommendation":"Enforce e-signature at point of submission."},{"finding_id":"F3","control_id":"R3","risk":"High","finding":"Invoice amount $87,500 exceeds contract maximum $75,000.","impact":"Potential over-procurement outside contracted scope.","recommendation":"Block payment pending contract amendment or secondary approval."}]',
      },
      {
        spanId: "sp-004",
        agentName: "Critic",
        model: "gpt-4o",
        inputTokens: 1640,
        outputTokens: 540,
        totalTokens: 2180,
        costUsd: 0.0143,
        latencyMs: 1680,
        status: "success",
        startOffset: 3640,
        durationMs: 1680,
        tokenBreakdown: { systemPrompt: 920, userMessage: 720, output: 540 },
        systemPrompt:
          "You are a senior audit critic. Review the draft findings against the original evidence. Flag any finding that is (a) unsupported, (b) over-classified, or (c) missing a recommendation. Return revised approved findings and critic_notes.",
        userMessage:
          "Review these draft findings against the original entities:\n\nOriginal entities: {vendor: Acme Corp, amount: 87500, approver: null, signature: false, contract_max: 75000}\n\nDraft findings: [{F1: High, R1...}, {F2: Medium, R2...}, {F3: High, R3...}]",
        retrievalChunks: [],
        fullContext:
          "SYSTEM: You are a senior audit critic...\n\nUSER: Review these draft findings against the original entities:\n\nOriginal: {...}\nDraft: [{F1},{F2},{F3}]",
        inputSummary: "3 draft findings reviewed against original evidence",
        outputSummary:
          "All 3 findings approved. Critic note: F2 reclassified Medium→High — missing signature on invoice above $50K warrants higher severity per Policy 4.2.",
        reasoningSummary:
          "Critic approved F1 and F3 unchanged. Upgraded F2 to High citing Policy 4.2 — signature absence on high-value invoices is High per precedent.",
        outputJson:
          '[{"finding_id":"F1","risk":"High","approved":true,"critic_note":"Fully supported by evidence."},{"finding_id":"F2","risk":"High","approved":true,"critic_note":"Reclassified Medium→High. Missing signature on invoice >$50K is High per Policy 4.2."},{"finding_id":"F3","risk":"High","approved":true,"critic_note":"Amount evidence clear. Recommendation adequate."}]',
      },
    ],
  },
  {
    id: "doc-002",
    name: "Meridian_Contract_Expired.docx",
    uploadedAt: "2026-05-25T10:45:00Z",
    status: "completed",
    totalCost: 0.0318,
    totalTokens: 6120,
    findingCount: 1,
    riskLevel: "Medium",
    spans: [
      {
        spanId: "sp-005",
        agentName: "Extractor",
        model: "gpt-4o",
        inputTokens: 1420,
        outputTokens: 380,
        totalTokens: 1800,
        costUsd: 0.0079,
        latencyMs: 1100,
        status: "success",
        startOffset: 0,
        durationMs: 1100,
        tokenBreakdown: { systemPrompt: 1100, userMessage: 320, output: 380 },
        systemPrompt:
          "You are an expert document extractor for Big 4 audit workflows...",
        userMessage:
          "Extract entities from: Meridian Solutions, Invoice INV-2024-7742, Date: 2026-03-01, Contract C-2021-088 (expired 2025-12-31)...",
        retrievalChunks: [],
        fullContext: "SYSTEM: ...\nUSER: Extract entities from: Meridian...",
        inputSummary: "Contract invoice, expired contract referenced",
        outputSummary:
          '{"vendor":"Meridian Solutions","invoice_number":"INV-2024-7742","date":"2026-03-01","contract_id":"C-2021-088"}',
        reasoningSummary: "Extracted entities. Contract ID C-2021-088 flagged.",
        outputJson:
          '{"vendor":"Meridian Solutions","invoice_number":"INV-2024-7742","amount":42000,"date":"2026-03-01","contract_id":"C-2021-088","approver_name":"J.Walsh","signature_present":true}',
      },
      {
        spanId: "sp-006",
        agentName: "Validator",
        model: "gpt-4o",
        inputTokens: 1280,
        outputTokens: 290,
        totalTokens: 1570,
        costUsd: 0.0068,
        latencyMs: 890,
        status: "success",
        startOffset: 1100,
        durationMs: 890,
        tokenBreakdown: { systemPrompt: 980, userMessage: 300, output: 290 },
        systemPrompt: "You are an audit control validator...",
        userMessage: "Validate entities against rules. Retrieved: contract expired 2025-12-31...",
        retrievalChunks: [
          'Contract C-2021-088: {"vendor":"Meridian Solutions","end_date":"2025-12-31","status":"expired"}',
        ],
        fullContext: "SYSTEM: ...\nUSER: Validate...\n[RETRIEVAL CHUNK 1]: Contract C-2021-088...",
        inputSummary: "Entities + control rules + expired contract from DB",
        outputSummary: "R4 violated: invoice date 2026-03-01 after contract expiry 2025-12-31",
        reasoningSummary: "Single R4 violation: invoice raised 91 days after contract expiry.",
        outputJson: '[{"control_id":"R4","violated":true,"evidence_quote":"invoice 2026-03-01 > contract end 2025-12-31","confidence":0.99}]',
      },
      {
        spanId: "sp-007",
        agentName: "Classifier",
        model: "gpt-4o-mini",
        inputTokens: 980,
        outputTokens: 340,
        totalTokens: 1320,
        costUsd: 0.0004,
        latencyMs: 620,
        status: "success",
        startOffset: 1990,
        durationMs: 620,
        tokenBreakdown: { systemPrompt: 640, userMessage: 340, output: 340 },
        systemPrompt: "You are a Big 4 audit risk classifier...",
        userMessage: "Draft findings for R4 violation...",
        retrievalChunks: [],
        fullContext: "SYSTEM: ...\nUSER: Draft findings for R4...",
        inputSummary: "1 violation (R4) → classify & draft",
        outputSummary: "Finding: MEDIUM — Invoice on expired contract. 91-day gap.",
        reasoningSummary: "R4 classified Medium. No financial threshold breach, but contractual risk.",
        outputJson: '[{"finding_id":"F1","control_id":"R4","risk":"Medium","finding":"Invoice raised 91 days after contract expiry."}]',
      },
      {
        spanId: "sp-008",
        agentName: "Critic",
        model: "gpt-4o-mini",
        inputTokens: 1120,
        outputTokens: 310,
        totalTokens: 1430,
        costUsd: 0.0004,
        latencyMs: 580,
        status: "success",
        startOffset: 2610,
        durationMs: 580,
        tokenBreakdown: { systemPrompt: 720, userMessage: 400, output: 310 },
        systemPrompt: "You are a senior audit critic...",
        userMessage: "Review draft findings...",
        retrievalChunks: [],
        fullContext: "SYSTEM: ...\nUSER: Review draft findings...",
        inputSummary: "1 draft finding reviewed",
        outputSummary: "Finding approved unchanged. Medium classification appropriate.",
        reasoningSummary: "Critic approved without changes. Evidence clear and proportionate.",
        outputJson: '[{"finding_id":"F1","risk":"Medium","approved":true,"critic_note":"Classification and evidence proportionate."}]',
      },
    ],
  },
  {
    id: "doc-003",
    name: "GlobalPay_Duplicate_Invoice.pdf",
    uploadedAt: "2026-05-24T16:30:00Z",
    status: "completed",
    totalCost: 0.0389,
    totalTokens: 7410,
    findingCount: 1,
    riskLevel: "Critical",
    spans: [],
  },
  {
    id: "doc-004",
    name: "Parse_Failure_Corrupt.pdf",
    uploadedAt: "2026-05-24T14:10:00Z",
    status: "error",
    totalCost: 0.0,
    totalTokens: 0,
    findingCount: 0,
    riskLevel: "Low",
    spans: [],
  },
];

function TokenBreakdownBar({ breakdown, totalTokens }: { breakdown: TokenBar; totalTokens: number }) {
  const total = breakdown.systemPrompt + breakdown.userMessage + breakdown.output;
  const sysPct = (breakdown.systemPrompt / total) * 100;
  const userPct = (breakdown.userMessage / total) * 100;
  const outPct = (breakdown.output / total) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xs text-slate-500 w-20 shrink-0">Token split</span>
        <div className="flex-1 flex h-4 rounded overflow-hidden gap-px">
          <div
            className="bg-blue-700 h-full"
            style={{ width: `${sysPct}%` }}
            title={`System prompt: ${breakdown.systemPrompt} tok`}
          />
          <div
            className="bg-blue-400 h-full"
            style={{ width: `${userPct}%` }}
            title={`User message: ${breakdown.userMessage} tok`}
          />
          <div
            className="bg-emerald-500 h-full"
            style={{ width: `${outPct}%` }}
            title={`Output: ${breakdown.output} tok`}
          />
        </div>
        <span className="text-xs text-slate-500 shrink-0">{totalTokens.toLocaleString()} tok</span>
      </div>
      <div className="flex items-center gap-3 ml-20">
        <div className="flex gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-700 inline-block" />System {breakdown.systemPrompt.toLocaleString()}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />User {breakdown.userMessage.toLocaleString()}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Output {breakdown.output.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function ContextWindowModal({
  span,
  onClose,
}: {
  span: SpanData;
  onClose: () => void;
}) {
  const hasChunks = span.retrievalChunks.length > 0;

  const renderHighlighted = (text: string) => {
    if (!hasChunks) return <span>{text}</span>;
    const parts: React.ReactNode[] = [];
    let remaining = text;
    span.retrievalChunks.forEach((chunk, i) => {
      const idx = remaining.indexOf(chunk.slice(0, 30));
      if (idx >= 0) {
        parts.push(<span key={`before-${i}`}>{remaining.slice(0, idx)}</span>);
        parts.push(
          <span
            key={`chunk-${i}`}
            className="bg-amber-100 border-l-2 border-amber-400 px-1 rounded"
            title={`Retrieval chunk ${i + 1}`}
          >
            {remaining.slice(idx, idx + chunk.length)}
          </span>
        );
        remaining = remaining.slice(idx + chunk.length);
      }
    });
    parts.push(<span key="tail">{remaining}</span>);
    return <>{parts}</>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">
              Context Window — {span.agentName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact prompt sent to {span.model} · {span.inputTokens.toLocaleString()} input tokens
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {hasChunks && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
            <span className="text-xs text-amber-800 font-medium">
              {span.retrievalChunks.length} retrieval chunk{span.retrievalChunks.length !== 1 ? "s" : ""} highlighted in the context below
            </span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              System Prompt
            </div>
            <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono border border-slate-200">
              {span.systemPrompt}
            </pre>
          </div>
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              User Message
            </div>
            <pre className="bg-slate-50 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono border border-slate-200">
              {renderHighlighted(span.userMessage)}
            </pre>
          </div>
          {hasChunks && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Retrieval Chunks ({span.retrievalChunks.length})
              </div>
              {span.retrievalChunks.map((chunk, i) => (
                <div
                  key={i}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2 text-xs font-mono text-amber-900"
                >
                  <span className="font-semibold text-amber-600">[Chunk {i + 1}]</span>{" "}
                  {chunk}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplayModal({
  span,
  onClose,
}: {
  span: SpanData;
  onClose: () => void;
}) {
  const [replaying, setReplaying] = useState(false);
  const [done, setDone] = useState(false);

  const mockMiniOutput = (() => {
    if (span.agentName === "Extractor")
      return '{"vendor":"Acme Corp","invoice_number":"INV-2024-8821","amount":87500,"currency":"USD","date":"2026-04-15","approver_name":null,"signature_present":false}';
    if (span.agentName === "Validator")
      return '[{"control_id":"R1","violated":true,"confidence":0.91},{"control_id":"R2","violated":true,"confidence":0.88},{"control_id":"R3","violated":true,"confidence":0.90}]';
    if (span.agentName === "Classifier")
      return '[{"finding_id":"F1","risk":"High"},{"finding_id":"F2","risk":"Medium"},{"finding_id":"F3","risk":"High"}]';
    return '[{"finding_id":"F1","approved":true,"critic_note":"Accepted with minor wording change."}]';
  })();

  const miniCost = ((span.inputTokens * 0.15 + span.outputTokens * 0.6) / 1_000_000).toFixed(6);
  const miniLatency = Math.round(span.latencyMs * 0.52);

  const startReplay = () => {
    setReplaying(true);
    setTimeout(() => {
      setReplaying(false);
      setDone(true);
    }, 2200);
  };

  const originalCostFormatted = `$${span.costUsd.toFixed(4)}`;
  const miniCostFormatted = `$${Number(miniCost).toFixed(4)}`;
  const savings = ((1 - Number(miniCost) / span.costUsd) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">
              Replay Span — {span.agentName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Re-run same prompt with <strong>gpt-4o-mini</strong> to compare cost, quality, and latency
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!done && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
              <strong>Demo insight:</strong> Not every step needs the most expensive model. gpt-4o-mini costs ~40× less than gpt-4o for structured extraction tasks with comparable accuracy.
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 text-white text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                Original · gpt-4o
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tokens</span>
                  <span className="font-mono font-medium">{span.totalTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cost</span>
                  <span className="font-mono font-medium">{originalCostFormatted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Latency</span>
                  <span className="font-mono font-medium">{span.latencyMs.toLocaleString()} ms</span>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Output</div>
                  <pre className="bg-slate-50 rounded p-2 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-32 border border-slate-100">{span.outputJson}</pre>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-100 text-slate-700 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Replay · gpt-4o-mini
              </div>
              <div className="p-4 space-y-3">
                {!done && !replaying && (
                  <div className="flex items-center justify-center h-32">
                    <button
                      onClick={startReplay}
                      className="px-5 py-2.5 rounded-lg text-white text-sm font-medium"
                      style={{ backgroundColor: NAVY }}
                    >
                      Run Replay
                    </button>
                  </div>
                )}
                {replaying && (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500">Calling gpt-4o-mini…</p>
                    </div>
                  </div>
                )}
                {done && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Tokens</span>
                      <span className="font-mono font-medium">{span.totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Cost</span>
                      <span className="font-mono font-medium text-emerald-600">{miniCostFormatted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Latency</span>
                      <span className="font-mono font-medium text-emerald-600">{miniLatency.toLocaleString()} ms</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Output</div>
                      <pre className="bg-slate-50 rounded p-2 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-32 border border-slate-100">{mockMiniOutput}</pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {done && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-700">{savings}%</div>
                <div className="text-xs text-emerald-600 mt-0.5">Cost reduction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-700">~{Math.round((1 - miniLatency / span.latencyMs) * 100)}%</div>
                <div className="text-xs text-emerald-600 mt-0.5">Faster</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">≈ same</div>
                <div className="text-xs text-slate-500 mt-0.5">Output quality</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpanRow({ span, totalDurationMs }: { span: SpanData; totalDurationMs: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const color = AGENT_COLORS[span.agentName] ?? "#6B7280";

  return (
    <>
      {showContext && (
        <ContextWindowModal span={span} onClose={() => setShowContext(false)} />
      )}
      {showReplay && (
        <ReplayModal span={span} onClose={() => setShowReplay(false)} />
      )}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        >
          <span
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-slate-900 w-24 shrink-0">
            {span.agentName}
          </span>
          <span className="text-xs text-slate-400 font-mono w-24 shrink-0">
            {span.model}
          </span>
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <div className="flex h-2.5 rounded overflow-hidden w-full max-w-xs">
              <div
                className="bg-blue-700"
                style={{
                  width: `${(span.tokenBreakdown.systemPrompt / span.totalTokens) * 100}%`,
                }}
                title="System prompt"
              />
              <div
                className="bg-blue-400"
                style={{
                  width: `${(span.tokenBreakdown.userMessage / span.totalTokens) * 100}%`,
                }}
                title="User message"
              />
              <div
                className="bg-emerald-500"
                style={{
                  width: `${(span.tokenBreakdown.output / span.totalTokens) * 100}%`,
                }}
                title="Output"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono shrink-0 ml-2">
              {span.totalTokens.toLocaleString()} tok
            </span>
          </div>
          <span className="text-xs text-slate-700 font-mono w-16 shrink-0 text-right">
            ${span.costUsd.toFixed(4)}
          </span>
          <span className="text-xs text-slate-500 font-mono w-20 shrink-0 text-right">
            {span.latencyMs.toLocaleString()} ms
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              span.status === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {span.status}
          </span>
          <span className="text-slate-400 text-sm shrink-0 ml-2">
            {expanded ? "▲" : "▼"}
          </span>
        </button>

        {expanded && (
          <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 space-y-4">
            <TokenBreakdownBar breakdown={span.tokenBreakdown} totalTokens={span.totalTokens} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Input (first 300 chars)
                </div>
                <pre className="bg-white rounded-lg border border-slate-200 p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap">
                  {span.inputSummary}
                </pre>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Output
                </div>
                <pre className="bg-white rounded-lg border border-slate-200 p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {span.outputSummary}
                </pre>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Reasoning Summary
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-sm text-slate-700 italic">
                "{span.reasoningSummary}"
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowContext(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-white transition-colors"
              >
                <span>👁</span>
                What did the agent see?
              </button>
              <button
                onClick={() => setShowReplay(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-white transition-colors"
                style={{ backgroundColor: NAVY, borderColor: NAVY }}
              >
                <span>↻</span>
                Re-run with gpt-4o-mini
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function WaterfallChart({ spans, totalMs }: { spans: SpanData[]; totalMs: number }) {
  if (spans.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Waterfall · {totalMs.toLocaleString()} ms total
      </div>
      <div className="space-y-2">
        {spans.map((s) => {
          const leftPct = (s.startOffset / totalMs) * 100;
          const widthPct = Math.max((s.durationMs / totalMs) * 100, 2);
          const color = AGENT_COLORS[s.agentName] ?? "#6B7280";
          return (
            <div key={s.spanId} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20 shrink-0">{s.agentName}</span>
              <div className="flex-1 relative h-6 bg-slate-100 rounded">
                <div
                  className="absolute h-full rounded flex items-center px-2"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: color,
                  }}
                >
                  <span className="text-white text-xs font-mono whitespace-nowrap overflow-hidden">
                    {s.latencyMs}ms
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono w-16 shrink-0 text-right">
                ${s.costUsd.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-1 ml-[92px]">
        <span>0 ms</span>
        <span>{totalMs.toLocaleString()} ms</span>
      </div>
    </div>
  );
}

function CostPieChart({ spans }: { spans: SpanData[] }) {
  const data = spans.map((s) => ({
    name: s.agentName,
    value: parseFloat(s.costUsd.toFixed(5)),
    color: AGENT_COLORS[s.agentName] ?? "#6B7280",
  }));

  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Cost Attribution by Agent
      </div>
      <div className="flex items-center gap-6">
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={62}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(val: number) => [`$${val.toFixed(5)}`, "Cost"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-sm text-slate-700">{d.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  ${d.value.toFixed(5)}
                </span>
                <span className="text-xs font-medium text-slate-700 w-10 text-right">
                  {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
            <span className="text-slate-500">Total</span>
            <span className="font-mono font-semibold">${total.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TraceExplorer() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem>(MOCK_DOCUMENTS[0]);

  const spans = selectedDoc.spans;
  const totalMs =
    spans.length > 0
      ? spans[spans.length - 1].startOffset + spans[spans.length - 1].durationMs
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-[system-ui,sans-serif]">
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-base">Audit Evidence Review Assistant</span>
          <span className="text-slate-400 text-sm">·</span>
          <span className="text-slate-300 text-sm">Trace Explorer</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Live
        </div>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        <div className="w-80 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Documents · {MOCK_DOCUMENTS.length}
            </div>
          </div>
          {MOCK_DOCUMENTS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                selectedDoc.id === doc.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-slate-800 font-medium leading-tight break-all">
                  {doc.name}
                </span>
                <span
                  className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style={{
                    backgroundColor:
                      doc.status === "error"
                        ? "#6B7280"
                        : RISK[doc.riskLevel],
                  }}
                >
                  {doc.status === "error" ? "Error" : doc.riskLevel}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span>{doc.findingCount} findings</span>
                <span>·</span>
                <span>${doc.totalCost.toFixed(4)}</span>
                <span>·</span>
                <span>{doc.totalTokens.toLocaleString()} tok</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {new Date(doc.uploadedAt).toLocaleTimeString()}
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedDoc.spans.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <div className="text-4xl mb-3">
                  {selectedDoc.status === "error" ? "⚠" : "○"}
                </div>
                <div className="text-sm">
                  {selectedDoc.status === "error"
                    ? "Document parse failed — no trace available"
                    : "No trace data for this document"}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900">{selectedDoc.name}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  <span>{spans.length} spans</span>
                  <span>·</span>
                  <span>{selectedDoc.totalTokens.toLocaleString()} tokens</span>
                  <span>·</span>
                  <span>${selectedDoc.totalCost.toFixed(4)} total cost</span>
                  <span>·</span>
                  <span>{totalMs.toLocaleString()} ms</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                <WaterfallChart spans={spans} totalMs={totalMs} />
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <CostPieChart spans={spans} />
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Span Tree
                </div>
                <div className="flex gap-4 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-700 inline-block" />System prompt</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />User message</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />Output</span>
                </div>
              </div>
              {spans.map((s) => (
                <SpanRow key={s.spanId} span={s} totalDurationMs={totalMs} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

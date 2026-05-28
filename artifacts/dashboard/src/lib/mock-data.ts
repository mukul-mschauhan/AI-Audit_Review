export const NAVY = "#0B2545";

export const RISK_COLORS = {
  Critical: "#B91C1C",
  High: "#EA580C",
  Medium: "#CA8A04",
  Low: "#16A34A",
};

export const AGENT_COLORS: Record<string, string> = {
  Extractor: "#2563EB",
  Validator: "#7C3AED",
  Classifier: "#0891B2",
  Critic: "#059669",
};

export interface Span {
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
  systemPromptTokens: number;
  userMessageTokens: number;
  systemPrompt: string;
  userMessage: string;
  retrievalChunks: string[];
  inputSummary: string;
  outputSummary: string;
  outputJson: string;
  reasoningSummary: string;
}

export interface Finding {
  id: string;
  controlId: string;
  risk: "Critical" | "High" | "Medium" | "Low";
  finding: string;
  impact: string;
  recommendation: string;
  criticNote?: string;
  spanChain: string[];
  flaggedForReview: boolean;
  confidence: number;
}

export interface Document {
  id: string;
  name: string;
  type: "pdf" | "docx" | "xlsx" | "image";
  uploadedAt: string;
  status: "completed" | "error" | "processing";
  totalCost: number;
  totalTokens: number;
  findings: Finding[];
  spans: Span[];
  errorMessage?: string;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
}

const makeSpans = (
  agents: { name: string; model: string; inputTok: number; outputTok: number; latency: number; sysRatio: number; summary: string; outputJson: string; userMsg: string; sysPrompt: string; chunks?: string[] }[]
): Span[] => {
  let offset = 0;
  return agents.map((a, i) => {
    const span: Span = {
      spanId: `sp-${Math.random().toString(36).slice(2, 8)}`,
      agentName: a.name,
      model: a.model,
      inputTokens: a.inputTok,
      outputTokens: a.outputTok,
      totalTokens: a.inputTok + a.outputTok,
      costUsd: a.model === "gpt-4o"
        ? (a.inputTok * 2.5 + a.outputTok * 10) / 1_000_000
        : (a.inputTok * 0.15 + a.outputTok * 0.6) / 1_000_000,
      latencyMs: a.latency,
      status: "success",
      startOffset: offset,
      durationMs: a.latency,
      systemPromptTokens: Math.round(a.inputTok * a.sysRatio),
      userMessageTokens: Math.round(a.inputTok * (1 - a.sysRatio)),
      systemPrompt: a.sysPrompt,
      userMessage: a.userMsg,
      retrievalChunks: a.chunks ?? [],
      inputSummary: a.userMsg.slice(0, 280),
      outputSummary: a.outputJson.slice(0, 320),
      outputJson: a.outputJson,
      reasoningSummary: a.summary,
    };
    offset += a.latency;
    return span;
  });
};

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-001",
    name: "Acme_Corp_Invoice_87500.pdf",
    type: "pdf",
    uploadedAt: "2026-05-25T09:12:00Z",
    status: "completed",
    riskLevel: "High",
    totalCost: 0,
    totalTokens: 0,
    findings: [
      { id: "f1", controlId: "R1", risk: "High", finding: "Invoice INV-2024-8821 for $87,500 processed without required approver authorisation.", impact: "Unauthorised disbursement of $87,500 with no accountability chain.", recommendation: "Implement mandatory approval workflow gate for invoices exceeding $50,000.", criticNote: "Fully supported by evidence.", spanChain: [], flaggedForReview: false, confidence: 0.98 },
      { id: "f2", controlId: "R2", risk: "High", finding: "Invoice lacks required authorised signature.", impact: "Document validity cannot be confirmed for audit trail.", recommendation: "Enforce e-signature at point of submission.", criticNote: "Reclassified Medium→High. Missing signature on invoice >$50K is High per Policy 4.2.", spanChain: [], flaggedForReview: false, confidence: 0.95 },
      { id: "f3", controlId: "R3", risk: "High", finding: "Invoice amount $87,500 exceeds contract maximum $75,000.", impact: "Potential over-procurement outside contracted scope.", recommendation: "Block payment pending contract amendment or secondary approval.", criticNote: "Amount evidence clear. Recommendation adequate.", spanChain: [], flaggedForReview: false, confidence: 0.97 },
    ],
    spans: makeSpans([
      { name: "Extractor", model: "gpt-4o", inputTok: 1820, outputTok: 420, latency: 1240, sysRatio: 0.60, summary: "Identified vendor 'Acme Corp', invoice $87,500 above approval threshold. Approver field blank. Signature absent.", outputJson: '{"vendor":"Acme Corp","invoice_number":"INV-2024-8821","amount":87500,"currency":"USD","date":"2026-04-15","approver_name":null,"signature_present":false,"contract_id":"C-2022-114"}', userMsg: "Extract entities from: ACME CORP Invoice No: INV-2024-8821, Date: 2026-04-15, Amount: $87,500 USD, Approver: [BLANK], Contract: C-2022-114, Signature: [ABSENT]", sysPrompt: "You are an expert document extractor for Big 4 audit workflows. Extract structured entities and return valid JSON.", chunks: [] },
      { name: "Validator", model: "gpt-4o", inputTok: 1640, outputTok: 380, latency: 980, sysRatio: 0.60, summary: "Three control violations: R1 missing approval, R2 missing signature, R3 threshold breach vs contract ceiling $75K.", outputJson: '[{"control_id":"R1","violated":true,"evidence_quote":"approver_name: null, amount: 87500","confidence":0.98},{"control_id":"R2","violated":true,"evidence_quote":"signature_present: false","confidence":0.95},{"control_id":"R3","violated":true,"evidence_quote":"invoice $87,500 exceeds contract max $75,000","confidence":0.97}]', userMsg: 'Validate entities against control rules. Entities: {"vendor":"Acme Corp","amount":87500,"approver":null}. Retrieved contract: {"max_value":75000,"end_date":"2026-12-31"}', sysPrompt: "You are an audit control validator. Check each of the 5 control rules and return violations with evidence.", chunks: ['Contract C-2022-114: {"max_value":75000,"end_date":"2026-12-31","status":"active"}', 'Prior invoices for Acme Corp: INV-2024-8800 ($42,000) — no duplicate found'] },
      { name: "Classifier", model: "gpt-4o", inputTok: 1280, outputTok: 520, latency: 1420, sysRatio: 0.59, summary: "R1 and R3 classified High due to financial exposure; R2 initially Medium as procedural.", outputJson: '[{"finding_id":"F1","control_id":"R1","risk":"High","finding":"Invoice processed without required approver."},{"finding_id":"F2","control_id":"R2","risk":"Medium","finding":"Invoice lacks signature."},{"finding_id":"F3","control_id":"R3","risk":"High","finding":"Amount exceeds contract max."}]', userMsg: "Draft findings for 3 violations: R1 (no approver, $87.5K), R2 (no signature), R3 ($87.5K > contract $75K).", sysPrompt: "You are a Big 4 audit risk classifier. Classify violations and draft audit observations in house style.", chunks: [] },
      { name: "Critic", model: "gpt-4o", inputTok: 1640, outputTok: 540, latency: 1680, sysRatio: 0.56, summary: "Critic approved F1 and F3. Upgraded F2 to High citing Policy 4.2 — signature absence on high-value invoices.", outputJson: '[{"finding_id":"F1","risk":"High","approved":true},{"finding_id":"F2","risk":"High","approved":true,"critic_note":"Reclassified Medium→High per Policy 4.2"},{"finding_id":"F3","risk":"High","approved":true}]', userMsg: "Review draft findings against original entities. Entities: {vendor: Acme, amount: 87500, approver: null, signature: false}", sysPrompt: "You are a senior audit critic. Review findings against evidence. Flag unsupported, over-classified, or incomplete findings.", chunks: [] },
    ]),
  },
  {
    id: "doc-002",
    name: "Meridian_Contract_Expired.docx",
    type: "docx",
    uploadedAt: "2026-05-25T10:45:00Z",
    status: "completed",
    riskLevel: "Medium",
    totalCost: 0,
    totalTokens: 0,
    findings: [
      { id: "f4", controlId: "R4", risk: "Medium", finding: "Invoice INV-2024-7742 raised 91 days after contract C-2021-088 expiry (2025-12-31).", impact: "Payment may be unauthorised without a valid contract in force.", recommendation: "Obtain retrospective contract extension or reject payment.", criticNote: "Classification and evidence proportionate.", spanChain: [], flaggedForReview: false, confidence: 0.99 },
    ],
    spans: makeSpans([
      { name: "Extractor", model: "gpt-4o", inputTok: 1420, outputTok: 380, latency: 1100, sysRatio: 0.77, summary: "Extracted entities for Meridian Solutions. Contract C-2021-088 noted.", outputJson: '{"vendor":"Meridian Solutions","invoice_number":"INV-2024-7742","amount":42000,"date":"2026-03-01","contract_id":"C-2021-088","approver_name":"J.Walsh","signature_present":true}', userMsg: "Extract entities from: MERIDIAN SOLUTIONS, Invoice INV-2024-7742, Date: 2026-03-01, Amount: $42,000, Contract C-2021-088, Approver: J.Walsh.", sysPrompt: "You are an expert document extractor for Big 4 audit workflows.", chunks: [] },
      { name: "Validator", model: "gpt-4o", inputTok: 1280, outputTok: 290, latency: 890, sysRatio: 0.77, summary: "Single R4 violation: invoice raised 91 days after contract expiry 2025-12-31.", outputJson: '[{"control_id":"R4","violated":true,"evidence_quote":"invoice 2026-03-01 > contract end 2025-12-31","confidence":0.99}]', userMsg: 'Validate entities. Retrieved contract: {"C-2021-088":{"end_date":"2025-12-31","status":"expired"}}', sysPrompt: "You are an audit control validator.", chunks: ['Contract C-2021-088: {"end_date":"2025-12-31","status":"expired","vendor":"Meridian Solutions"}'] },
      { name: "Classifier", model: "gpt-4o-mini", inputTok: 980, outputTok: 340, latency: 620, sysRatio: 0.65, summary: "R4 classified Medium. No financial threshold breach, but contractual risk.", outputJson: '[{"finding_id":"F1","control_id":"R4","risk":"Medium","finding":"Invoice raised 91 days after contract expiry.","impact":"Payment without valid contract.","recommendation":"Obtain retrospective extension or reject."}]', userMsg: "Draft finding for R4 violation: invoice 2026-03-01 after contract expiry 2025-12-31.", sysPrompt: "You are a Big 4 audit risk classifier.", chunks: [] },
      { name: "Critic", model: "gpt-4o-mini", inputTok: 1120, outputTok: 310, latency: 580, sysRatio: 0.64, summary: "Critic approved without changes. Evidence clear and proportionate.", outputJson: '[{"finding_id":"F1","risk":"Medium","approved":true,"critic_note":"Classification and evidence proportionate."}]', userMsg: "Review draft finding for R4 violation.", sysPrompt: "You are a senior audit critic.", chunks: [] },
    ]),
  },
  {
    id: "doc-003",
    name: "GlobalPay_Duplicate_Invoice.pdf",
    type: "pdf",
    uploadedAt: "2026-05-24T16:30:00Z",
    status: "completed",
    riskLevel: "Critical",
    totalCost: 0,
    totalTokens: 0,
    findings: [
      { id: "f5", controlId: "R5", risk: "Critical", finding: "Invoice INV-2023-4410 from GlobalPay was already processed on 2023-11-14 (Trace ID: a3f2b1).", impact: "Duplicate payment of $124,000 — potential fraud or system failure.", recommendation: "Freeze payment immediately. Initiate duplicate payment investigation. Escalate to CFO.", criticNote: "Confirmed by database lookup. Critical classification appropriate.", spanChain: [], flaggedForReview: true, confidence: 0.99 },
    ],
    spans: makeSpans([
      { name: "Extractor", model: "gpt-4o", inputTok: 1540, outputTok: 410, latency: 1180, sysRatio: 0.71, summary: "Extracted INV-2023-4410 from GlobalPay for $124,000.", outputJson: '{"vendor":"GlobalPay Ltd","invoice_number":"INV-2023-4410","amount":124000,"date":"2026-01-08","approver_name":"M.Chen","signature_present":true}', userMsg: "Extract entities from GlobalPay invoice.", sysPrompt: "You are an expert document extractor.", chunks: [] },
      { name: "Validator", model: "gpt-4o", inputTok: 1620, outputTok: 350, latency: 1020, sysRatio: 0.68, summary: "R5 violation: INV-2023-4410 already in database for GlobalPay.", outputJson: '[{"control_id":"R5","violated":true,"evidence_quote":"INV-2023-4410 already processed 2023-11-14 for $124,000","confidence":0.99}]', userMsg: "Validate. DB lookup found existing INV-2023-4410 for GlobalPay.", sysPrompt: "You are an audit control validator.", chunks: ['Prior invoices: {"INV-2023-4410":{"processed":"2023-11-14","amount":124000,"status":"paid"}}'] },
      { name: "Classifier", model: "gpt-4o", inputTok: 1100, outputTok: 480, latency: 1350, sysRatio: 0.63, summary: "R5 duplicate classified Critical — confirmed duplicate payment of $124K.", outputJson: '[{"finding_id":"F1","control_id":"R5","risk":"Critical","finding":"Duplicate invoice — already paid 2023-11-14."}]', userMsg: "Classify R5 duplicate violation. Amount $124,000.", sysPrompt: "You are a Big 4 audit risk classifier.", chunks: [] },
      { name: "Critic", model: "gpt-4o", inputTok: 1380, outputTok: 490, latency: 1560, sysRatio: 0.67, summary: "Critical confirmed. Flagged for human review given financial magnitude.", outputJson: '[{"finding_id":"F1","risk":"Critical","approved":true,"critic_note":"Critical appropriate. $124K duplicate. Flagging for mandatory human review.","flag_for_review":true}]', userMsg: "Review Critical R5 finding for GlobalPay $124K duplicate.", sysPrompt: "You are a senior audit critic.", chunks: [] },
    ]),
  },
  {
    id: "doc-004",
    name: "Sunrise_Partners_Clean.pdf",
    type: "pdf",
    uploadedAt: "2026-05-24T11:00:00Z",
    status: "completed",
    riskLevel: "Low",
    totalCost: 0,
    totalTokens: 0,
    findings: [],
    spans: makeSpans([
      { name: "Extractor", model: "gpt-4o", inputTok: 1380, outputTok: 390, latency: 1080, sysRatio: 0.80, summary: "Clean invoice extraction. All fields present.", outputJson: '{"vendor":"Sunrise Partners","invoice_number":"INV-2026-1122","amount":28000,"approver_name":"D.Okafor","signature_present":true,"contract_id":"C-2025-220"}', userMsg: "Extract entities from Sunrise Partners invoice.", sysPrompt: "You are an expert document extractor.", chunks: [] },
      { name: "Validator", model: "gpt-4o", inputTok: 1190, outputTok: 260, latency: 820, sysRatio: 0.82, summary: "No control violations detected. All 5 rules passed.", outputJson: '[{"control_id":"R1","violated":false},{"control_id":"R2","violated":false},{"control_id":"R3","violated":false},{"control_id":"R4","violated":false},{"control_id":"R5","violated":false}]', userMsg: "Validate clean invoice from Sunrise Partners.", sysPrompt: "You are an audit control validator.", chunks: [] },
      { name: "Classifier", model: "gpt-4o-mini", inputTok: 820, outputTok: 180, latency: 420, sysRatio: 0.78, summary: "No findings to draft. Document passed all controls.", outputJson: '[]', userMsg: "No violations detected. No findings needed.", sysPrompt: "You are a Big 4 audit risk classifier.", chunks: [] },
      { name: "Critic", model: "gpt-4o-mini", inputTok: 890, outputTok: 160, latency: 390, sysRatio: 0.79, summary: "Confirmed clean. No issues with analysis.", outputJson: '{"approved_findings":[],"critic_notes":"Clean document. No findings. Analysis correct."}', userMsg: "Review: no findings for Sunrise Partners.", sysPrompt: "You are a senior audit critic.", chunks: [] },
    ]),
  },
  {
    id: "doc-005",
    name: "TechBridge_Missing_Sig.docx",
    type: "docx",
    uploadedAt: "2026-05-23T15:20:00Z",
    status: "completed",
    riskLevel: "Medium",
    totalCost: 0,
    totalTokens: 0,
    findings: [
      { id: "f6", controlId: "R2", risk: "Medium", finding: "Contract amendment for TechBridge Ltd lacks required authorised signature.", impact: "Unenforceability of amendment terms. Potential dispute.", recommendation: "Obtain signature before processing associated invoices.", criticNote: "Appropriately classified Medium for contract document.", spanChain: [], flaggedForReview: false, confidence: 0.92 },
    ],
    spans: makeSpans([
      { name: "Extractor", model: "gpt-4o", inputTok: 1290, outputTok: 350, latency: 990, sysRatio: 0.85, summary: "Contract amendment, TechBridge. Signature field blank.", outputJson: '{"vendor":"TechBridge Ltd","document_type":"contract_amendment","amount":55000,"signature_present":false,"approver_name":"L.Patel"}', userMsg: "Extract entities from TechBridge contract amendment.", sysPrompt: "You are an expert document extractor.", chunks: [] },
      { name: "Validator", model: "gpt-4o", inputTok: 1140, outputTok: 270, latency: 860, sysRatio: 0.86, summary: "R2 violation: contract amendment lacks signature.", outputJson: '[{"control_id":"R2","violated":true,"evidence_quote":"signature_present: false on contract_amendment","confidence":0.92}]', userMsg: "Validate TechBridge contract. R2 check: signature.", sysPrompt: "You are an audit control validator.", chunks: [] },
      { name: "Classifier", model: "gpt-4o-mini", inputTok: 890, outputTok: 310, latency: 540, sysRatio: 0.71, summary: "R2 classified Medium for contract document (not high-value invoice).", outputJson: '[{"finding_id":"F1","control_id":"R2","risk":"Medium","finding":"Contract amendment lacks required signature."}]', userMsg: "Classify R2 on contract amendment, amount $55K.", sysPrompt: "You are a Big 4 audit risk classifier.", chunks: [] },
      { name: "Critic", model: "gpt-4o-mini", inputTok: 1010, outputTok: 280, latency: 510, sysRatio: 0.73, summary: "Medium appropriate for contract document. Approved.", outputJson: '[{"finding_id":"F1","risk":"Medium","approved":true}]', userMsg: "Review R2 Medium finding for TechBridge contract.", sysPrompt: "You are a senior audit critic.", chunks: [] },
    ]),
  },
  {
    id: "doc-006",
    name: "Threshold_Breach_Controlled.xlsx",
    type: "xlsx",
    uploadedAt: "2026-05-23T09:10:00Z",
    status: "completed",
    riskLevel: "Low",
    totalCost: 0,
    totalTokens: 0,
    findings: [
      { id: "f7", controlId: "R3", risk: "Low", finding: "Invoice amount $82,000 exceeds single-tier limit but dual approval chain present.", impact: "Controlled breach — secondary approval by CFO documented.", recommendation: "No action required. Document dual approval for audit evidence.", criticNote: "Low appropriate — mitigation in place. Would be High without dual approval.", spanChain: [], flaggedForReview: false, confidence: 0.88 },
    ],
    spans: makeSpans([
      { name: "Extractor", model: "gpt-4o", inputTok: 1450, outputTok: 400, latency: 1110, sysRatio: 0.76, summary: "Invoice $82K with dual approval chain (CFO sign-off noted).", outputJson: '{"vendor":"Pinnacle Systems","amount":82000,"approver_name":"A.Singh","secondary_approver":"CFO-D.Kim","signature_present":true,"contract_id":"C-2024-051"}', userMsg: "Extract from Threshold Breach invoice with chained approvals.", sysPrompt: "You are an expert document extractor.", chunks: [] },
      { name: "Validator", model: "gpt-4o", inputTok: 1290, outputTok: 310, latency: 930, sysRatio: 0.74, summary: "R3 triggers ($82K > $75K limit) but dual approval chain documented.", outputJson: '[{"control_id":"R3","violated":true,"evidence_quote":"$82,000 > contract max $75,000 but CFO dual-approval present","confidence":0.88,"mitigating_factor":"dual_approval"}]', userMsg: "Validate Pinnacle invoice. Contract max $75K, but CFO approval noted.", sysPrompt: "You are an audit control validator.", chunks: ['Contract C-2024-051: {"max_value":75000,"dual_approval_allowed":true}'] },
      { name: "Classifier", model: "gpt-4o-mini", inputTok: 870, outputTok: 290, latency: 510, sysRatio: 0.69, summary: "R3 classified Low due to documented dual-approval mitigation.", outputJson: '[{"finding_id":"F1","risk":"Low","finding":"Threshold breach with CFO dual-approval documented."}]', userMsg: "Classify R3 with mitigating dual-approval factor.", sysPrompt: "You are a Big 4 audit risk classifier.", chunks: [] },
      { name: "Critic", model: "gpt-4o-mini", inputTok: 960, outputTok: 270, latency: 490, sysRatio: 0.71, summary: "Low appropriate with dual approval. Noted it would be High without.", outputJson: '[{"finding_id":"F1","risk":"Low","approved":true,"critic_note":"Would be High without dual approval — correctly Low with CFO sign-off."}]', userMsg: "Review Low R3 finding with dual-approval context.", sysPrompt: "You are a senior audit critic.", chunks: [] },
    ]),
  },
  {
    id: "doc-007",
    name: "Corrupt_PDF_Parse_Failure.pdf",
    type: "pdf",
    uploadedAt: "2026-05-22T14:10:00Z",
    status: "error",
    riskLevel: "Low",
    errorMessage: "PDF parse failure: File appears to be password-protected or corrupt. Unable to extract text layer. Span ID: parse-0f3a2b. Manual review required.",
    totalCost: 0.0,
    totalTokens: 0,
    findings: [],
    spans: [],
  },
  {
    id: "doc-008",
    name: "Reflection_Override_Demo.pdf",
    type: "pdf",
    uploadedAt: "2026-05-22T10:30:00Z",
    status: "completed",
    riskLevel: "High",
    totalCost: 0,
    totalTokens: 0,
    findings: [
      { id: "f8", controlId: "R1", risk: "High", finding: "Invoice INV-2025-9901 for $67,000 lacks approver field — Critic upgraded from Medium to High.", impact: "High-value invoice disbursed without authorisation record.", recommendation: "Trace approval chain. Suspend payment pending investigation.", criticNote: "Critic reclassified Medium→High. Original amount justified High classification per Policy 3.1. Classifier underweighted financial threshold.", spanChain: [], flaggedForReview: true, confidence: 0.87 },
    ],
    spans: makeSpans([
      { name: "Extractor", model: "gpt-4o", inputTok: 1510, outputTok: 420, latency: 1190, sysRatio: 0.73, summary: "Invoice $67K, approver absent. Signature present.", outputJson: '{"vendor":"Vertex Analytics","invoice_number":"INV-2025-9901","amount":67000,"approver_name":null,"signature_present":true,"contract_id":"C-2024-188"}', userMsg: "Extract entities from Vertex Analytics invoice.", sysPrompt: "You are an expert document extractor.", chunks: [] },
      { name: "Validator", model: "gpt-4o", inputTok: 1380, outputTok: 310, latency: 960, sysRatio: 0.72, summary: "R1 violation: $67K invoice with no approver.", outputJson: '[{"control_id":"R1","violated":true,"evidence_quote":"approver_name: null, amount: 67000","confidence":0.87}]', userMsg: "Validate: amount $67K, approver null.", sysPrompt: "You are an audit control validator.", chunks: [] },
      { name: "Classifier", model: "gpt-4o", inputTok: 1210, outputTok: 480, latency: 1310, sysRatio: 0.66, summary: "INITIAL: Classifier drafted R1 as Medium — underweighted financial amount.", outputJson: '[{"finding_id":"F1","control_id":"R1","risk":"Medium","finding":"Invoice lacks approver for $67,000 payment."}]', userMsg: "Classify R1 on $67K invoice without approver.", sysPrompt: "You are a Big 4 audit risk classifier.", chunks: [] },
      { name: "Critic", model: "gpt-4o", inputTok: 1490, outputTok: 560, latency: 1720, sysRatio: 0.68, summary: "CRITIC OVERRIDE: Reclassified Medium→High. Policy 3.1: any invoice >$50K without approver is High.", outputJson: '[{"finding_id":"F1","risk":"High","approved":true,"critic_note":"Reclassified Medium→High. Policy 3.1 mandates High for approver-less invoices >$50K. Classifier underweighted threshold.","original_risk":"Medium","overridden":true}]', userMsg: "Review: Classifier said Medium for $67K no-approver invoice. Original entities show amount 67000 > 50000 threshold.", sysPrompt: "You are a senior audit critic. Policy 3.1: invoices >$50K without approver MUST be High.", chunks: [] },
    ]),
  },
];

// Compute totalCost and totalTokens from spans
MOCK_DOCUMENTS.forEach((doc) => {
  doc.totalCost = doc.spans.reduce((a, s) => a + s.costUsd, 0);
  doc.totalTokens = doc.spans.reduce((a, s) => a + s.totalTokens, 0);
});

export const COST_TREND = Array.from({ length: 20 }, (_, i) => ({
  label: `Doc ${i + 1}`,
  cost: parseFloat((0.012 + Math.random() * 0.05).toFixed(4)),
}));

export const GOVERNANCE_QUEUE = MOCK_DOCUMENTS.flatMap((doc) =>
  doc.findings
    .filter((f) => f.flaggedForReview)
    .map((f) => ({
      docName: doc.name,
      docId: doc.id,
      findingId: f.id,
      finding: f.finding,
      risk: f.risk,
      flaggedBy: f.criticNote?.includes("Critic") ? "Critic Agent" : "Low confidence",
      confidence: f.confidence,
      status: "pending" as const,
    }))
);

export const AUDIT_LOG = [
  { ts: "2026-05-25T09:12:00Z", user: "admin@firm.com", action: "UPLOAD", detail: "Acme_Corp_Invoice_87500.pdf" },
  { ts: "2026-05-25T09:12:04Z", user: "system", action: "ANALYZE_START", detail: "Trace 3f2a1b — Acme Corp" },
  { ts: "2026-05-25T09:12:10Z", user: "system", action: "ANALYZE_COMPLETE", detail: "3 findings generated, 1 Critic override" },
  { ts: "2026-05-25T10:45:00Z", user: "admin@firm.com", action: "UPLOAD", detail: "Meridian_Contract_Expired.docx" },
  { ts: "2026-05-25T10:45:06Z", user: "system", action: "ANALYZE_COMPLETE", detail: "1 finding generated" },
  { ts: "2026-05-24T16:30:00Z", user: "j.walsh@firm.com", action: "UPLOAD", detail: "GlobalPay_Duplicate_Invoice.pdf" },
  { ts: "2026-05-24T16:30:08Z", user: "system", action: "ANALYZE_COMPLETE", detail: "1 Critical finding — flagged for review" },
  { ts: "2026-05-24T16:35:11Z", user: "j.walsh@firm.com", action: "VIEW_TRACE", detail: "GlobalPay doc-003" },
  { ts: "2026-05-24T16:38:22Z", user: "j.walsh@firm.com", action: "EXPORT_PDF", detail: "GlobalPay audit report exported" },
  { ts: "2026-05-22T14:10:00Z", user: "admin@firm.com", action: "UPLOAD", detail: "Corrupt_PDF_Parse_Failure.pdf" },
  { ts: "2026-05-22T14:10:03Z", user: "system", action: "PARSE_ERROR", detail: "File corrupt or password-protected" },
];

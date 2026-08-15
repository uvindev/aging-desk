export type InvoiceStatus = "open" | "disputed" | "promised" | "paid" | "void";

export type Invoice = {
  rowNumber: number;
  invoiceId: string;
  client: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: string;
  owner: string;
  status: InvoiceStatus;
  promiseDate: string | null;
};

export type ImportIssue = {
  rule: "AR001";
  rowNumber: number;
  message: string;
};

export type Finding = {
  rule: "AR001" | "AR002" | "AR003" | "AR004" | "AR005" | "AR006" | "AR007";
  severity: "critical" | "high" | "medium";
  invoiceId: string | null;
  message: string;
  repair: string;
};

export type QueueState =
  | "hold"
  | "breach"
  | "critical"
  | "high"
  | "follow-up"
  | "due-soon"
  | "scheduled";

export type QueueRow = Invoice & {
  daysPastDue: number;
  state: QueueState;
  nextAction: string;
};

export type AgingBucket = {
  currency: string;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  daysOver90: number;
  total: number;
};

export type CurrencyTotal = {
  currency: string;
  amount: number;
};

export type AnalysisResult = {
  signal: "review" | "assign" | "current";
  referenceDate: string;
  importedRows: number;
  excludedRows: number;
  invalidRows: number;
  activeInvoices: number;
  overdueInvoices: number;
  unassignedInvoices: number;
  totals: CurrencyTotal[];
  aging: AgingBucket[];
  queue: QueueRow[];
  findings: Finding[];
};

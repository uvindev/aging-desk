/**
 * @project  AgingDesk — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  Proprietary — all rights reserved
 */

import type {
  AgingBucket,
  AnalysisResult,
  Finding,
  ImportIssue,
  Invoice,
  QueueRow,
  QueueState,
} from "@/lib/ar/types";

const DAY = 86_400_000;
const STATE_ORDER: Record<QueueState, number> = {
  breach: 0,
  critical: 1,
  high: 2,
  "follow-up": 3,
  hold: 4,
  "due-soon": 5,
  scheduled: 6,
};

function utcDate(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`);
}

export function daysPastDue(dueDate: string, referenceDate: string): number {
  return Math.floor((utcDate(referenceDate) - utcDate(dueDate)) / DAY);
}

function queueState(
  invoice: Invoice,
  age: number,
  referenceDate: string,
): QueueState {
  if (invoice.status === "disputed") return "hold";
  if (
    invoice.promiseDate &&
    utcDate(invoice.promiseDate) < utcDate(referenceDate)
  ) {
    return "breach";
  }
  if (age > 90) return "critical";
  if (age > 30) return "high";
  if (age > 0) return "follow-up";
  if (age >= -7) return "due-soon";
  return "scheduled";
}

function nextAction(state: QueueState): string {
  const actions: Record<QueueState, string> = {
    hold: "Resolve the dispute before collection contact.",
    breach: "Confirm the missed payment promise with the owner.",
    critical: "Review the 90+ day balance with the owner today.",
    high: "Schedule an owner follow-up this week.",
    "follow-up": "Confirm the invoice reached the client.",
    "due-soon": "Check that approval and payment details are complete.",
    scheduled: "Keep in the next weekly review.",
  };
  return actions[state];
}

function bucketFor(currency: string): AgingBucket {
  return {
    currency,
    current: 0,
    days1To30: 0,
    days31To60: 0,
    days61To90: 0,
    daysOver90: 0,
    total: 0,
  };
}

export function analyzeInvoices(
  invoices: Invoice[],
  importIssues: ImportIssue[],
  dataRowCount: number,
  referenceDate: string,
): AnalysisResult {
  const findings: Finding[] = importIssues.map((issue) => ({
    rule: "AR001",
    severity: "critical",
    invoiceId: null,
    message: `Row ${issue.rowNumber}: ${issue.message}.`,
    repair: "Correct the source row and export the invoice list again.",
  }));
  const active = invoices.filter(
    (invoice) => !["paid", "void"].includes(invoice.status),
  );
  const excludedRows = invoices.length - active.length;

  const idCounts = new Map<string, number>();
  active.forEach((invoice) =>
    idCounts.set(invoice.invoiceId, (idCounts.get(invoice.invoiceId) ?? 0) + 1),
  );
  for (const [invoiceId, count] of idCounts) {
    if (count > 1) {
      findings.push({
        rule: "AR002",
        severity: "critical",
        invoiceId,
        message: `${count} active rows use the same invoice ID.`,
        repair: "Keep one authoritative row or assign distinct invoice IDs.",
      });
    }
  }

  active.forEach((invoice) => {
    if (utcDate(invoice.dueDate) < utcDate(invoice.issueDate)) {
      findings.push({
        rule: "AR003",
        severity: "critical",
        invoiceId: invoice.invoiceId,
        message: "The due date is earlier than the issue date.",
        repair: "Correct both dates in the accounting source before follow-up.",
      });
    }
    if (!invoice.owner) {
      findings.push({
        rule: "AR004",
        severity: "medium",
        invoiceId: invoice.invoiceId,
        message: "No collection owner is assigned.",
        repair: "Assign the person responsible for the next client contact.",
      });
    }
    if (invoice.status === "promised" && !invoice.promiseDate) {
      findings.push({
        rule: "AR005",
        severity: "medium",
        invoiceId: invoice.invoiceId,
        message: "Promised status has no promise date.",
        repair:
          "Add the agreed payment date or return the invoice to open status.",
      });
    }
    if (
      invoice.promiseDate &&
      utcDate(invoice.promiseDate) < utcDate(referenceDate)
    ) {
      findings.push({
        rule: "AR006",
        severity: "high",
        invoiceId: invoice.invoiceId,
        message: `The payment promise passed on ${invoice.promiseDate}.`,
        repair: "Confirm the missed promise and record the next agreed action.",
      });
    }
  });

  const agingByCurrency = new Map<string, AgingBucket>();
  const clientByCurrency = new Map<string, Map<string, number>>();
  const queue: QueueRow[] = active.map((invoice) => {
    const age = daysPastDue(invoice.dueDate, referenceDate);
    const bucket =
      agingByCurrency.get(invoice.currency) ?? bucketFor(invoice.currency);
    bucket.total += invoice.amount;
    if (age <= 0) bucket.current += invoice.amount;
    else if (age <= 30) bucket.days1To30 += invoice.amount;
    else if (age <= 60) bucket.days31To60 += invoice.amount;
    else if (age <= 90) bucket.days61To90 += invoice.amount;
    else bucket.daysOver90 += invoice.amount;
    agingByCurrency.set(invoice.currency, bucket);

    const clients =
      clientByCurrency.get(invoice.currency) ?? new Map<string, number>();
    clients.set(
      invoice.client,
      (clients.get(invoice.client) ?? 0) + invoice.amount,
    );
    clientByCurrency.set(invoice.currency, clients);

    const state = queueState(invoice, age, referenceDate);
    return {
      ...invoice,
      daysPastDue: age,
      state,
      nextAction: nextAction(state),
    };
  });

  for (const [currency, clients] of clientByCurrency) {
    const total = [...clients.values()].reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const top = [...clients.entries()].sort((a, b) => b[1] - a[1])[0];
    if (clients.size >= 3 && top && top[1] / total >= 0.35) {
      findings.push({
        rule: "AR007",
        severity: "medium",
        invoiceId: null,
        message: `${top[0]} holds ${((top[1] / total) * 100).toFixed(1)}% of the open ${currency} balance.`,
        repair:
          "Review the [TARGET] 35% concentration marker with the account owner.",
      });
    }
  }

  queue.sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
      b.daysPastDue - a.daysPastDue ||
      a.client.localeCompare(b.client),
  );
  findings.sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    return rank[a.severity] - rank[b.severity] || a.rule.localeCompare(b.rule);
  });

  const aging = [...agingByCurrency.values()].sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );
  const signal = findings.some((finding) => finding.severity !== "medium")
    ? "review"
    : findings.length > 0
      ? "assign"
      : "current";

  return {
    signal,
    referenceDate,
    importedRows: dataRowCount,
    excludedRows,
    invalidRows: importIssues.length,
    activeInvoices: active.length,
    overdueInvoices: queue.filter((invoice) => invoice.daysPastDue > 0).length,
    unassignedInvoices: active.filter((invoice) => !invoice.owner).length,
    totals: aging.map(({ currency, total }) => ({ currency, amount: total })),
    aging,
    queue,
    findings,
  };
}

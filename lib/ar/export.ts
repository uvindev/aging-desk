import type { AnalysisResult, QueueRow } from "@/lib/ar/types";

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function collectionQueueCsv(queue: QueueRow[]): string {
  const header = [
    "priority",
    "invoice_id",
    "client",
    "owner",
    "status",
    "due_date",
    "days_past_due",
    "amount",
    "currency",
    "promise_date",
    "next_action",
  ];
  const rows = queue.map((invoice) => [
    invoice.state,
    invoice.invoiceId,
    invoice.client,
    invoice.owner || "unassigned",
    invoice.status,
    invoice.dueDate,
    invoice.daysPastDue,
    invoice.amount,
    invoice.currency,
    invoice.promiseDate ?? "",
    invoice.nextAction,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function auditJson(result: AnalysisResult): string {
  return JSON.stringify(
    {
      version: 1,
      generatedFrom: "browser-local invoice CSV",
      referenceDate: result.referenceDate,
      signal: result.signal,
      summary: {
        importedRows: result.importedRows,
        activeInvoices: result.activeInvoices,
        excludedRows: result.excludedRows,
        invalidRows: result.invalidRows,
        overdueInvoices: result.overdueInvoices,
        unassignedInvoices: result.unassignedInvoices,
        totals: result.totals,
      },
      aging: result.aging,
      queue: result.queue.map((invoice) => ({
        invoiceId: invoice.invoiceId,
        client: invoice.client,
        owner: invoice.owner || "unassigned",
        state: invoice.state,
        dueDate: invoice.dueDate,
        daysPastDue: invoice.daysPastDue,
        amount: invoice.amount,
        currency: invoice.currency,
        nextAction: invoice.nextAction,
      })),
      findings: result.findings,
    },
    null,
    2,
  );
}

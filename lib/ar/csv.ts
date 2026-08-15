/**
 * @project  AgingDesk — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import type { ImportIssue, Invoice, InvoiceStatus } from "@/lib/ar/types";

const REQUIRED_HEADERS = [
  "invoice_id",
  "client",
  "issue_date",
  "due_date",
  "amount",
  "currency",
] as const;

const STATUSES = new Set<InvoiceStatus>([
  "open",
  "disputed",
  "promised",
  "paid",
  "void",
]);

export class CsvInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvInputError";
  }
}

export type ParsedInvoiceCsv = {
  invoices: Invoice[];
  issues: ImportIssue[];
  dataRowCount: number;
};

function parseRecords(source: string): string[][] {
  const input = source.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;
  let line = 1;

  const finishRow = () => {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) records.push(row);
    row = [];
    field = "";
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (inQuotes) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += character;
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ",") {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (character === "\n" || character === "\r") {
        if (character === "\r" && next === "\n") index += 1;
        finishRow();
        afterQuote = false;
        line += 1;
      } else if (character !== " " && character !== "\t") {
        throw new CsvInputError(
          `Unexpected character after a quoted field on line ${line}.`,
        );
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new CsvInputError(`Unexpected quote on line ${line}.`);
      }
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && next === "\n") index += 1;
      finishRow();
      line += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes)
    throw new CsvInputError(`Quoted field is not closed by line ${line}.`);
  if (field.length > 0 || row.length > 0 || afterQuote) finishRow();
  return records;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function parseInvoiceCsv(source: string): ParsedInvoiceCsv {
  const records = parseRecords(source);
  if (records.length === 0)
    throw new CsvInputError("The CSV does not contain a header row.");

  const headers = records[0].map(normalizeHeader);
  const duplicateHeader = headers.find(
    (header, index) => header !== "" && headers.indexOf(header) !== index,
  );
  if (duplicateHeader) {
    throw new CsvInputError(
      `The header "${duplicateHeader}" appears more than once.`,
    );
  }

  const missing = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missing.length > 0) {
    throw new CsvInputError(`Missing required columns: ${missing.join(", ")}.`);
  }

  const dataRows = records.slice(1);
  if (dataRows.length > 5_000) {
    throw new CsvInputError("The CSV contains more than 5,000 data rows.");
  }

  const column = (row: string[], name: string) =>
    (row[headers.indexOf(name)] ?? "").trim();
  const invoices: Invoice[] = [];
  const issues: ImportIssue[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const invoiceId = column(row, "invoice_id");
    const client = column(row, "client");
    const issueDate = column(row, "issue_date");
    const dueDate = column(row, "due_date");
    const amountText = column(row, "amount");
    const currency = column(row, "currency").toUpperCase();
    const owner = column(row, "owner");
    const statusText = column(row, "status").toLowerCase() || "open";
    const promiseDateText = column(row, "promise_date");
    const errors: string[] = [];

    if (!invoiceId) errors.push("invoice_id is empty");
    if (!client) errors.push("client is empty");
    if (!isIsoDate(issueDate))
      errors.push("issue_date is not a valid ISO date");
    if (!isIsoDate(dueDate)) errors.push("due_date is not a valid ISO date");

    const amount = Number(amountText);
    if (!amountText || !Number.isFinite(amount) || amount <= 0) {
      errors.push("amount must be a positive decimal number");
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      errors.push("currency must be a three-letter code");
    }
    if (!STATUSES.has(statusText as InvoiceStatus)) {
      errors.push("status must be open, disputed, promised, paid, or void");
    }
    if (promiseDateText && !isIsoDate(promiseDateText)) {
      errors.push("promise_date is not a valid ISO date");
    }

    if (errors.length > 0) {
      issues.push({ rule: "AR001", rowNumber, message: errors.join("; ") });
      return;
    }

    invoices.push({
      rowNumber,
      invoiceId,
      client,
      issueDate,
      dueDate,
      amount,
      currency,
      owner,
      status: statusText as InvoiceStatus,
      promiseDate: promiseDateText || null,
    });
  });

  return { invoices, issues, dataRowCount: dataRows.length };
}

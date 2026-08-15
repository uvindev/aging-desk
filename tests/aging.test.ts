import { describe, expect, it } from "vitest";
import { analyzeInvoices, daysPastDue } from "@/lib/ar/analyze";
import { parseInvoiceCsv } from "@/lib/ar/csv";
import { auditJson, collectionQueueCsv } from "@/lib/ar/export";
import { CURRENT_SAMPLE, RISKY_SAMPLE } from "@/lib/ar/sample";
import type { Invoice } from "@/lib/ar/types";
import { deskInputSchema } from "@/lib/schemas/invoices";

const HEADER =
  "invoice_id,client,issue_date,due_date,amount,currency,owner,status,promise_date";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    rowNumber: 2,
    invoiceId: "INV-1",
    client: "Northstar",
    issueDate: "2026-01-01",
    dueDate: "2026-07-01",
    amount: 100,
    currency: "USD",
    owner: "alex",
    status: "open",
    promiseDate: null,
    ...overrides,
  };
}

function analyze(rows: Invoice[], referenceDate = "2026-08-01") {
  return analyzeInvoices(rows, [], rows.length, referenceDate);
}

describe("invoice CSV parser", () => {
  it("parses the required fields and defaults an empty status to open", () => {
    const parsed = parseInvoiceCsv(
      `${HEADER}\nINV-1,Northstar,2026-01-01,2026-02-01,1200,usd,alex,,`,
    );

    expect(parsed.invoices[0]).toMatchObject({
      invoiceId: "INV-1",
      amount: 1200,
      currency: "USD",
      status: "open",
    });
  });

  it("supports quoted commas and escaped quotes", () => {
    const parsed = parseInvoiceCsv(
      `${HEADER}\nINV-1,"Northstar, ""Labs""",2026-01-01,2026-02-01,1200,USD,alex,open,`,
    );

    expect(parsed.invoices[0]?.client).toBe('Northstar, "Labs"');
  });

  it("handles a BOM, CRLF, and normalized header names", () => {
    const parsed = parseInvoiceCsv(
      "\uFEFFInvoice ID,Client,Issue-Date,Due Date,Amount,Currency\r\nINV-1,Northstar,2026-01-01,2026-02-01,9,USD\r\n",
    );

    expect(parsed.dataRowCount).toBe(1);
  });

  it("rejects a missing required header", () => {
    expect(() =>
      parseInvoiceCsv(
        "invoice_id,client,issue_date,due_date,amount\nINV-1,A,2026-01-01,2026-01-02,1",
      ),
    ).toThrow("Missing required columns: currency.");
  });

  it("rejects a duplicate normalized header", () => {
    expect(() =>
      parseInvoiceCsv(
        `${HEADER},Client\nINV-1,A,2026-01-01,2026-01-02,1,USD,,,A`,
      ),
    ).toThrow('The header "client" appears more than once.');
  });

  it("rejects an unclosed quoted field", () => {
    expect(() =>
      parseInvoiceCsv(
        `${HEADER}\nINV-1,"Northstar,2026-01-01,2026-02-01,1,USD`,
      ),
    ).toThrow("Quoted field is not closed");
  });

  it("rejects a quote after unquoted field content", () => {
    expect(() =>
      parseInvoiceCsv(
        `${HEADER}\nINV-1,North"star,2026-01-01,2026-02-01,1,USD`,
      ),
    ).toThrow("Unexpected quote");
  });

  it("rejects content after a closing quote", () => {
    expect(() =>
      parseInvoiceCsv(
        `${HEADER}\nINV-1,"Northstar"x,2026-01-01,2026-02-01,1,USD`,
      ),
    ).toThrow("Unexpected character after a quoted field");
  });

  it("rejects more than 5,000 data rows", () => {
    const rows = Array.from(
      { length: 5_001 },
      (_, index) => `INV-${index},A,2026-01-01,2026-01-02,1,USD`,
    );

    expect(() => parseInvoiceCsv([HEADER, ...rows].join("\n"))).toThrow(
      "more than 5,000 data rows",
    );
  });

  it("marks impossible calendar dates as AR001", () => {
    const parsed = parseInvoiceCsv(
      `${HEADER}\nINV-1,A,2026-02-30,2026-03-01,1,USD,alex,open,`,
    );

    expect(parsed.issues[0]?.message).toContain(
      "issue_date is not a valid ISO date",
    );
  });

  it.each([
    ["amount", `${HEADER}\nINV-1,A,2026-01-01,2026-02-01,0,USD,alex,open,`],
    ["currency", `${HEADER}\nINV-1,A,2026-01-01,2026-02-01,1,US,alex,open,`],
    ["status", `${HEADER}\nINV-1,A,2026-01-01,2026-02-01,1,USD,alex,sent,`],
    [
      "promise_date",
      `${HEADER}\nINV-1,A,2026-01-01,2026-02-01,1,USD,alex,promised,nope`,
    ],
  ])("marks an invalid %s as AR001", (_, source) => {
    expect(parseInvoiceCsv(source).issues[0]?.rule).toBe("AR001");
  });
});

describe("aging and collection analysis", () => {
  it.each([
    ["2026-08-02", -1],
    ["2026-08-01", 0],
    ["2026-07-31", 1],
    ["2026-07-02", 30],
    ["2026-07-01", 31],
    ["2026-06-02", 60],
    ["2026-06-01", 61],
    ["2026-05-03", 90],
    ["2026-05-02", 91],
  ])("computes %s as %i days past due", (dueDate, expected) => {
    expect(daysPastDue(dueDate, "2026-08-01")).toBe(expected);
  });

  it("assigns every boundary to the correct aging bucket", () => {
    const result = analyze(
      [0, 1, 30, 31, 60, 61, 90, 91].map((age, index) =>
        invoice({
          invoiceId: `INV-${index}`,
          dueDate: new Date(Date.UTC(2026, 7, 1 - age))
            .toISOString()
            .slice(0, 10),
          amount: 10,
        }),
      ),
    );

    expect(result.aging[0]).toMatchObject({
      current: 10,
      days1To30: 20,
      days31To60: 20,
      days61To90: 20,
      daysOver90: 10,
      total: 80,
    });
  });

  it("keeps currency totals on separate ledgers", () => {
    const result = analyze([
      invoice({ invoiceId: "USD-1", amount: 100 }),
      invoice({ invoiceId: "GBP-1", currency: "GBP", amount: 80 }),
    ]);

    expect(result.totals).toEqual([
      { currency: "GBP", amount: 80 },
      { currency: "USD", amount: 100 },
    ]);
  });

  it("excludes paid and void rows from balances and the queue", () => {
    const result = analyze([
      invoice({ invoiceId: "OPEN", amount: 100 }),
      invoice({ invoiceId: "PAID", status: "paid", amount: 200 }),
      invoice({ invoiceId: "VOID", status: "void", amount: 300 }),
    ]);

    expect(result).toMatchObject({ activeInvoices: 1, excludedRows: 2 });
    expect(result.totals).toEqual([{ currency: "USD", amount: 100 }]);
  });

  it("orders promise breach ahead of critical, high, follow-up, hold, due-soon, and scheduled", () => {
    const result = analyze([
      invoice({ invoiceId: "SCHEDULED", dueDate: "2026-08-20" }),
      invoice({ invoiceId: "DUE", dueDate: "2026-08-05" }),
      invoice({ invoiceId: "HOLD", status: "disputed" }),
      invoice({ invoiceId: "FOLLOW", dueDate: "2026-07-20" }),
      invoice({ invoiceId: "HIGH", dueDate: "2026-06-20" }),
      invoice({ invoiceId: "CRITICAL", dueDate: "2026-04-20" }),
      invoice({ invoiceId: "BREACH", promiseDate: "2026-07-20" }),
    ]);

    expect(result.queue.map(({ state }) => state)).toEqual([
      "breach",
      "critical",
      "high",
      "follow-up",
      "hold",
      "due-soon",
      "scheduled",
    ]);
  });

  it("emits duplicate, date, owner, promise-date, and promise-breach findings", () => {
    const result = analyze([
      invoice({ invoiceId: "DUP" }),
      invoice({ invoiceId: "DUP", rowNumber: 3 }),
      invoice({
        invoiceId: "DATES",
        issueDate: "2026-07-20",
        dueDate: "2026-07-01",
      }),
      invoice({ invoiceId: "OWNER", owner: "" }),
      invoice({ invoiceId: "PROMISE", status: "promised", promiseDate: null }),
      invoice({ invoiceId: "BREACH", promiseDate: "2026-07-20" }),
    ]);

    expect(new Set(result.findings.map(({ rule }) => rule))).toEqual(
      new Set(["AR002", "AR003", "AR004", "AR005", "AR006"]),
    );
  });

  it("only marks concentration where a currency has at least three clients", () => {
    const twoClients = analyze([
      invoice({ invoiceId: "A", client: "A", amount: 90 }),
      invoice({ invoiceId: "B", client: "B", amount: 10 }),
    ]);
    const threeClients = analyze([
      invoice({ invoiceId: "A", client: "A", amount: 40 }),
      invoice({ invoiceId: "B", client: "B", amount: 30 }),
      invoice({ invoiceId: "C", client: "C", amount: 30 }),
    ]);

    expect(twoClients.findings.some(({ rule }) => rule === "AR007")).toBe(
      false,
    );
    expect(threeClients.findings.some(({ rule }) => rule === "AR007")).toBe(
      true,
    );
  });

  it("converts invalid import rows into critical AR001 findings", () => {
    const result = analyzeInvoices(
      [],
      [{ rule: "AR001", rowNumber: 7, message: "amount is invalid" }],
      1,
      "2026-08-01",
    );

    expect(result.findings[0]).toMatchObject({
      rule: "AR001",
      severity: "critical",
    });
  });

  it("keeps the current sample free of findings", () => {
    const parsed = parseInvoiceCsv(CURRENT_SAMPLE);
    const result = analyzeInvoices(
      parsed.invoices,
      parsed.issues,
      parsed.dataRowCount,
      "2026-08-01",
    );

    expect(result).toMatchObject({ signal: "current", findings: [] });
  });

  it("exercises every documented rule with the review sample", () => {
    const parsed = parseInvoiceCsv(RISKY_SAMPLE);
    const result = analyzeInvoices(
      parsed.invoices,
      parsed.issues,
      parsed.dataRowCount,
      "2026-08-01",
    );

    expect(new Set(result.findings.map(({ rule }) => rule))).toEqual(
      new Set(["AR001", "AR002", "AR003", "AR004", "AR006", "AR007"]),
    );
    expect(result.signal).toBe("review");
  });
});

describe("safe exports and desk validation", () => {
  it("prefixes spreadsheet formula characters in text cells", () => {
    const result = analyze([
      invoice({ client: '=HYPERLINK("https://bad.invalid")', owner: "+cmd" }),
    ]);

    const csv = collectionQueueCsv(result.queue);
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.invalid"")"');
    expect(csv).toContain('"\'+cmd"');
  });

  it("produces a versioned audit artifact", () => {
    const parsed = JSON.parse(auditJson(analyze([invoice()]))) as Record<
      string,
      unknown
    >;

    expect(parsed).toMatchObject({
      version: 1,
      generatedFrom: "browser-local invoice CSV",
      referenceDate: "2026-08-01",
    });
  });

  it("rejects empty and oversized CSV input", () => {
    expect(
      deskInputSchema.safeParse({ csv: "", referenceDate: "2026-08-01" })
        .success,
    ).toBe(false);
    expect(
      deskInputSchema.safeParse({
        csv: "x".repeat(1_000_001),
        referenceDate: "2026-08-01",
      }).success,
    ).toBe(false);
  });

  it("rejects an impossible reference date", () => {
    expect(
      deskInputSchema.safeParse({ csv: HEADER, referenceDate: "2026-02-30" })
        .success,
    ).toBe(false);
  });
});

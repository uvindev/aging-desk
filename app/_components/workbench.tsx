"use client";

import { useEffect, useState } from "react";
import { analyzeInvoices } from "@/lib/ar/analyze";
import { CsvInputError, parseInvoiceCsv } from "@/lib/ar/csv";
import { auditJson, collectionQueueCsv } from "@/lib/ar/export";
import { CURRENT_SAMPLE, RISKY_SAMPLE } from "@/lib/ar/sample";
import type { AnalysisResult, QueueState } from "@/lib/ar/types";
import { track } from "@/lib/analytics";
import { deskInputSchema } from "@/lib/schemas/invoices";

const SIGNAL_COPY: Record<
  AnalysisResult["signal"],
  { label: string; body: string }
> = {
  review: {
    label: "REVIEW",
    body: "The supplied export contains data or collection exceptions.",
  },
  assign: {
    label: "ASSIGN",
    body: "The aging is usable, but ownership or policy markers need review.",
  },
  current: {
    label: "CURRENT",
    body: "No data-quality or collection-policy findings were detected.",
  },
};

const STATE_LABEL: Record<QueueState, string> = {
  hold: "DISPUTE HOLD",
  breach: "PROMISE BREACH",
  critical: "90+ CRITICAL",
  high: "31–90 HIGH",
  "follow-up": "1–30 FOLLOW-UP",
  "due-soon": "DUE SOON",
  scheduled: "SCHEDULED",
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function downloadText(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ageLabel(days: number): string {
  if (days > 0) return `${days}d late`;
  if (days === 0) return "due today";
  return `in ${Math.abs(days)}d`;
}

export function Workbench() {
  const [csv, setCsv] = useState(RISKY_SAMPLE);
  const [referenceDate, setReferenceDate] = useState("2026-08-01");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"queue" | "audit" | null>(null);

  useEffect(() => {
    track("desk_viewed");
  }, []);

  function runDesk() {
    setCopied(null);
    const input = deskInputSchema.safeParse({ csv, referenceDate });
    if (!input.success) {
      setResult(null);
      setError(input.error.issues[0]?.message ?? "The desk input is invalid.");
      return;
    }

    try {
      const parsed = parseInvoiceCsv(input.data.csv);
      const nextResult = analyzeInvoices(
        parsed.invoices,
        parsed.issues,
        parsed.dataRowCount,
        input.data.referenceDate,
      );
      setResult(nextResult);
      setError(null);
      track("invoices_triaged");
    } catch (cause) {
      setResult(null);
      setError(
        cause instanceof CsvInputError
          ? cause.message
          : "The CSV could not be read. Check its header and quoting, then run it again.",
      );
    }
  }

  function loadSample(sample: string) {
    setCsv(sample);
    setResult(null);
    setError(null);
    setCopied(null);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    try {
      const contents = await file.text();
      setCsv(contents);
      setResult(null);
      setError(null);
      setCopied(null);
    } catch {
      setError(
        "The selected file could not be read. Export it as a UTF-8 CSV and try again.",
      );
    }
  }

  async function copyOutput(kind: "queue" | "audit", contents: string) {
    try {
      await navigator.clipboard.writeText(contents);
      setCopied(kind);
      track("collection_queue_exported");
    } catch {
      setError("Clipboard access is unavailable. Use Download instead.");
    }
  }

  const queueCsv = result ? collectionQueueCsv(result.queue) : "";
  const audit = result ? auditJson(result) : "";

  return (
    <section className="workbench" id="desk" aria-labelledby="desk-title">
      <header className="workbench-heading">
        <div>
          <p className="eyebrow">WEEKLY CONTROL DESK</p>
          <h2 id="desk-title">
            Build the follow-up queue from the ledger export.
          </h2>
        </div>
        <span>LOCAL PROCESSING</span>
      </header>

      <div className="control-strip">
        <label>
          <span>Review date / UTC</span>
          <input
            type="date"
            value={referenceDate}
            onChange={(event) => setReferenceDate(event.target.value)}
          />
        </label>
        <label className="file-control">
          <span>Import source</span>
          <b>Select CSV file</b>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
        </label>
        <div className="schema-key" aria-label="Required CSV columns">
          <span>REQUIRED COLUMNS</span>
          <code>
            invoice_id · client · issue_date · due_date · amount · currency
          </code>
        </div>
      </div>

      <label className="csv-editor">
        <span>
          <b>OPEN INVOICE CSV</b>
          <small>
            {csv.length.toLocaleString()} characters / 1,000,000 max
          </small>
        </span>
        <textarea
          aria-label="Open invoice CSV"
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          spellCheck={false}
        />
      </label>

      <div className="workbench-actions">
        <button className="run-button" type="button" onClick={runDesk}>
          Triage invoice export
        </button>
        <button type="button" onClick={() => loadSample(RISKY_SAMPLE)}>
          Restore review sample
        </button>
        <button type="button" onClick={() => loadSample(CURRENT_SAMPLE)}>
          Load current sample
        </button>
        <button type="button" onClick={() => loadSample("")}>
          Clear
        </button>
      </div>

      {error ? (
        <div className="input-error" role="alert">
          <strong>DESK STOPPED</strong>
          <span>{error}</span>
          <button type="button" onClick={() => loadSample(RISKY_SAMPLE)}>
            Restore the example export
          </button>
        </div>
      ) : null}

      {!result && !error ? (
        <div className="desk-idle">
          <span>QUEUE NOT BUILT</span>
          <p>
            The supplied sample includes overdue, duplicate, unassigned,
            disputed, promised, paid, and invalid rows.
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="results" aria-live="polite">
          <div className={`result-header ${result.signal}`}>
            <div>
              <span>COLLECTION SIGNAL</span>
              <strong>{SIGNAL_COPY[result.signal].label}</strong>
            </div>
            <p>{SIGNAL_COPY[result.signal].body}</p>
          </div>

          <dl className="summary-strip">
            <div>
              <dt>Imported rows</dt>
              <dd>{result.importedRows}</dd>
            </div>
            <div>
              <dt>Active invoices</dt>
              <dd>{result.activeInvoices}</dd>
            </div>
            <div>
              <dt>Overdue</dt>
              <dd>{result.overdueInvoices}</dd>
            </div>
            <div>
              <dt>Unassigned</dt>
              <dd>{result.unassignedInvoices}</dd>
            </div>
            <div>
              <dt>Invalid</dt>
              <dd>{result.invalidRows}</dd>
            </div>
            <div>
              <dt>Excluded paid/void</dt>
              <dd>{result.excludedRows}</dd>
            </div>
          </dl>

          <section className="aging-ledger" aria-labelledby="aging-title">
            <div className="section-label">
              <h3 id="aging-title">Currency aging ledger</h3>
              <span>Amounts never cross currency lines</span>
            </div>
            {result.aging.length ? (
              <div className="table-frame">
                <table>
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th>Current</th>
                      <th>1–30</th>
                      <th>31–60</th>
                      <th>61–90</th>
                      <th>90+</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.aging.map((bucket) => (
                      <tr key={bucket.currency}>
                        <th scope="row">{bucket.currency}</th>
                        <td>{money(bucket.current, bucket.currency)}</td>
                        <td>{money(bucket.days1To30, bucket.currency)}</td>
                        <td>{money(bucket.days31To60, bucket.currency)}</td>
                        <td>{money(bucket.days61To90, bucket.currency)}</td>
                        <td>{money(bucket.daysOver90, bucket.currency)}</td>
                        <td>
                          <strong>
                            {money(bucket.total, bucket.currency)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-note">
                No active invoices remain after paid and void rows are excluded.
              </p>
            )}
          </section>

          <section className="queue-register" aria-labelledby="queue-title">
            <div className="section-label">
              <h3 id="queue-title">Collection queue</h3>
              <span>{result.queue.length} active invoices</span>
            </div>
            {result.queue.length ? (
              <div className="table-frame">
                <table>
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Invoice / client</th>
                      <th>Owner</th>
                      <th>Due</th>
                      <th>Age</th>
                      <th>Balance</th>
                      <th>Next action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.queue.map((invoice, index) => (
                      <tr
                        key={`${invoice.invoiceId}-${invoice.rowNumber}-${index}`}
                      >
                        <td>
                          <span className={`queue-state ${invoice.state}`}>
                            {STATE_LABEL[invoice.state]}
                          </span>
                        </td>
                        <td>
                          <strong>{invoice.invoiceId}</strong>
                          <small>
                            {invoice.client} · {invoice.status}
                          </small>
                        </td>
                        <td>{invoice.owner || <em>unassigned</em>}</td>
                        <td>
                          <code>{invoice.dueDate}</code>
                        </td>
                        <td>{ageLabel(invoice.daysPastDue)}</td>
                        <td>
                          <strong>
                            {money(invoice.amount, invoice.currency)}
                          </strong>
                        </td>
                        <td>{invoice.nextAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-note">
                There is no active collection queue in this export.
              </p>
            )}
          </section>

          <section className="finding-register" aria-labelledby="finding-title">
            <div className="section-label">
              <h3 id="finding-title">Desk findings</h3>
              <span>{result.findings.length} findings</span>
            </div>
            {result.findings.length ? (
              <ol>
                {result.findings.map((finding, index) => (
                  <li
                    key={`${finding.rule}-${finding.invoiceId ?? "desk"}-${index}`}
                  >
                    <span className={`severity ${finding.severity}`}>
                      {finding.severity}
                    </span>
                    <code>{finding.rule}</code>
                    <div>
                      <strong>{finding.message}</strong>
                      <small>
                        {finding.invoiceId ? `${finding.invoiceId} · ` : ""}
                        {finding.repair}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-note">
                No data-quality or collection-policy findings were detected.
              </p>
            )}
          </section>

          <div className="outputs">
            <article>
              <header>
                <span>collection-queue.csv</span>
                <div>
                  <button
                    type="button"
                    onClick={() => void copyOutput("queue", queueCsv)}
                  >
                    {copied === "queue" ? "Copied" : "Copy CSV"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadText(
                        `aging-desk-queue-${referenceDate}.csv`,
                        queueCsv,
                        "text/csv;charset=utf-8",
                      );
                      track("collection_queue_exported");
                    }}
                  >
                    Download
                  </button>
                </div>
              </header>
              <pre>{queueCsv}</pre>
            </article>
            <article>
              <header>
                <span>aging-desk-audit.json</span>
                <div>
                  <button
                    type="button"
                    onClick={() => void copyOutput("audit", audit)}
                  >
                    {copied === "audit" ? "Copied" : "Copy JSON"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadText(
                        `aging-desk-audit-${referenceDate}.json`,
                        audit,
                        "application/json",
                      );
                      track("collection_queue_exported");
                    }}
                  >
                    Download
                  </button>
                </div>
              </header>
              <pre>{audit}</pre>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

# AgingDesk 0.1 specification

## User journey

1. A finance operator pastes an open-invoice CSV or loads a supplied sample.
2. They choose the review date and run the desk.
3. AgingDesk validates rows and separates current, 1–30, 31–60, 61–90, and 90+ day balances by currency.
4. The operator reviews a sorted collection queue, ownership gaps, duplicate IDs, date defects, promise breaches, and `[TARGET]` client concentration markers.
5. They copy or download a formula-safe CSV queue and JSON audit record.

## Input contract

- UTF-8 CSV, at most 1 MB and 5,000 data rows.
- Required columns: `invoice_id`, `client`, `issue_date`, `due_date`, `amount`, `currency`.
- Optional columns: `owner`, `status`, `promise_date`.
- ISO `YYYY-MM-DD` dates; positive decimal amount; three-letter currency code.
- Status: `open`, `disputed`, `promised`, `paid`, or `void`. Empty status means `open`.
- Paid and void rows are counted as excluded and never enter open balances.

## Observable rules

- `AR001`: invalid data row.
- `AR002`: duplicate invoice ID.
- `AR003`: due date before issue date.
- `AR004`: active invoice without an owner.
- `AR005`: promised status without a promise date.
- `AR006`: promise date passed while the invoice remains open.
- `AR007`: one client holds at least `[TARGET] 35%` of an open balance in a currency.

Collection states are deterministic: disputed hold, broken promise, 90+ critical, 31–90 high, 1–30 follow-up, due within seven days, or scheduled. Amounts in different currencies are never converted or combined.

## Non-functional constraints

- No invoice text leaves the browser. No persistence, accounts, cookies, or network requests are required for analysis.
- Optional Plausible events contain event names only.
- CSV exports neutralize spreadsheet formula prefixes.
- Error messages name the cause and recovery action.
- Keyboard-visible focus, 44px controls, AA contrast, reduced-motion support, and a contained mobile table are required.

## Monetization and analytics

Team is a `[TARGET] $19/workspace/month` hypothesis. It would add shared queues, scheduled imports, accounting integrations, reminder history, ownership, and policy enforcement. Events: `desk_viewed`, `invoices_triaged`, `collection_queue_exported`, `team_interest`, and `feedback_intent`. Events are instrumentation, not proof of demand or revenue.

## Threat considerations

Reject oversized or malformed CSV, cap rows, escape formulas in exports, never render input as HTML, and do not infer that a currency code is convertible. No reminder or payment action is performed.

## Design contract

- Premise: the weekly receivables review should read like a controlled ledger sheet, not a generic finance dashboard.
- Primary family: structured quiet. Counterweight: technical vernacular.
- Type: serif display for editorial authority, plain sans for instructions, mono for dates and amounts.
- Composition: split masthead, ruled workbench, horizontal aging ledger, dense queue.
- Material: warm paper, graphite rules, navy ink, rust overdue signal, restrained green current signal.
- Interaction: one stamped collection signal after triage.
- Reject: gradients, floating cards, rounded icon tiles, decorative charts, and widespread animation.

## Acceptance checks

The risky sample must surface aging, duplicate, ownership, promise, and concentration findings. The current sample must produce no findings. Malformed CSV, missing columns, empty input, export actions, mobile layout, response headers, signature output, and a production build must be verified.

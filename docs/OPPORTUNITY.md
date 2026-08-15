# AgingDesk opportunity brief

## Selected problem

Small agencies, consultancies, bookkeepers, and finance operators often have an open-invoice export but still need a weekly spreadsheet pass to answer three operational questions: what is overdue, who owns the follow-up, and which balances need attention first.

QuickBooks and Xero both document accounts-receivable aging reports. The Journal of Accountancy documents an Excel aging workflow for smaller clients. Chaser sells automated receivables workflows and starts at $259 per month for US customers. Those sources establish the recurring job and a paid automation market; they do not prove demand for AgingDesk.

## Release boundary

AgingDesk accepts a CSV in the browser, validates each row, keeps currencies separate, assigns deterministic aging and collection states, and exports a collection queue plus an audit record. It does not replace an accounting ledger, predict payment dates, send reminders, convert currencies, collect money, or provide accounting advice.

## Alternatives considered

- Analytics event-contract drift has a real workflow, but Avo has a free plan with tracking-plan audit and observed events while Segment Protocols covers enforcement for Business customers.
- GitHub Actions permission analysis has strong security evidence, but zizmor already offers offline static analysis and StepSecurity offers cross-repository hardening.
- PostgreSQL migration lock review is useful, but Bytebase Community includes database change management and pre-deployment SQL review; a credible SQL parser also exceeds this release boundary.

## Commercial hypothesis

The single-export workbench is free. Team is a `[TARGET] $19/workspace/month` hypothesis for shared queues, scheduled imports, accounting integrations, reminder history, role-based ownership, and policy enforcement. Price and willingness to pay are unverified.

## Evidence

- https://quickbooks.intuit.com/learn-support/en-us/help-article/accounts-receivable-reports/run-accounts-receivable-aging-report/L4N7PC2hg_US_en_US
- https://www.xero.com/us/guides/accounts-receivable-aging-report/
- https://www.chaserhq.com/chaser-pricing
- https://help.chaserhq.com/get-started-using-chaser
- https://www.journalofaccountancy.com/issues/2025/mar/doing-accounts-receivable-aging-reports-in-excel/
- https://www.avo.app/pricing
- https://www.twilio.com/docs/segment/protocols
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.zizmor.sh/
- https://www.stepsecurity.io/pricing
- https://www.postgresql.org/docs/16/sql-altertable.html
- https://www.bytebase.com/pricing/

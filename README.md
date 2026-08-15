# AgingDesk

AgingDesk turns an open-invoice CSV into a currency-safe aging ledger and an owner-specific collection queue. It runs in the browser and does not transmit invoice contents.

## Who it is for

Small agencies, consultancies, bookkeepers, and finance operators who can export open invoices but do not need a full accounts-receivable automation platform.

## What it does

- Parses quoted UTF-8 CSV with explicit row errors.
- Separates current, 1–30, 31–60, 61–90, and 90+ balances by currency.
- Prioritizes disputed invoices, broken promises, overdue balances, due-soon invoices, and scheduled work.
- Finds duplicate IDs, invalid dates, missing owners, missing promise dates, and `[TARGET]` 35% client concentration.
- Exports a formula-safe collection queue and a JSON audit record.

It does not replace an accounting ledger, verify invoice facts, convert currencies, predict payments, send reminders, collect money, or provide accounting advice.

## Local setup

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Verify

```bash
pnpm verify
pnpm audit --prod
```

The signature command must exit `0` with a final line of `SIGNED`.

## Monetization

The single-export workbench is free. Team is a `[TARGET] $19/workspace/month` hypothesis for shared collection queues, scheduled imports, accounting integrations, reminder history, role-based ownership, and policy enforcement. Demand, customers, and revenue are unverified.

## Privacy and limits

Analysis is browser-local. Optional analytics contain event names only. CSV input is capped at 1 MB and 5,000 rows. Currency codes are displayed separately without conversion. No production deployment or live checkout is included.

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)

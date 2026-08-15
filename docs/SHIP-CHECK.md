# SHIP CHECK — AgingDesk — 2026-08-15

| Gate      | Result | Evidence                                                                                                                                                                    |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| build     | PASS   | `pnpm verify`; static `/` and `/_not-found`; 124 kB first-load JavaScript on `/`                                                                                            |
| tests     | PASS   | Vitest: 36 passed, 0 failed, 0 skipped                                                                                                                                      |
| env       | PASS   | Only optional public `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`; no server secret or database configuration                                                                             |
| db        | PASS   | Not applicable; AgingDesk has no database, migration, account, or server-side invoice storage                                                                               |
| security  | PASS   | `pnpm audit --prod`: `No known vulnerabilities found`; CSP, HSTS, frame, MIME, referrer, permissions, and opener headers confirmed from production localhost                |
| behaviour | PASS   | Risky and current samples; missing columns; malformed quoting; empty input; audit copy; branded 404; 320 px and 375 px without page overflow; no browser errors or warnings |
| brand     | PASS   | Browser-confirmed console badge, footer credit, metadata, JSON-LD, `humans.txt`; `bash ./scripts/verify-signature.sh` ends `SIGNED`                                         |

Keyboard focus outlines were browser-confirmed on the primary links. The in-app browser did not advance focus with Tab, so a complete keyboard traversal remains a manual release check for any later public deployment.

Rollback after publication: `git revert HEAD && git push origin main`.

VERDICT: GO — private source publication only. No production deployment, checkout, outreach, customer, demand, or revenue claim is included.

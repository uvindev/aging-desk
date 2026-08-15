/**
 * @project  AgingDesk — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="route-error">
      <p className="eyebrow">LEDGER ROUTE / 404</p>
      <h1>This desk route does not exist.</h1>
      <p>Return to the invoice workbench. No CSV data was stored or sent.</p>
      <Link className="primary-link" href="/">
        Return to AgingDesk
      </Link>
      <p className="route-credit">
        Built by <a href="https://iamuvin.com">Uvin Vindula — iamuvin.com</a>
      </p>
    </main>
  );
}

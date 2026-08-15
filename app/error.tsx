/**
 * @project  AgingDesk — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="route-error">
      <p className="eyebrow">DESK INTERRUPTED</p>
      <h1>The invoice desk could not render.</h1>
      <p>
        Your CSV has not been sent or saved. Reload the local workbench and try
        again.
      </p>
      <button type="button" onClick={reset}>
        Reload the desk
      </button>
      <p className="route-credit">
        Built by <a href="https://iamuvin.com">Uvin Vindula — iamuvin.com</a>
      </p>
    </main>
  );
}

import { IntentLink } from "@/components/intent-link";
import { Workbench } from "./_components/workbench";

export default function HomePage() {
  return (
    <main id="top">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="AgingDesk home">
          <span>AD</span>
          <b>AGING/DESK</b>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#desk">Desk</a>
          <a href="#boundary">Boundary</a>
          <a href="#team">Team</a>
        </nav>
        <span className="review-stamp">WEEKLY / LOCAL</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">OPEN INVOICE CONTROL SHEET / BUILD 08</p>
          <h1 id="hero-title">
            Your invoice export is not a collection queue.
          </h1>
          <p>
            Age every open balance, keep currencies separate, and assign the
            next client contact before the weekly finance review ends.
          </p>
          <a className="primary-link" href="#desk">
            Triage the supplied export
          </a>
        </div>
        <div
          className="ledger-figure"
          aria-label="Example accounts receivable aging ledger"
        >
          <div className="ledger-top">
            <span>OPEN RECEIVABLES / USD</span>
            <span>AS OF 08.01.26</span>
          </div>
          <div className="ledger-head">
            <span>CURRENT</span>
            <span>1–30</span>
            <span>31–60</span>
            <span>61–90</span>
            <span>90+</span>
          </div>
          <div className="ledger-values">
            <strong>$4,300</strong>
            <strong>$6,500</strong>
            <strong>$4,000</strong>
            <strong>$8,500</strong>
            <strong>$12,500</strong>
          </div>
          <div className="ledger-note">
            <span>OWNER GAPS / 01</span>
            <b>REVIEW REQUIRED</b>
          </div>
        </div>
      </section>

      <Workbench />

      <section
        className="boundary"
        id="boundary"
        aria-labelledby="boundary-title"
      >
        <header>
          <p className="eyebrow">EVIDENCE BOUNDARY</p>
          <h2 id="boundary-title">
            The desk organizes supplied facts. It does not verify them.
          </h2>
        </header>
        <div className="boundary-lines">
          <article>
            <span>01</span>
            <div>
              <strong>CSV in, CSV out</strong>
              <p>
                Invoice contents stay in this browser tab. No account or upload
                is required.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>No currency conversion</strong>
              <p>
                USD, GBP, EUR, and every other code remain separate in totals
                and aging.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>No payment prediction</strong>
              <p>
                Priority comes from dates and status. AgingDesk does not
                estimate when a client will pay.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="team" id="team" aria-labelledby="team-title">
        <div>
          <p className="eyebrow">COMMERCIAL HYPOTHESIS</p>
          <h2 id="team-title">
            One export is free. Collection ownership is a team system.
          </h2>
          <p>
            Team would add shared queues, scheduled imports, accounting
            integrations, reminder history, ownership rules, and
            collection-policy checks. Price and demand are unverified.
          </p>
        </div>
        <aside>
          <span>TEAM / TARGET</span>
          <strong>
            <b>$19</b> / workspace / month
          </strong>
          <IntentLink
            event="team_interest"
            href="mailto:hello@iamuvin.com?subject=AgingDesk%20Team%20pilot"
          >
            Request a Team pilot
          </IntentLink>
        </aside>
      </section>

      <footer>
        <div>
          <b>AGING/DESK 0.1</b>
          <span>Invoice analysis stays local</span>
        </div>
        <IntentLink
          event="feedback_intent"
          href="mailto:hello@iamuvin.com?subject=AgingDesk%20feedback"
        >
          Send product feedback
        </IntentLink>
        <span className="built-by">
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>
        </span>
      </footer>
    </main>
  );
}

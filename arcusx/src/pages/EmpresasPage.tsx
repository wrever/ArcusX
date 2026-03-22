import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useI18n } from "../i18n/I18nProvider";
import { getEnterprisePortalUrl, MAIN_SITE_URL, isEnterpriseLandingHost } from "../config/enterpriseSite";
import "../css/EmpresasPage.css";

function IconSupply() {
  return (
    <svg className="ax-empresas__uc-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconProcurement() {
  return (
    <svg className="ax-empresas__uc-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1ZM10 5h4v2h-4V5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFinance() {
  return (
    <svg className="ax-empresas__uc-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCompliance() {
  return (
    <svg className="ax-empresas__uc-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPillar({ children }: { children: ReactNode }) {
  return (
    <span className="ax-empresas__pillar-ico" aria-hidden>
      {children}
    </span>
  );
}

export default function EmpresasPage() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const portalUrl = getEnterprisePortalUrl();
  const onEnterpriseHost = isEnterpriseLandingHost();
  const mainPrivacy = `${MAIN_SITE_URL}/privacy`;
  const mainTerms = `${MAIN_SITE_URL}/terms`;

  return (
    <div className={`ax-empresas ${onEnterpriseHost ? "ax-empresas--subdomain" : ""}`}>
      <div className="ax-empresas__bg" aria-hidden />
      <div className="ax-empresas__bg-accent" aria-hidden />
      <div className="ax-empresas__grid-bg" aria-hidden />

      <Helmet>
        <title>{t("empresa.meta.title")}</title>
        <meta name="description" content={t("empresa.meta.description")} />
        <link
          rel="canonical"
          href={
            typeof window !== "undefined" && onEnterpriseHost
              ? `${window.location.origin}/`
              : `${MAIN_SITE_URL}/empresas`
          }
        />
      </Helmet>

      <div className="ax-empresas__shell">
        <section className="ax-empresas__hero" aria-labelledby="empresa-hero-title">
          <div className="ax-empresas__hero-grid">
            <div className="ax-empresas__hero-copy">
              <span className="ax-empresas__eyebrow">{t("empresa.hero.pill")}</span>
              <h1 id="empresa-hero-title" className="ax-empresas__title">
                {t("empresa.hero.title")}
              </h1>
              <p className="ax-empresas__lead">{t("empresa.hero.subtitle")}</p>

              <div className="ax-empresas__hero-actions">
                <a href={portalUrl} className="ax-empresas__btn ax-empresas__btn--primary" rel="noopener noreferrer">
                  {t("empresa.hero.access")}
                </a>
                <a href="#empresa-how" className="ax-empresas__btn ax-empresas__btn--ghost">
                  {t("empresa.hero.how_link")}
                </a>
              </div>

              <div className="ax-empresas__hero-bottom">
                <ul className="ax-empresas__trust-strip" aria-label={t("empresa.trust.aria")}>
                  <li className="ax-empresas__trust-strip-item">{t("empresa.trust.1")}</li>
                  <li className="ax-empresas__trust-strip-item">{t("empresa.trust.2")}</li>
                  <li className="ax-empresas__trust-strip-item ax-empresas__trust-strip-item--accent">
                    {t("empresa.trust.3")}
                  </li>
                </ul>

                <ul className="ax-empresas__metrics">
                  <li className="ax-empresas__metric">
                    <span className="ax-empresas__metric-dot" />
                    {t("empresa.metric.1")}
                  </li>
                  <li className="ax-empresas__metric">
                    <span className="ax-empresas__metric-dot" />
                    {t("empresa.metric.2")}
                  </li>
                  <li className="ax-empresas__metric">
                    <span className="ax-empresas__metric-dot" />
                    {t("empresa.metric.3")}
                  </li>
                </ul>
              </div>
            </div>

            <div className="ax-empresas__hero-visual">
              <div className="ax-empresas__board ax-empresas__board--elevated">
                <div className="ax-empresas__board-headbar">
                  <span className="ax-empresas__board-title">{t("empresa.board.title")}</span>
                  <span className="ax-empresas__board-pill">USDC</span>
                </div>
                <div className="ax-empresas__board-table" role="presentation">
                  <div className="ax-empresas__board-row ax-empresas__board-row--th">
                    <span>{t("empresa.board.th.task")}</span>
                    <span>{t("empresa.board.th.status")}</span>
                  </div>
                  <div className="ax-empresas__board-row">
                    <span className="ax-empresas__board-cell-main">{t("empresa.board.r1.task")}</span>
                    <span className="ax-empresas__board-tag ax-empresas__board-tag--active">
                      {t("empresa.board.r1.state")}
                    </span>
                  </div>
                  <div className="ax-empresas__board-row">
                    <span className="ax-empresas__board-cell-main">{t("empresa.board.r2.task")}</span>
                    <span className="ax-empresas__board-tag">{t("empresa.board.r2.state")}</span>
                  </div>
                  <div className="ax-empresas__board-row">
                    <span className="ax-empresas__board-cell-main">{t("empresa.board.r3.task")}</span>
                    <span className="ax-empresas__board-tag ax-empresas__board-tag--wait">
                      {t("empresa.board.r3.state")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="ax-empresas__divider" aria-hidden />

        <section className="ax-empresas__section ax-empresas__section--pillars" aria-labelledby="empresa-pillars-title">
          <div className="ax-empresas__section-head">
            <h2 id="empresa-pillars-title" className="ax-empresas__section-title">
              {t("empresa.section.pillars.title")}
            </h2>
          </div>
          <ul className="ax-empresas__pillars">
            <li className="ax-empresas__pillar">
              <IconPillar>
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden>
                  <path
                    d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </IconPillar>
              <h3 className="ax-empresas__pillar-title">{t("empresa.pillar1.title")}</h3>
              <p className="ax-empresas__pillar-desc">{t("empresa.pillar1.desc")}</p>
            </li>
            <li className="ax-empresas__pillar">
              <IconPillar>
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden>
                  <path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconPillar>
              <h3 className="ax-empresas__pillar-title">{t("empresa.pillar2.title")}</h3>
              <p className="ax-empresas__pillar-desc">{t("empresa.pillar2.desc")}</p>
            </li>
            <li className="ax-empresas__pillar">
              <IconPillar>
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden>
                  <path
                    d="M4 7h16M4 12h10M4 17h16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </IconPillar>
              <h3 className="ax-empresas__pillar-title">{t("empresa.pillar3.title")}</h3>
              <p className="ax-empresas__pillar-desc">{t("empresa.pillar3.desc")}</p>
            </li>
          </ul>
        </section>

        <section className="ax-empresas__section" aria-labelledby="emp-usecases">
          <div className="ax-empresas__section-head">
            <h2 id="emp-usecases" className="ax-empresas__section-title">
              {t("empresa.section.usecases.title")}
            </h2>
          </div>
          <ul className="ax-empresas__grid">
            <li className="ax-empresas__card">
              <IconSupply />
              <h3 className="ax-empresas__card-title">{t("empresa.usecase.supply.title")}</h3>
              <p className="ax-empresas__card-desc">{t("empresa.usecase.supply.desc")}</p>
            </li>
            <li className="ax-empresas__card">
              <IconProcurement />
              <h3 className="ax-empresas__card-title">{t("empresa.usecase.procurement.title")}</h3>
              <p className="ax-empresas__card-desc">{t("empresa.usecase.procurement.desc")}</p>
            </li>
            <li className="ax-empresas__card">
              <IconFinance />
              <h3 className="ax-empresas__card-title">{t("empresa.usecase.finance.title")}</h3>
              <p className="ax-empresas__card-desc">{t("empresa.usecase.finance.desc")}</p>
            </li>
            <li className="ax-empresas__card">
              <IconCompliance />
              <h3 className="ax-empresas__card-title">{t("empresa.usecase.compliance.title")}</h3>
              <p className="ax-empresas__card-desc">{t("empresa.usecase.compliance.desc")}</p>
            </li>
          </ul>
        </section>

        <section className="ax-empresas__section" id="empresa-how" aria-labelledby="emp-how">
          <div className="ax-empresas__section-head">
            <h2 id="emp-how" className="ax-empresas__section-title">
              {t("empresa.section.how.title")}
            </h2>
          </div>
          <ol className="ax-empresas__steps">
            <li className="ax-empresas__step">
              <span className="ax-empresas__step-num" aria-hidden>
                1
              </span>
              <div className="ax-empresas__step-body">
                <h3 className="ax-empresas__step-title">{t("empresa.how.1.title")}</h3>
                <p className="ax-empresas__step-desc">{t("empresa.how.1.desc")}</p>
              </div>
            </li>
            <li className="ax-empresas__step">
              <span className="ax-empresas__step-num" aria-hidden>
                2
              </span>
              <div className="ax-empresas__step-body">
                <h3 className="ax-empresas__step-title">{t("empresa.how.2.title")}</h3>
                <p className="ax-empresas__step-desc">{t("empresa.how.2.desc")}</p>
              </div>
            </li>
            <li className="ax-empresas__step">
              <span className="ax-empresas__step-num" aria-hidden>
                3
              </span>
              <div className="ax-empresas__step-body">
                <h3 className="ax-empresas__step-title">{t("empresa.how.3.title")}</h3>
                <p className="ax-empresas__step-desc">{t("empresa.how.3.desc")}</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="ax-empresas__section ax-empresas__section--security" aria-labelledby="emp-sec">
          <h2 id="emp-sec" className="ax-empresas__section-title ax-empresas__section-title--inset">
            {t("empresa.section.security.title")}
          </h2>
          <p className="ax-empresas__security-body">{t("empresa.security.body")}</p>
        </section>

        <section className="ax-empresas__final" aria-labelledby="emp-cta">
          <h2 id="emp-cta" className="ax-empresas__final-title">
            {t("empresa.final.title")}
          </h2>
          <p className="ax-empresas__final-lead">{t("empresa.final.lead")}</p>

          <div className="ax-empresas__cta">
            <a href={portalUrl} className="ax-empresas__btn ax-empresas__btn--primary" rel="noopener noreferrer">
              {t("empresa.cta.primary")}
            </a>
            <a href={MAIN_SITE_URL} className="ax-empresas__btn ax-empresas__btn--ghost">
              {t("empresa.cta.secondary")}
            </a>
          </div>

          <p className="ax-empresas__note">{t("empresa.footer.note")}</p>
        </section>

        <footer className="ax-empresas__foot">
          <div className="ax-empresas__foot-row">
            <span>© {year} ArcusX</span>
            <span className="ax-empresas__foot-links">
              <a href={mainPrivacy} className="ax-empresas__foot-link" rel="noopener noreferrer">
                {t("empresa.footer.privacy")}
              </a>
              <span aria-hidden className="ax-empresas__foot-dot">
                ·
              </span>
              <a href={mainTerms} className="ax-empresas__foot-link" rel="noopener noreferrer">
                {t("empresa.footer.terms")}
              </a>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

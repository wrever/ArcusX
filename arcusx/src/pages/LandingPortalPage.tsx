import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { PORTAL_APP_URL, PORTAL_ENTERPRISE_URL } from "../config/portalChoice";
import "../css/LandingPortalPage.css";

function IconChevron() {
  return (
    <svg
      className="ax-landing__chevron"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function LandingPortalPage() {
  const year = new Date().getFullYear();

  return (
    <div className="ax-landing">
      <Helmet>
        <title>ArcusX — Elegir acceso</title>
        <meta name="description" content="Elegí la experiencia ArcusX: general o empresarial." />
        <meta name="theme-color" content="#0a0c10" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
          rel="stylesheet"
        />
      </Helmet>

      <div className="ax-landing__bg" aria-hidden />

      <header className="ax-landing__header">
        <Link to="/" className="ax-landing__brand">
          <span className="ax-landing__brand-mark">A</span>
          <span className="ax-landing__brand-name">ArcusX</span>
        </Link>
      </header>

      <main className="ax-landing__main">
        <div className="ax-landing__intro">
          <h1 className="ax-landing__title">¿Cómo querés entrar?</h1>
          <p className="ax-landing__subtitle">Dos experiencias, una plataforma.</p>
        </div>

        <div className="ax-landing__bridge" role="group" aria-label="Elegir experiencia">
          <a href={PORTAL_APP_URL} className="ax-landing__path ax-landing__path--general" rel="noopener noreferrer">
            <span className="ax-landing__path-label">Uso general</span>
            <IconChevron />
          </a>

          <span className="ax-landing__between" aria-hidden>
            o
          </span>

          <a
            href={PORTAL_ENTERPRISE_URL}
            className="ax-landing__path ax-landing__path--enterprise"
            rel="noopener noreferrer"
          >
            <span className="ax-landing__path-label">Empresas</span>
            <IconChevron />
          </a>
        </div>
      </main>

      <footer className="ax-landing__footer">
        <p className="ax-landing__footer-copy">© {year} ArcusX</p>
      </footer>
    </div>
  );
}

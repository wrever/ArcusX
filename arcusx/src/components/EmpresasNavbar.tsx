import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../contexts/ThemeContext";
import { MAIN_SITE_URL } from "../config/enterpriseSite";
import logoDark from "../images/arcus-logo.png";
import logoLight from "../images/arcusxlogoclaro.png";
import "../css/EmpresasNavbar.css";

/**
 * Navbar corporativa: documentación, sitio público, login/registro.
 * Menú hamburguesa en viewport estrecho.
 */
export default function EmpresasNavbar() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const logo = theme === "light" ? logoLight : logoDark;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <nav className={`empresas-navbar ${scrolled ? "empresas-navbar--scrolled" : ""} ${open ? "empresas-navbar--open" : ""}`}>
      <div className="empresas-navbar__inner">
        <Link to="/" className="empresas-navbar__brand" onClick={close}>
          <img src={logo} alt="ArcusX" className="empresas-navbar__logo" />
          <span className="empresas-navbar__badge">{t("empresa.nav.badge")}</span>
        </Link>

        <button
          type="button"
          className="empresas-navbar__hamburger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="empresas-nav-panel"
          aria-label={open ? t("empresa.nav.aria.close_menu") : t("empresa.nav.aria.open_menu")}
        >
          <span className={`empresas-navbar__hamburger-line ${open ? "is-open" : ""}`} />
          <span className={`empresas-navbar__hamburger-line ${open ? "is-open" : ""}`} />
          <span className={`empresas-navbar__hamburger-line ${open ? "is-open" : ""}`} />
        </button>

        <div id="empresas-nav-panel" className="empresas-navbar__links">
          <a
            href="https://docs.arcusx.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="empresas-navbar__link"
            onClick={close}
          >
            {t("nav.docs")}
          </a>
          <a
            href={MAIN_SITE_URL}
            className="empresas-navbar__link empresas-navbar__link--pill-accent"
            onClick={close}
          >
            {t("empresa.nav.public_site")}
          </a>
          <Link to="/login" className="empresas-navbar__btn empresas-navbar__btn--ghost" onClick={close}>
            {t("nav.login")}
          </Link>
          <Link to="/register" className="empresas-navbar__btn empresas-navbar__btn--solid" onClick={close}>
            {t("nav.register")}
          </Link>
        </div>
      </div>
    </nav>
  );
}

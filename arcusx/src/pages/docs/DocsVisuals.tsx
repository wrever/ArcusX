import { motion } from 'framer-motion';

/** Comparación de comisión: plataformas típicas vs ArcusX (barras animadas). */
export function FeeCompareChart({
  title,
  typicalLabel,
  arcusLabel,
  typicalPct = 15,
  arcusPct = 2,
}: {
  title: string;
  typicalLabel: string;
  arcusLabel: string;
  typicalPct?: number;
  arcusPct?: number;
}) {
  const max = Math.max(typicalPct, arcusPct, 20);
  return (
    <figure className="ax-docs-viz ax-docs-viz--bars" aria-label={title}>
      <figcaption className="ax-docs-viz__caption">{title}</figcaption>
      <div className="ax-docs-viz__bars">
        <div className="ax-docs-viz__bar-row">
          <span className="ax-docs-viz__bar-label">{typicalLabel}</span>
          <div className="ax-docs-viz__bar-track">
            <motion.div
              className="ax-docs-viz__bar ax-docs-viz__bar--muted"
              initial={{ width: 0 }}
              whileInView={{ width: `${(typicalPct / max) * 100}%` }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <strong className="ax-docs-viz__bar-val">{typicalPct}%</strong>
        </div>
        <div className="ax-docs-viz__bar-row">
          <span className="ax-docs-viz__bar-label">{arcusLabel}</span>
          <div className="ax-docs-viz__bar-track">
            <motion.div
              className="ax-docs-viz__bar ax-docs-viz__bar--accent"
              initial={{ width: 0 }}
              whileInView={{ width: `${(arcusPct / max) * 100}%` }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <strong className="ax-docs-viz__bar-val ax-docs-viz__bar-val--accent">{arcusPct}%</strong>
        </div>
      </div>
    </figure>
  );
}

/** Donut: quién se queda con qué de 100 USDC. */
export function FeeSplitDonut({
  title,
  workerLabel,
  platformLabel,
  workerPct = 98,
  platformPct = 2,
}: {
  title: string;
  workerLabel: string;
  platformLabel: string;
  workerPct?: number;
  platformPct?: number;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const platformLen = (platformPct / 100) * c;
  const workerLen = c - platformLen;

  return (
    <figure className="ax-docs-viz ax-docs-viz--donut" aria-label={title}>
      <figcaption className="ax-docs-viz__caption">{title}</figcaption>
      <div className="ax-docs-viz__donut-wrap">
        <svg viewBox="0 0 140 140" className="ax-docs-viz__donut-svg" aria-hidden>
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="16"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--ax-docs-accent)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${workerLen} ${c}`}
            transform="rotate(-90 70 70)"
            initial={{ strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#5b8cff"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${platformLen} ${c}`}
            strokeDashoffset={-workerLen}
            transform="rotate(-90 70 70)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.4 }}
          />
          <text x="70" y="66" textAnchor="middle" className="ax-docs-viz__donut-center">
            100
          </text>
          <text x="70" y="84" textAnchor="middle" className="ax-docs-viz__donut-sub">
            USDC
          </text>
        </svg>
        <ul className="ax-docs-viz__legend">
          <li>
            <i className="ax-docs-viz__swatch ax-docs-viz__swatch--accent" />
            {workerLabel} · <strong>{workerPct}%</strong>
          </li>
          <li>
            <i className="ax-docs-viz__swatch ax-docs-viz__swatch--blue" />
            {platformLabel} · <strong>{platformPct}%</strong>
          </li>
        </ul>
      </div>
    </figure>
  );
}

/** Flujo vertical (pipeline) — legible en móvil, tablet y desktop. */
export function FlowSteps({
  title,
  steps,
}: {
  title: string;
  steps: { label: string; detail?: string }[];
}) {
  return (
    <figure className="ax-docs-viz ax-docs-viz--flow" aria-label={title}>
      <figcaption className="ax-docs-viz__caption">{title}</figcaption>
      <ol className="ax-docs-viz__pipeline">
        {steps.map((s, i) => (
          <motion.li
            key={s.label}
            className="ax-docs-viz__pipeline-step"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <div className="ax-docs-viz__pipeline-rail" aria-hidden>
              <span className="ax-docs-viz__pipeline-num">{i + 1}</span>
              {i < steps.length - 1 ? <span className="ax-docs-viz__pipeline-line" /> : null}
            </div>
            <div className="ax-docs-viz__pipeline-body">
              <strong>{s.label}</strong>
              {s.detail ? <code>{s.detail}</code> : null}
            </div>
          </motion.li>
        ))}
      </ol>
    </figure>
  );
}

/** Timeline vertical (historia / roadmap público). */
export function DocsTimeline({
  title,
  items,
}: {
  title: string;
  items: { when: string; text: string }[];
}) {
  return (
    <figure className="ax-docs-viz ax-docs-viz--timeline" aria-label={title}>
      <figcaption className="ax-docs-viz__caption">{title}</figcaption>
      <ol className="ax-docs-viz__timeline">
        {items.map((it, i) => (
          <motion.li
            key={`${it.when}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: i * 0.08, duration: 0.35 }}
          >
            <span className="ax-docs-viz__tl-dot" />
            <time>{it.when}</time>
            <p>{it.text}</p>
          </motion.li>
        ))}
      </ol>
    </figure>
  );
}

/** Hero visual de la home docs. */
export function DocsHomeHero({
  eyebrow,
  title,
  lead,
  ctaApp,
  ctaAppHref,
  ctaStart,
  ctaStartHref = '/guides',
}: {
  eyebrow: string;
  title: string;
  lead: string;
  ctaApp: string;
  ctaAppHref: string;
  ctaStart: string;
  ctaStartHref?: string;
}) {
  return (
    <motion.section
      className="ax-docs-hero"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="ax-docs-hero__glow" aria-hidden />
      <p className="ax-docs-hero__eyebrow">{eyebrow}</p>
      <h1 className="ax-docs-hero__title">{title}</h1>
      <p className="ax-docs-hero__lead">{lead}</p>
      <div className="ax-docs-hero__actions">
        <a className="ax-docs__cta" href={ctaAppHref}>
          {ctaApp}
        </a>
        <a className="ax-docs-hero__ghost" href={ctaStartHref}>
          {ctaStart}
        </a>
      </div>
      <div className="ax-docs-hero__grid" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
    </motion.section>
  );
}

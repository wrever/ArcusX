import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  docsLangFromApp,
  getDocsPage,
  getChapterById,
  type DocsBlock,
} from '../../content/docs/publicDocs';
import { useI18n } from '../../i18n/I18nProvider';
import SEO from '../../components/SEO';
import { MAIN_SITE_URL } from '../../config/enterpriseSite';
import {
  DocsHomeHero,
  DocsTimeline,
  FeeCompareChart,
  FeeSplitDonut,
  FlowSteps,
} from './DocsVisuals';
import DocsCode from './DocsCode';
import DocsToc, { extractToc, headingId } from './DocsToc';

function Block({ block }: { block: DocsBlock }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>;
    case 'h2':
      return <h2 id={headingId(block.text)}>{block.text}</h2>;
    case 'h3':
      return <h3 id={headingId(block.text)}>{block.text}</h3>;
    case 'ul':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case 'callout':
      return <div className="ax-docs__callout">{block.text}</div>;
    case 'code':
      return <DocsCode text={block.text} />;
    case 'stat':
      return (
        <div className="ax-docs__stats">
          {block.items.map((s) => (
            <motion.div
              key={s.label}
              className="ax-docs__stat"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
            >
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </motion.div>
          ))}
        </div>
      );
    case 'feeBars':
      return (
        <FeeCompareChart
          title={block.title}
          typicalLabel={block.typicalLabel}
          arcusLabel={block.arcusLabel}
          typicalPct={block.typicalPct}
          arcusPct={block.arcusPct}
        />
      );
    case 'feeDonut':
      return (
        <FeeSplitDonut
          title={block.title}
          workerLabel={block.workerLabel}
          platformLabel={block.platformLabel}
        />
      );
    case 'flow':
      return <FlowSteps title={block.title} steps={block.steps} />;
    case 'timeline':
      return <DocsTimeline title={block.title} items={block.items} />;
    case 'linkTable':
      return (
        <div className="ax-docs__table-wrap ax-docs__link-table">
          <table className="ax-docs__table">
            <thead>
              <tr>
                <th>{block.headers[0]}</th>
                <th>{block.headers[1]}</th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.path}>
                  <td>
                    <Link to={row.path}>{row.label}</Link>
                  </td>
                  <td>{row.blurb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'table':
      return (
        <div className="ax-docs__table-wrap">
          <table className="ax-docs__table">
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, i) => (
                    <td key={`${i}-${cell}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export default function DocsArticle({ path }: { path: string }) {
  const { lang, t } = useI18n();
  const docsLang = docsLangFromApp(lang);
  const page = getDocsPage(path, docsLang);

  if (!page) {
    return (
      <div className="ax-docs__content-col">
        <article className="ax-docs__main">
          <SEO title="404 | ArcusX Docs" />
          <h1 className="ax-docs__title">{t('docs.notFound')}</h1>
          <p className="ax-docs__lead">
            <Link to="/">{t('docs.backHome')}</Link>
          </p>
        </article>
      </div>
    );
  }

  const isHome = path === '/';
  const chapter = getChapterById(page.chapterId);
  const toc = extractToc(page.blocks);

  return (
    <div className="ax-docs__content-col">
      <article className="ax-docs__main">
        <SEO title={`${page.title} | ArcusX Docs`} description={page.description} />

        {isHome ? (
          <DocsHomeHero
            eyebrow="ArcusX Docs"
            title={page.title}
            lead={page.description || ''}
            ctaApp={t('docs.nav.openApp')}
            ctaAppHref={MAIN_SITE_URL}
            ctaStart={t('docs.hero.browse')}
            ctaStartHref="/guides"
          />
        ) : (
          <>
            <div className="ax-docs__meta-row">
              {chapter && (
                <>
                  <span
                    className={`ax-docs__meta-audience ax-docs__meta-audience--${chapter.audience}`}
                  >
                    {t(
                      chapter.audience === 'human'
                        ? 'docs.audience.human'
                        : 'docs.audience.tech',
                    )}
                  </span>
                  <span className="ax-docs__meta-chapter">
                    {chapter.label[docsLang] || chapter.label.en}
                  </span>
                </>
              )}
            </div>
            <h1 className="ax-docs__title">{page.title}</h1>
            {page.description ? <p className="ax-docs__lead">{page.description}</p> : null}
          </>
        )}

        <div className="ax-docs__prose">
          {page.blocks.map((block, i) => (
            <Block key={`${block.type}-${i}`} block={block} />
          ))}
        </div>

        <footer className="ax-docs__footer">
          © {new Date().getFullYear()} ArcusX Docs
        </footer>
      </article>

      {!isHome && <DocsToc items={toc} />}
    </div>
  );
}

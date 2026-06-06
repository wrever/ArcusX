import { Helmet } from 'react-helmet-async';
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_TYPE,
  DEFAULT_OG_TITLE,
  DEFAULT_OG_DESCRIPTION,
  absoluteUrl,
  ogLocaleTag,
} from '../config/siteSeo';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  canonical?: string;
  locale?: 'es' | 'en' | 'pt';
  structuredData?: object;
}

const SEO: React.FC<SEOProps> = ({
  title = DEFAULT_OG_TITLE,
  description = DEFAULT_OG_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  url = '/',
  type = 'website',
  noindex = false,
  canonical,
  locale = 'es',
  structuredData,
}) => {
  const finalUrl = absoluteUrl(url);
  const finalCanonical = canonical ? absoluteUrl(canonical) : finalUrl;
  const finalImage = absoluteUrl(image);
  const finalTitle =
    title.includes('ArcusX') || title.includes('Arcus') || title.includes('Arcu')
      ? title
      : `${title} | ArcusX`;

  const alternateLocales: Array<'es' | 'en' | 'pt'> = ['es', 'en', 'pt'];
  const ogLocale = ogLocaleTag(locale);
  const ogLocaleAlternates = alternateLocales
    .filter((l) => l !== locale)
    .map(ogLocaleTag);

  const getKeywords = () => {
    const baseKeywords =
      'trabajos online, trabajos remotos, trabajos stellar, freelancing stellar, trabajos web3, trabajos blockchain, microtareas, freelancing, stellar blockchain, usdc, pagos instantaneos, trabajos freelance, trabajos online latam, arcusx, arcus, arcu, arcusx pro';
    const urlKeywords = url.toLowerCase();

    if (urlKeywords.includes('login') || urlKeywords.includes('iniciar')) {
      return `${baseKeywords}, iniciar sesion, login arcusx, acceder a trabajos online`;
    }
    if (urlKeywords.includes('register') || urlKeywords.includes('registro')) {
      return `${baseKeywords}, registrarse, crear cuenta, unirse a arcusx, trabajos freelance stellar`;
    }
    if (urlKeywords.includes('profile') || urlKeywords.includes('perfil')) {
      return `${baseKeywords}, perfil freelancer, perfil publico, trabajador stellar`;
    }

    return baseKeywords;
  };

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={getKeywords()} />
      <meta name="author" content="ArcusX Team" />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <meta
        name="language"
        content={locale === 'es' ? 'Spanish' : locale === 'pt' ? 'Portuguese' : 'English'}
      />
      <meta name="revisit-after" content="7 days" />

      <link rel="canonical" href={finalCanonical} />

      {alternateLocales.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${SITE_URL}/${lang}${url === '/' ? '' : url}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:secure_url" content={finalImage} />
      <meta property="og:image:type" content={DEFAULT_OG_IMAGE_TYPE} />
      <meta property="og:image:width" content={String(DEFAULT_OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(DEFAULT_OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:site_name" content="ArcusX" />
      <meta property="og:locale" content={ogLocale} />
      {ogLocaleAlternates.map((alt) => (
        <meta key={alt} property="og:locale:alternate" content={alt} />
      ))}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ArcusX_one" />
      <meta name="twitter:creator" content="@ArcusX_one" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:image:alt" content={imageAlt} />

      <meta name="theme-color" content="#07233c" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="ArcusX" />

      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
};

export default SEO;

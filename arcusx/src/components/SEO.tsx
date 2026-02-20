import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  canonical?: string;
  locale?: 'es' | 'en' | 'pt';
  structuredData?: object;
}

const SEO: React.FC<SEOProps> = ({
  title = 'Trabajos Online en Stellar | ArcusX - Plataforma de Freelancing Web3',
  description = 'Encuentra trabajos online en Stellar blockchain. Plataforma de freelancing Web3 con pagos instantáneos en USDC. Trabajos remotos para LATAM. Microtareas, freelancing en Stellar, trabajos Web3, trabajos blockchain. Arcus, Arcu.',
  image = 'https://arcusx.pro/arcus-logo.png',
  url = 'https://arcusx.pro',
  type = 'website',
  noindex = false,
  canonical,
  locale = 'es',
  structuredData,
}) => {
  const siteUrl = 'https://arcusx.pro';
  const finalUrl = url.startsWith('http') ? url : `${siteUrl}${url}`;
  const finalCanonical = canonical || finalUrl;
  const finalImage = image.startsWith('http') ? image : `${siteUrl}${image}`;
  const finalTitle = title.includes('ArcusX') || title.includes('Arcus') || title.includes('Arcu') ? title : `${title} | ArcusX`;
  
  const alternateLocales = locale === 'es'
    ? ['en', 'es', 'pt']
    : locale === 'pt'
      ? ['es', 'en', 'pt']
      : ['es', 'en', 'pt'];

  // Keywords dinámicas basadas en la página
  const getKeywords = () => {
    const baseKeywords = 'trabajos online, trabajos remotos, trabajos stellar, freelancing stellar, trabajos web3, trabajos blockchain, microtareas, freelancing, stellar blockchain, usdc, pagos instantaneos, trabajos freelance, trabajos online latam, arcusx, arcus, arcu, arcusx pro';
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
      {/* Meta básicos */}
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={getKeywords()} />
      <meta name="author" content="ArcusX Team" />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <meta name="language" content={locale === 'es' ? 'Spanish' : 'English'} />
      <meta name="revisit-after" content="7 days" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonical} />
      
      {/* hreflang tags para multiidioma */}
      {alternateLocales.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${siteUrl}/${lang}${url === '/' ? '' : url}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={siteUrl} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:site_name" content="ArcusX" />
      <meta property="og:locale" content={locale === 'es' ? 'es_ES' : 'en_US'} />
      <meta property="og:locale:alternate" content={locale === 'es' ? 'en_US' : 'es_ES'} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ArcusX_one" />
      <meta name="twitter:creator" content="@ArcusX_one" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={finalImage} />
      
      {/* Mobile */}
      <meta name="theme-color" content="#07233c" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="ArcusX" />
      
      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;


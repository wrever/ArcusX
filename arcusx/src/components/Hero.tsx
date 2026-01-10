import { Link } from 'react-router-dom';
import { FaRocket, FaUsers, FaLaptopCode, FaMoneyBillWave, FaArrowRight, FaLinkedin, FaTwitter, FaGithub } from 'react-icons/fa';
import '../css/Hero.css';
import { useI18n } from '../i18n/I18nProvider';
import Footer from './Footer';
import SEO from './SEO';
import brunoImg from '../images/bruno.jpg';
import pauImg from '../images/paukoh.jpg';
import crisImg from '../images/cris.png';
import desempleoImg from '../images/desempleo.webp';
import gananciaImg from '../images/ganancia.webp';

const Hero = () => {
  const { t, lang } = useI18n();
  
  // Structured Data para Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ArcusX',
    alternateName: ['Arcus', 'Arcu', 'ArcusX Pro'],
    url: 'https://arcusx.pro',
    logo: 'https://arcusx.pro/arcus-logo.png',
    description: 'Plataforma de trabajos online en Stellar blockchain. Freelancing Web3 con pagos instantáneos en USDC. Trabajos remotos para LATAM.',
    sameAs: [
      'https://twitter.com/ArcusX_one',
      'https://instagram.com/arcusx_',
      'https://www.linkedin.com/in/arcus-x-000348342/',
      'https://warpcast.com/arcusx'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['Spanish', 'English', 'Portuguese']
    },
    keywords: 'trabajos online, trabajos stellar, freelancing stellar, trabajos web3, trabajos blockchain, microtareas, arcusx, arcus, arcu'
  };

  // Structured Data para WebSite
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ArcusX - Trabajos Online en Stellar',
    alternateName: ['Arcus', 'Arcu', 'ArcusX Pro'],
    url: 'https://arcusx.pro',
    description: 'Encuentra trabajos online en Stellar blockchain. Plataforma de freelancing Web3 con pagos instantáneos en USDC.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://arcusx.pro/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    },
    inLanguage: ['es', 'en', 'pt']
  };

  // Structured Data para Service
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Freelancing Platform',
    name: 'Trabajos Online en Stellar Blockchain',
    provider: {
      '@type': 'Organization',
      name: 'ArcusX'
    },
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: '-23.5505',
        longitude: '-46.6333'
      }
    },
    description: 'Plataforma de trabajos online en Stellar blockchain. Freelancing Web3 con pagos seguros mediante contratos escrow. Microtareas para LATAM.',
    offers: {
      '@type': 'Offer',
      price: '0.5',
      priceCurrency: 'USD',
      description: 'Comisión del 0.5% por transacción (vs 10-20% en plataformas tradicionales)'
    },
    keywords: 'trabajos online, trabajos stellar, freelancing stellar, trabajos web3, microtareas, arcusx'
  };

  // Structured Data para Product (Plataforma)
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'ArcusX - Plataforma de Trabajos Online en Stellar',
    description: 'Plataforma de freelancing Web3 para encontrar y realizar trabajos online en Stellar blockchain',
    brand: {
      '@type': 'Brand',
      name: 'ArcusX'
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      url: 'https://arcusx.pro/register'
    }
  };

  const combinedStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema, websiteSchema, serviceSchema, productSchema]
  };
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <SEO
        title="Trabajos Online en Stellar | ArcusX - Plataforma de Freelancing Web3 para LATAM"
        description="Encuentra trabajos online en Stellar blockchain. Plataforma de freelancing Web3 con pagos instantáneos en USDC. Trabajos remotos para LATAM. Microtareas, freelancing en Stellar, trabajos Web3. Arcus, Arcu, ArcusX."
        url="/"
        locale={lang}
        structuredData={combinedStructuredData}
      />
      <div className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            {t('hero.title.line1')}{' '}
            <span className="hero-title-highlight">{t('hero.title.web3')}</span>{' '}
            {t('hero.title.for')}{' '}
            <span className="hero-title-highlight">{t('hero.title.talent')}</span>{' '}
            {t('hero.title.latam')}
          </h1>
          <p className="hero-description">
            {t('hero.desc')}
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">10+</span>
              <span className="stat-label">{t('hero.stats.tasks')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">50+</span>
              <span className="stat-label">{t('hero.stats.users')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">$1K+</span>
              <span className="stat-label">{t('hero.stats.payments.processed')}</span>
            </div>
          </div>
          <div className="hero-buttons">
            <Link to="/register" className="hero-button primary">
              {t('hero.button.start')} <FaArrowRight />
            </Link>
            <Link to="/login" className="hero-button secondary">
              {t('hero.button.demo')}
            </Link>
          </div>
        </div>
        <div className="hero-3d">
          <div className="floating-particles">
            <div className="particle particle-1">
              <h3 className="job-title">Desarrollador Frontend React</h3>
              <p className="job-company">TechCorp Solutions</p>
              <div className="job-details">
                <span>Remoto</span>
                <span>Tiempo Completo</span>
              </div>
              <div className="job-price">
                Desde <span>$2,500</span> USD/mes
              </div>
              <div className="job-tags">
                <span className="job-tag">React</span>
                <span className="job-tag">TypeScript</span>
                <span className="job-tag">Next.js</span>
              </div>
            </div>

            <div className="particle particle-2">
              <h3 className="job-title">Diseñador UI/UX Senior</h3>
              <p className="job-company">Creative Digital Agency</p>
              <div className="job-details">
                <span>Híbrido</span>
                <span>Proyecto</span>
              </div>
              <div className="job-price">
                Desde <span>$45</span> USD/hora
              </div>
              <div className="job-tags">
                <span className="job-tag">Figma</span>
                <span className="job-tag">Adobe XD</span>
                <span className="job-tag">UI/UX</span>
              </div>
            </div>

            <div className="particle particle-3">
              <h3 className="job-title">Marketing Manager</h3>
              <p className="job-company">Growth Experts</p>
              <div className="job-details">
                <span>Remoto</span>
                <span>Part-time</span>
              </div>
              <div className="job-price">
                Desde <span>$1,800</span> USD/mes
              </div>
              <div className="job-tags">
                <span className="job-tag">SEO</span>
                <span className="job-tag">SEM</span>
                <span className="job-tag">Analytics</span>
              </div>
            </div>

            <div className="particle particle-4">
              <h3 className="job-title">Desarrollador iOS</h3>
              <p className="job-company">AppTech Solutions</p>
              <div className="job-details">
                <span>Remoto</span>
                <span>Por Proyecto</span>
              </div>
              <div className="job-price">
                Desde <span>$4,000</span> USD/mes
              </div>
              <div className="job-tags">
                <span className="job-tag">Swift</span>
                <span className="job-tag">SwiftUI</span>
                <span className="job-tag">iOS</span>
              </div>
            </div>

            <div className="particle particle-5">
              <h3 className="job-title">Data Scientist</h3>
              <p className="job-company">Data Insights Co.</p>
              <div className="job-details">
                <span>Remoto</span>
                <span>Tiempo Completo</span>
              </div>
              <div className="job-price">
                Desde <span>$3,500</span> USD/mes
              </div>
              <div className="job-tags">
                <span className="job-tag">Python</span>
                <span className="job-tag">ML</span>
                <span className="job-tag">AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="problematica" className="problem-section">
        <div className="section-container">
          <div className="problem-content">
            <div className="problem-image-container">
              <img src={desempleoImg} alt="Búsqueda de trabajo" className="problem-image" />
              <div className="image-overlay"></div>
              <div className="image-dots"></div>
            </div>
            <div className="problem-info">
              <div className="problem-header">
                <span className="subtitle">{t('problem.title')}</span>
                <h2 className="problem-title">
                  {t('problem.subtitle')}{' '}
                  <span className="highlight-text">{t('problem.subtitle.highlight')}</span>
                </h2>
                <p className="problem-description">
                  {t('problem.desc')}
                </p>
              </div>

              <div className="stats-container">
                <div className="stat-box">
                  <div className="stat-number">{t('problem.stat1.number')}</div>
                  <div className="stat-label">{t('problem.stat1.label')}</div>
                  <div className="stat-description">
                    {t('problem.stat1.desc')}
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-number">{t('problem.stat2.number')}</div>
                  <div className="stat-label">{t('problem.stat2.label')}</div>
                  <div className="stat-description">
                    {t('problem.stat2.desc')}
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-number">{t('problem.stat3.number')}</div>
                  <div className="stat-label">{t('problem.stat3.label')}</div>
                  <div className="stat-description">
                    {t('problem.stat3.desc')}
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-number">{t('problem.stat4.number')}</div>
                  <div className="stat-label">{t('problem.stat4.label')}</div>
                  <div className="stat-description">
                    {t('problem.stat4.desc')}
                  </div>
                </div>
              </div>

              <div className="action-buttons">
                <button 
                  onClick={() => scrollToSection('solucion')} 
                  className="action-button primary"
                >
                  {t('problem.button.solution')}
                </button>
                <button className="action-button secondary">{t('problem.button.read')}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="solucion" className="solution-section">
        <div className="section-container">
          <div className="solution-content">
            <div className="solution-info">
              <div className="solution-header">
                <span className="subtitle">{t('solution.title')}</span>
                <h2 className="problem-title">
                  {t('solution.subtitle')}{' '}
                  <span className="highlight-text">{t('solution.subtitle.highlight')}</span>
                </h2>
                <p className="problem-description">
                  {t('solution.desc')}
                </p>
              </div>

              <div className="stats-container">
                <div className="stat-box">
                  <div className="stat-number">{t('solution.stat1.number')}</div>
                  <div className="stat-label">{t('solution.stat1.label')}</div>
                  <div className="stat-description">
                    {t('solution.stat1.desc')}
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-number">{t('solution.stat2.number')}</div>
                  <div className="stat-label">{t('solution.stat2.label')}</div>
                  <div className="stat-description">
                    {t('solution.stat2.desc')}
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-number">{t('solution.stat3.number')}</div>
                  <div className="stat-label">{t('solution.stat3.label')}</div>
                  <div className="stat-description">
                    {t('solution.stat3.desc')}
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-number">{t('solution.stat4.number')}</div>
                  <div className="stat-label">{t('solution.stat4.label')}</div>
                  <div className="stat-description">
                    {t('solution.stat4.desc')}
                  </div>
                </div>
              </div>

              <div className="action-buttons">
                <Link to="/register" className="action-button primary">
                  {t('solution.button.start')}
                </Link>
              </div>
            </div>
            {/*CODE OWNER: BRUNO MIRANDA*/}
            <div className="problem-image-container">
              <img src={gananciaImg} alt="Ganancias en ArcusX" className="problem-image" />
              <div className="image-overlay"></div>
              <div className="image-dots"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="features-section">
        <div className="features-container">
          <h2 className="features-title">{t('features.title')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaRocket />
              </div>
              <h3>{t('features.card1.title')}</h3>
              <p>{t('features.card1.desc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaUsers />
              </div>
              <h3>{t('features.card2.title')}</h3>
              <p>{t('features.card2.desc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaLaptopCode />
              </div>
              <h3>{t('features.card3.title')}</h3>
              <p>{t('features.card3.desc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FaMoneyBillWave />
              </div>
              <h3>{t('features.card4.title')}</h3>
              <p>{t('features.card4.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="equipo" className="team-section">
        
        <div className="section-container">
          
          <h2 className="section-title">{t('team.title')}</h2>
          <div className="team-content">
            <div className="team-intro">
              <p>{t('team.desc')}</p>
            </div>
            <div className="team-grid">
              <div className="team-card">
                <div className="team-member-image">
                  <img src={brunoImg} alt="Bruno Miranda" className="member-img" />
                </div>
                
                <div className="member-info">
                  <h3>Bruno Miranda E.</h3>
                  <p className="member-role">{t('team.bruno.role')}</p>
                  <p className="member-bio">{t('team.bruno.bio')}</p>
                  
                  <div className="hero-buttons">
                    <Link to="https://www.linkedin.com/in/bruno-miranda-31602b260/" className="hero-button primary">
                      <FaLinkedin />
                    </Link>

                    <Link to="https://x.com/Brunixsoo/" className="hero-button primary">
                      <FaTwitter />
                    </Link>

                    <Link to="https://github.com/wrever" className="hero-button primary">
                      <FaGithub />
                    </Link>

                  </div>
                </div>
              </div>
              <div className="team-card">
                <div className="team-member-image">
                  <img src={crisImg} alt="Cristopher Escobar" className="member-img" />
                </div>
                <div className="member-info">
                  <h3>Cristopher Escobar</h3>
                  <p className="member-role">{t('team.cris.role')}</p>
                  <p className="member-bio">{t('team.cris.bio')}</p>
                  <div className="hero-buttons">
                    <Link to="https://www.linkedin.com/in/cristopher-escobar-espinoza/" className="hero-button primary">
                      <FaLinkedin />
                    </Link>
                    <Link to="https://x.com/Ckryzxs" className="hero-button primary">
                      <FaTwitter />
                    </Link>
                    <Link to="https://github.com/Ckryzx" className="hero-button primary">
                      <FaGithub />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="team-card">
                <div className="team-member-image">
                  <img src={pauImg} alt="Pau Koh" className="member-img" />
                </div>
                <div className="member-info">
                  <h3>Pau Koh</h3>
                  <p className="member-role">{t('team.pau.role')}</p>
                  <p className="member-bio">{t('team.pau.bio')}</p>
                  <div className="hero-buttons">
                    <Link to="https://www.linkedin.com/in/kloren/" className="hero-button primary">
                      <FaLinkedin />
                    </Link>
                    <Link to="https://x.com/kl0ren" className="hero-button primary">
                      <FaTwitter />
                    </Link>
                    <Link to="https://github.com/Klorenn" className="hero-button primary">
                      <FaGithub />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="faq-section">
        <div className="container">
          <h2 className="section-title light">{t('faq.title')}</h2>
          <div className="faq-grid">
            <div className="faq-card">
              <h3 className="faq-question">{t('faq.q1')}</h3>
              <div className="faq-answer">
                <p>{t('faq.a1')}</p>
              </div>
            </div>
            <div className="faq-card">
              <h3 className="faq-question">{t('faq.q2')}</h3>
              <div className="faq-answer">
                <p>{t('faq.a2')}</p>
              </div>
            </div>
            <div className="faq-card">
              <h3 className="faq-question">{t('faq.q3')}</h3>
              <div className="faq-answer">
                <p>{t('faq.a3')}</p>
              </div>
            </div>
            <div className="faq-card">
              <h3 className="faq-question">{t('faq.q4')}</h3>
              <div className="faq-answer">
                <p>{t('faq.a4')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2>{t('hero.cta.title')}</h2>
            <p>{t('hero.cta.desc')}</p>
            <Link to="/register" className="cta-button">
              {t('hero.cta.button')} <FaArrowRight />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
    </>
  );
};

export default Hero; 
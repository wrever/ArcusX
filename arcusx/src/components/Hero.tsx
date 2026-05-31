import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { FaRocket, FaUsers, FaLaptopCode, FaMoneyBillWave, FaArrowRight, FaLock, FaBolt, FaCheck, FaMapMarkedAlt, FaChevronDown, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import axios from '../config/axios';
import { arcusxApiUrl } from '../config/arcusxApi';
import { hasSupabase, supabase } from '../config/supabase';
import { getFreelancers } from '../services/freelancerService';
import type { Freelancer } from '../types/freelancer';
import { getAvatarUrl } from '../utils/avatarUtils';
import { normalizeDisplayText } from '../utils/utf8Mojibake';
import '../css/Hero.css';
import { useI18n } from '../i18n/I18nProvider';
import Footer from './Footer';
import SEO from './SEO';

/** URL de /create-task con contexto de contratación (también leída por query en CreateTask). */
function buildHireTaskUrl(freelancer: Freelancer): string {
  const firstSkill = freelancer.skills?.[0];
  const skillLabel =
    typeof firstSkill === 'string'
      ? firstSkill
      : firstSkill &&
          typeof firstSkill === 'object' &&
          firstSkill !== null &&
          'name' in firstSkill
        ? String((firstSkill as { name: string }).name)
        : undefined;
  const params = new URLSearchParams();
  params.set('for_user', String(freelancer.id));
  params.set('hire_username', encodeURIComponent(freelancer.username));
  if (skillLabel) params.set('hire_skill', encodeURIComponent(skillLabel));
  return `/create-task?${params.toString()}`;
}

function freelancerDisplayInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface TaskResult {
  id: number;
  title: string;
  description?: string;
  price: string;
  currency: string;
  category?: string;
  difficulty?: string;
  creator_username?: string;
  created_at?: string;
  proposal_count?: number;
}

/** Hero landing: <10 valor exacto; ≥10 prefijo + y piso a decenas (199 → +190). */
function formatHeroLandingCount(n: number): string {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v < 10) return String(v);
  return `+${Math.floor(v / 10) * 10}`;
}

/** Misma regla en dólares enteros (647 → +$640; 5 → $5). */
function formatHeroLandingMoney(usdc: number): string {
  const v = Math.max(0, Math.round(Number(usdc) || 0));
  if (v < 10) return `$${v}`;
  return `+$${Math.floor(v / 10) * 10}`;
}

const viewportScroll = { once: true, amount: 0.2 };
const viewportScrollSoft = { once: true, amount: 0.15 };

const Hero = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [expandedRoadmap, setExpandedRoadmap] = useState<Set<number>>(() => new Set([2, 3, 4]));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaskResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const [carouselTasks, setCarouselTasks] = useState<TaskResult[]>([]);
  const [loadingCarousel, setLoadingCarousel] = useState(true);
  const [landingFreelancers, setLandingFreelancers] = useState<Freelancer[]>([]);
  const [loadingLandingFreelancers, setLoadingLandingFreelancers] = useState(true);
  const [publicStats, setPublicStats] = useState<{
    open_tasks: number;
    total_users: number;
    total_volume_usdc: number;
  } | null>(null);

  // Carrusel infinito: muchas copias de la lista para sensación de “millones de opciones”; el scroll avanza y al pasar un bloque se reubica sin que se note
  const REPEAT_COPIES = 8;
  const infiniteCarouselTasks = carouselTasks.length > 0
    ? Array.from({ length: REPEAT_COPIES }, () => carouselTasks).flat()
    : [];
  const infiniteLandingFreelancers = landingFreelancers.length > 0
    ? Array.from({ length: REPEAT_COPIES }, () => landingFreelancers).flat()
    : [];
  const oneSetWidthRef = useRef(0);
  const autoScrollRef = useRef<number | null>(null);
  const freelancerCarouselRef = useRef<HTMLDivElement>(null);
  const freelancerTrackRef = useRef<HTMLDivElement>(null);
  const freelancerOneSetWidthRef = useRef(0);
  const freelancerAutoScrollRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchCarouselTasks = async () => {
      setLoadingCarousel(true);
      try {
        const url = arcusxApiUrl('get_tasks', { sort_by: 'date_desc' });
        const response = await axios.get(url);
        const data = Array.isArray(response.data) ? response.data : (response.data?.tasks ?? []);
        setCarouselTasks(Array.isArray(data) ? data.slice(0, 12) : []);
      } catch {
        setCarouselTasks([]);
      } finally {
        setLoadingCarousel(false);
      }
    };
    fetchCarouselTasks();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLandingFreelancers = async () => {
      setLoadingLandingFreelancers(true);
      try {
        const res = await getFreelancers({
          page: 1,
          limit: 40,
          sortBy: 'rating',
          sortOrder: 'desc',
          preferProfile: true,
        });
        if (!cancelled) {
          const list = Array.isArray(res.freelancers) ? res.freelancers : [];
          setLandingFreelancers(list.slice(0, 16));
        }
      } catch {
        if (!cancelled) setLandingFreelancers([]);
      } finally {
        if (!cancelled) setLoadingLandingFreelancers(false);
      }
    };
    loadLandingFreelancers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPublicStats = async () => {
      let open_tasks = 0;
      let total_users = 0;
      let total_volume_usdc = 0;

      if (hasSupabase) {
        try {
          const [uRes, oRes, vRes] = await Promise.all([
            supabase.rpc('get_landing_oauth_user_count'),
            supabase.rpc('get_landing_open_tasks_count'),
            supabase.rpc('get_landing_completed_volume_usdc'),
          ]);
          if (cancelled) return;
          const parseRpcInt = (data: unknown): number | null => {
            if (data == null) return null;
            const n = typeof data === 'string' ? parseInt(data, 10) : Number(data);
            return !Number.isNaN(n) && n >= 0 ? n : null;
          };
          if (!uRes.error) {
            const n = parseRpcInt(uRes.data);
            if (n != null) total_users = n;
          }
          if (!oRes.error) {
            const n = parseRpcInt(oRes.data);
            if (n != null) open_tasks = n;
          }
          if (!vRes.error) {
            const n = parseRpcInt(vRes.data);
            if (n != null) total_volume_usdc = n;
          }
        } catch {
          /* 0 */
        }
      } else {
        try {
          const res = await axios.get<{
            success?: boolean;
            open_tasks?: number;
            total_users?: number;
            total_volume_usdc?: number;
          }>(`${arcusxApiUrl('get_landing_market_stats')}`);
          if (cancelled) return;
          const d = res.data;
          if (d && d.success !== false) {
            open_tasks = Number(d.open_tasks) || 0;
            total_users = Number(d.total_users) || 0;
            total_volume_usdc = Number(d.total_volume_usdc) || 0;
          }
        } catch {
          /* valores en 0 */
        }
      }

      if (!cancelled) {
        setPublicStats({ open_tasks, total_users, total_volume_usdc });
      }
    };
    loadPublicStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(() => {
      const fetchTasks = async () => {
        setLoadingSearch(true);
        try {
          const params = new URLSearchParams();
          params.append('search', searchQuery.trim());
          params.append('sort_by', 'date_desc');
          const response = await axios.get(arcusxApiUrl('get_tasks', params));
          const data = Array.isArray(response.data) ? response.data : (response.data?.tasks ?? []);
          setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
          setShowResults(true);
        } catch {
          setSearchResults([]);
          setShowResults(true);
        } finally {
          setLoadingSearch(false);
        }
      };
      fetchTasks();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyClick = (taskId: number) => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate(`/apply-task/${taskId}`);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(`/apply-task/${taskId}`)}`);
    }
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleFreelancerHireClick = (freelancer: Freelancer) => {
    const target = buildHireTaskUrl(freelancer);
    const token = localStorage.getItem('token');
    if (token) {
      navigate(target);
    } else {
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
    }
  };

  const scrollCarousel = (dir: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  /** Botones: inverso al carrusel de tareas (misma sensación que el auto-scroll RTL del track). */
  const scrollFreelancerCarousel = (dir: 'left' | 'right') => {
    const el = freelancerCarouselRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === 'left' ? step : -step, behavior: 'smooth' });
  };

  // Movimiento automático continuo; se reinicia cuando el carrusel se muestra de nuevo (p. ej. al borrar la búsqueda)
  const showCarousel = searchQuery.trim().length < 2;
  useEffect(() => {
    if (!showCarousel || carouselTasks.length === 0) return;
    const viewport = carouselRef.current;
    const track = carouselTrackRef.current;
    if (!viewport || !track) return;

    const setWidth = track.scrollWidth / REPEAT_COPIES;
    if (setWidth <= 0) return;
    oneSetWidthRef.current = setWidth;

    const SPEED_PX = 0.85;
    const loop = () => {
      const setW = oneSetWidthRef.current;
      if (setW <= 0) {
        autoScrollRef.current = requestAnimationFrame(loop);
        return;
      }
      const next = viewport.scrollLeft + SPEED_PX;
      viewport.scrollLeft = next >= setW ? next - setW : next;
      autoScrollRef.current = requestAnimationFrame(loop);
    };

    autoScrollRef.current = requestAnimationFrame(loop);
    return () => {
      if (autoScrollRef.current != null) cancelAnimationFrame(autoScrollRef.current);
    };
  }, [carouselTasks.length, showCarousel]);

  useEffect(() => {
    if (landingFreelancers.length === 0) return;
    const viewport = freelancerCarouselRef.current;
    const track = freelancerTrackRef.current;
    if (!viewport || !track) return;

    const setWidth = track.scrollWidth / REPEAT_COPIES;
    if (setWidth <= 0) return;
    freelancerOneSetWidthRef.current = setWidth;

    // Evita un frame en 0 y salto al envolver: empezar dentro del primer bloque repetido.
    const maxStart = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollLeft = Math.min(Math.max(0, setWidth * 0.5), maxStart);

    const SPEED_PX = 0.85;
    const loop = () => {
      const setW = freelancerOneSetWidthRef.current;
      if (setW <= 0) {
        freelancerAutoScrollRef.current = requestAnimationFrame(loop);
        return;
      }
      // Sentido opuesto al carrusel de tareas (tareas: scrollLeft +; freelancers: −).
      let next = viewport.scrollLeft - SPEED_PX;
      if (next < 0) {
        next += setW;
      }
      viewport.scrollLeft = next;
      freelancerAutoScrollRef.current = requestAnimationFrame(loop);
    };

    freelancerAutoScrollRef.current = requestAnimationFrame(loop);
    return () => {
      if (freelancerAutoScrollRef.current != null) cancelAnimationFrame(freelancerAutoScrollRef.current);
    };
  }, [landingFreelancers.length]);

  const toggleRoadmap = (index: number) => {
    setExpandedRoadmap((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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
    contactPoint: { '@type': 'ContactPoint', contactType: 'Customer Service', availableLanguage: ['Spanish', 'English', 'Portuguese'] },
    keywords: 'trabajos online, trabajos stellar, freelancing stellar, trabajos web3, arcusx'
  };
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ArcusX - Trabajos Online en Stellar',
    url: 'https://arcusx.pro',
    description: 'Encuentra trabajos online en Stellar blockchain. Freelancing Web3 con pagos instantáneos en USDC.',
    inLanguage: ['es', 'en', 'pt']
  };
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Freelancing Platform',
    name: 'Trabajos Online en Stellar Blockchain',
    provider: { '@type': 'Organization', name: 'ArcusX' },
    description: 'Plataforma de trabajos online en Stellar con escrow seguro y pagos en USDC.',
    offers: { '@type': 'Offer', price: '3', priceCurrency: 'USD', description: 'Comisión 3% al cliente en escrow por transacción' }
  };
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'ArcusX - Plataforma de Trabajos Online en Stellar',
    description: 'Plataforma de freelancing Web3 para encontrar y realizar trabajos online en Stellar blockchain',
    brand: { '@type': 'Brand', name: 'ArcusX' },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: 'https://arcusx.pro/register' }
  };
  const combinedStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [organizationSchema, websiteSchema, serviceSchema, productSchema]
  };

  return (
    <>
      <SEO
        title={t('hero.seo.title')}
        description={t('hero.seo.description')}
        url="/"
        locale={lang}
        structuredData={combinedStructuredData}
      />
      <div className="landing">
        {/* — Hero: centrado, impacto inmediato — */}
        <header className="landing-hero">
          {/* Capas de estrellas con parpadeo desfasado (efecto aleatorio) */}
          <div className="landing-hero-starfield" aria-hidden="true">
            <div className="landing-hero-starfield-layer landing-hero-starfield-layer-1" />
            <div className="landing-hero-starfield-layer landing-hero-starfield-layer-2" />
            <div className="landing-hero-starfield-layer landing-hero-starfield-layer-3" />
            <div className="landing-hero-starfield-layer landing-hero-starfield-layer-4" />
            <div className="landing-hero-starfield-layer landing-hero-starfield-layer-5" />
            <div className="landing-hero-starfield-layer landing-hero-starfield-layer-6" />
          </div>
          <div className="landing-hero-inner">
            <h1 className="landing-hero-title">
              {t('hero.title.line1')}{' '}
              <span className="landing-hero-highlight">{t('hero.title.web3')}</span>{' '}
              {t('hero.title.for')}{' '}
              <span className="landing-hero-highlight">{t('hero.title.talent')}</span>{' '}
              {t('hero.title.latam')}
            </h1>
            <p className="landing-hero-desc">{t('hero.desc')}</p>
            {/* Stats arriba del buscador (lupa) */}
            <div className="landing-hero-trust" role="list" aria-label={t('hero.stats.aria')}>
              <span className="landing-hero-stat-item" role="listitem">
                <span className="landing-hero-stat">
                  {formatHeroLandingCount(publicStats?.open_tasks ?? 0)}
                </span>
                <span className="landing-hero-stat-desc">{t('hero.stats.tasks')}</span>
              </span>
              <span className="landing-hero-stat-sep" aria-hidden="true">·</span>
              <span className="landing-hero-stat-item" role="listitem">
                <span className="landing-hero-stat">
                  {formatHeroLandingCount(publicStats?.total_users ?? 0)}
                </span>
                <span className="landing-hero-stat-desc">{t('hero.stats.users')}</span>
              </span>
              <span className="landing-hero-stat-sep" aria-hidden="true">·</span>
              <span className="landing-hero-stat-item" role="listitem">
                <span className="landing-hero-stat">
                  {formatHeroLandingMoney(publicStats?.total_volume_usdc ?? 0)}
                </span>
                <span className="landing-hero-stat-desc">{t('hero.stats.payments.processed')}</span>
              </span>
            </div>
            <div className="landing-hero-job-search" ref={searchRef}>
              <div className="landing-hero-search-bar">
                <FaSearch className="landing-hero-search-icon" aria-hidden />
                <input
                  type="search"
                  className="landing-hero-search-input"
                  placeholder={t('hero.search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                  autoComplete="off"
                  aria-label={t('hero.search.placeholder')}
                />
                {loadingSearch && (
                  <span className="landing-hero-search-loading" aria-live="polite">
                    {t('hero.search.searching')}
                  </span>
                )}
              </div>
              {showResults && searchQuery.trim().length >= 2 && (
                <div className="landing-hero-search-results">
                  {loadingSearch && searchResults.length === 0 ? (
                    <p className="landing-hero-search-results-loading">{t('hero.search.searching')}</p>
                  ) : searchResults.length === 0 ? (
                    <p className="landing-hero-search-results-empty">{t('hero.search.noResults')}</p>
                  ) : (
                    <>
                      <p className="landing-hero-search-results-heading">
                        {t('hero.search.resultsCount').replace('{{count}}', String(searchResults.length))}
                      </p>
                      <ul className="landing-hero-search-results-list" role="list">
                        {searchResults.map((task) => (
                          <li key={task.id} className="landing-hero-search-card">
                            <div className="landing-hero-search-card-content">
                              <h3 className="landing-hero-search-card-title">{task.title}</h3>
                              {(task.category || task.difficulty) && (
                                <span className="landing-hero-search-card-meta">
                                  {[task.category, task.difficulty].filter(Boolean).join(' · ')}
                                </span>
                              )}
                              {task.description && (
                                <p className="landing-hero-search-card-desc">
                                  {task.description.slice(0, 100)}{task.description.length > 100 ? '…' : ''}
                                </p>
                              )}
                              <div className="landing-hero-search-card-footer">
                                <span className="landing-hero-search-card-price">
                                  {parseFloat(task.price).toFixed(2)} {task.currency}
                                </span>
                                <button
                                  type="button"
                                  className="landing-hero-search-card-apply"
                                  onClick={() => handleApplyClick(task.id)}
                                >
                                  {t('hero.search.apply')} <FaArrowRight />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* — Carrusel justo debajo del buscador; se oculta si hay búsqueda activa — */}
            {searchQuery.trim().length < 2 && (
              <section className="hero-carousel-section hero-carousel-in-hero" aria-label={t('hero.carousel.aria')}>
                <div className="hero-carousel-wrap">
                  {loadingCarousel ? (
                    <p className="hero-carousel-loading">{t('hero.carousel.loading')}</p>
                  ) : carouselTasks.length === 0 ? (
                    <p className="hero-carousel-empty">{t('hero.carousel.empty')}</p>
                  ) : (
                    <div className="hero-carousel-nav-wrap">
                      <button type="button" className="hero-carousel-btn hero-carousel-btn-prev" onClick={() => scrollCarousel('left')} aria-label={t('hero.carousel.prev')}>
                        <FaChevronLeft />
                      </button>
                      <div className="hero-carousel-viewport" ref={carouselRef}>
                        <div className="hero-carousel-track" ref={carouselTrackRef}>
                          {infiniteCarouselTasks.map((task, idx) => (
                            <article key={`${task.id}-${idx}`} className="hero-carousel-card">
                              <h3 className="hero-carousel-card-title">{task.title}</h3>
                              {(task.category || task.difficulty) && (
                                <span className="hero-carousel-card-meta">
                                  {[task.category, task.difficulty].filter(Boolean).join(' · ')}
                                </span>
                              )}
                              {task.description && (
                                <p className="hero-carousel-card-desc">
                                  {task.description.slice(0, 120)}{task.description.length > 120 ? '…' : ''}
                                </p>
                              )}
                              <div className="hero-carousel-card-footer">
                                <span className="hero-carousel-card-price">
                                  {task.price && parseFloat(task.price).toFixed(2)} {task.currency || 'USDC'}
                                </span>
                                <button type="button" className="hero-carousel-card-apply" onClick={() => handleApplyClick(task.id)}>
                                  {t('hero.search.apply')} <FaArrowRight />
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                      <button type="button" className="hero-carousel-btn hero-carousel-btn-next" onClick={() => scrollCarousel('right')} aria-label={t('hero.carousel.next')}>
                        <FaChevronRight />
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </header>

        {/* — Trust strip: rápido y seguro — */}
        <section className="landing-trust-strip" aria-label={t('landing.trust.aria')}>
          <div className="landing-trust-strip-inner">
            <span className="landing-trust-text">{t('landing.trust.line')}</span>
          </div>
        </section>

        <section className="hero-carousel-section hero-freelancer-carousel-section" aria-label={t('hero.freelancer.carousel.aria')}>
          <div className="hero-carousel-wrap">
            {loadingLandingFreelancers ? (
              <p className="hero-carousel-loading">{t('hero.freelancer.carousel.loading')}</p>
            ) : landingFreelancers.length === 0 ? (
              <p className="hero-carousel-empty">{t('hero.freelancer.carousel.empty')}</p>
            ) : (
              <div className="hero-carousel-nav-wrap">
                <button
                  type="button"
                  className="hero-carousel-btn hero-carousel-btn-prev"
                  onClick={() => scrollFreelancerCarousel('left')}
                  aria-label={t('hero.carousel.prev')}
                >
                  <FaChevronLeft />
                </button>
                <div className="hero-carousel-viewport hero-freelancer-carousel-viewport" ref={freelancerCarouselRef}>
                  <div className="hero-carousel-track" ref={freelancerTrackRef}>
                    {infiniteLandingFreelancers.map((fl, idx) => {
                      const avatarSrc = fl.avatar_url ? getAvatarUrl(fl.avatar_url) : null;
                      const rawBio = fl.bio?.trim() ?? '';
                      const normalizedBio = rawBio ? normalizeDisplayText(rawBio) : '';
                      const bioText = normalizedBio
                        ? `${normalizedBio.slice(0, 110)}${normalizedBio.length > 110 ? '…' : ''}`
                        : t('hero.freelancer.carousel.bioFallback');
                      const skillsPreview = (fl.skills || [])
                        .filter((s): s is string => typeof s === 'string')
                        .slice(0, 2)
                        .join(' · ');
                      const metaLine = t('hero.freelancer.carousel.meta')
                        .replace('{{rating}}', fl.average_rating.toFixed(1))
                        .replace('{{tasks}}', String(fl.tasks_completed));
                      return (
                        <article key={`${fl.id}-${idx}`} className="hero-carousel-card hero-freelancer-card">
                          <div className="hero-freelancer-card-top">
                            <div className="hero-freelancer-avatar-wrap">
                              {avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt={fl.username}
                                  className="hero-freelancer-avatar-img"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <span className="hero-freelancer-avatar-placeholder" aria-hidden>
                                  {freelancerDisplayInitials(fl.username)}
                                </span>
                              )}
                            </div>
                            <div className="hero-freelancer-card-head">
                              <button
                                type="button"
                                className="hero-freelancer-name-btn"
                                onClick={() => navigate(`/profile/${fl.id}`)}
                              >
                                {fl.username}
                              </button>
                              <span className="hero-carousel-card-meta hero-freelancer-meta-line">{metaLine}</span>
                              {skillsPreview ? (
                                <span className="hero-freelancer-skills-preview">{skillsPreview}</span>
                              ) : null}
                            </div>
                          </div>
                          <p className="hero-carousel-card-desc hero-freelancer-bio">{bioText}</p>
                          <div className="hero-carousel-card-footer hero-freelancer-card-footer">
                            {fl.has_payout_wallet ? (
                              <button
                                type="button"
                                className="hero-carousel-card-apply hero-freelancer-card-cta"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFreelancerHireClick(fl);
                                }}
                              >
                                {t('freelancers.card.hire')} <FaArrowRight />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="hero-carousel-card-apply hero-freelancer-card-cta hero-freelancer-card-cta-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${fl.id}`);
                                }}
                              >
                                {t('hero.freelancer.carousel.viewProfile')}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  className="hero-carousel-btn hero-carousel-btn-next"
                  onClick={() => scrollFreelancerCarousel('right')}
                  aria-label={t('hero.carousel.next')}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* — Value: trabajo real, pago real — */}
        <section id="valor" className="landing-value">
          <motion.div
            className="landing-value-inner"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportScroll}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="landing-value-content">
              <h2 className="landing-value-title">{t('landing.hero.tagline')}</h2>
              <p className="landing-value-desc">{t('solution.desc')}</p>
              <ul className="landing-value-list">
                <li>
                  <FaLaptopCode className="landing-value-icon" aria-hidden />
                  <span className="landing-value-list-text">{t('solution.stat1.label')}: {t('solution.stat1.desc')}</span>
                </li>
                <li>
                  <FaBolt className="landing-value-icon" aria-hidden />
                  <span className="landing-value-list-text">{t('solution.stat3.label')}: {t('solution.stat3.desc')}</span>
                </li>
                <li>
                  <FaLock className="landing-value-icon" aria-hidden />
                  <span className="landing-value-list-text">{t('solution.stat4.label')}: {t('solution.stat4.desc')}</span>
                </li>
              </ul>
              <Link to="/register" className="landing-value-cta">{t('solution.button.start')} <FaArrowRight /></Link>
            </div>
            <div className="landing-value-visual" aria-hidden="true">
              <div className="landing-value-diagram">
                <div className="landing-value-node landing-value-node-talent" title={t('solution.stat1.label')}>
                  <FaLaptopCode className="landing-value-node-icon" />
                  <span className="landing-value-node-label">{t('solution.stat1.label')}</span>
                </div>
                <div className="landing-value-connector landing-value-connector-h" aria-hidden="true">
                  <span className="landing-value-connector-line" />
                  <span className="landing-value-connector-flow" />
                </div>
                <div className="landing-value-node landing-value-node-escrow" title={t('solution.stat4.label')}>
                  <FaLock className="landing-value-node-icon" />
                  <span className="landing-value-node-label">{t('solution.stat4.label')}</span>
                </div>
                <div className="landing-value-connector landing-value-connector-diag-left" aria-hidden="true">
                  <span className="landing-value-connector-line" />
                  <span className="landing-value-connector-flow" />
                </div>
                <div className="landing-value-node landing-value-node-pay" title={t('solution.stat3.label')}>
                  <FaMoneyBillWave className="landing-value-node-icon" />
                  <span className="landing-value-node-label">{t('solution.stat3.label')}</span>
                </div>
                <div className="landing-value-connector landing-value-connector-diag-right" aria-hidden="true">
                  <span className="landing-value-connector-line" />
                  <span className="landing-value-connector-flow" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* — How it works: 3 pasos — */}
        <section id="como-funciona" className="landing-how">
          <motion.div
            className="landing-how-inner"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportScroll}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="landing-how-title">{t('landing.how.title')}</h2>
            <div className="landing-how-steps">
              <motion.div
                className="landing-how-step"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="landing-how-num">1</span>
                <h3 className="landing-how-step-title">{t('landing.how.step1')}</h3>
                <p className="landing-how-step-desc">{t('landing.how.desc1')}</p>
              </motion.div>
              <div className="landing-how-arrow" aria-hidden="true">→</div>
              <motion.div
                className="landing-how-step"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="landing-how-num">2</span>
                <h3 className="landing-how-step-title">{t('landing.how.step2')}</h3>
                <p className="landing-how-step-desc">{t('landing.how.desc2')}</p>
              </motion.div>
              <div className="landing-how-arrow" aria-hidden="true">→</div>
              <motion.div
                className="landing-how-step"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="landing-how-num">3</span>
                <h3 className="landing-how-step-title">{t('landing.how.step3')}</h3>
                <p className="landing-how-step-desc">{t('landing.how.desc3')}</p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* — Features: grilla 2x2 con más info — */}
        <section id="caracteristicas" className="landing-features">
          <div className="landing-features-inner">
            <motion.h2
              className="landing-features-title"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportScrollSoft}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('features.title')}
            </motion.h2>
            <motion.p
              className="landing-features-subtitle"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportScrollSoft}
              transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('features.subtitle')}
            </motion.p>
            <div className="landing-features-grid">
              <motion.article
                className="landing-feature"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-feature-icon"><FaRocket /></div>
                <h3>{t('features.card1.title')}</h3>
                <p>{t('features.card1.desc')}</p>
                <span className="landing-feature-bullet">{t('features.card1.bullet')}</span>
              </motion.article>
              <motion.article
                className="landing-feature"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.45, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-feature-icon"><FaMoneyBillWave /></div>
                <h3>{t('features.card4.title')}</h3>
                <p>{t('features.card4.desc')}</p>
                <span className="landing-feature-bullet">{t('features.card4.bullet')}</span>
              </motion.article>
              <motion.article
                className="landing-feature"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-feature-icon"><FaLaptopCode /></div>
                <h3>{t('features.card3.title')}</h3>
                <p>{t('features.card3.desc')}</p>
                <span className="landing-feature-bullet">{t('features.card3.bullet')}</span>
              </motion.article>
              <motion.article
                className="landing-feature"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.45, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-feature-icon"><FaUsers /></div>
                <h3>{t('features.card2.title')}</h3>
                <p>{t('features.card2.desc')}</p>
                <span className="landing-feature-bullet">{t('features.card2.bullet')}</span>
              </motion.article>
            </div>
          </div>
        </section>

        {/* — Roadmap ArcusX: timeline vertical alternado + animación al scroll — */}
        <section id="roadmap" className="landing-roadmap landing-roadmap--arcusx">
          <div className="landing-roadmap-inner">
            <motion.h2
              className="landing-roadmap-title"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportScrollSoft}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('roadmap.title')}
            </motion.h2>
            <motion.p
              className="landing-roadmap-subtitle"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportScrollSoft}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('roadmap.subtitle')}
            </motion.p>
            <div className="landing-roadmap-timeline">
              <div className="landing-roadmap-track" aria-hidden="true" />
              <div className="landing-roadmap-track-progress" aria-hidden="true" />
              <motion.div
                className={`landing-roadmap-item ${expandedRoadmap.has(0) ? 'landing-roadmap-item--expanded' : ''}`}
                data-phase="done"
                data-side="left"
                data-index={0}
                initial={{ opacity: 0, x: -28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-roadmap-content">
                  <div className="landing-roadmap-card">
                    <button
                      type="button"
                      className="landing-roadmap-accordion-trigger"
                      onClick={() => toggleRoadmap(0)}
                      aria-expanded={expandedRoadmap.has(0)}
                      aria-controls="roadmap-body-0"
                      id="roadmap-trigger-0"
                    >
                      <span className="landing-roadmap-phase-date">{t('roadmap.phase.mvp.date')}</span>
                      <h3>{t('roadmap.phase.mvp')}</h3>
                      <FaChevronDown className="landing-roadmap-accordion-icon" aria-hidden />
                    </button>
                    <div id="roadmap-body-0" className="landing-roadmap-card-body" hidden={!expandedRoadmap.has(0)}>
                      <ul>
                        <li>{t('roadmap.mvp.1')}</li>
                        <li>{t('roadmap.mvp.2')}</li>
                        <li>{t('roadmap.mvp.3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="landing-roadmap-node" aria-hidden="true">
                  <FaCheck />
                </div>
                <div className="landing-roadmap-spacer" aria-hidden="true" />
              </motion.div>
              <motion.div
                className={`landing-roadmap-item ${expandedRoadmap.has(1) ? 'landing-roadmap-item--expanded' : ''}`}
                data-phase="done"
                data-side="right"
                data-index={1}
                initial={{ opacity: 0, x: 28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-roadmap-spacer" aria-hidden="true" />
                <div className="landing-roadmap-node" aria-hidden="true">
                  <FaCheck />
                </div>
                <div className="landing-roadmap-content">
                  <div className="landing-roadmap-card">
                    <button
                      type="button"
                      className="landing-roadmap-accordion-trigger"
                      onClick={() => toggleRoadmap(1)}
                      aria-expanded={expandedRoadmap.has(1)}
                      aria-controls="roadmap-body-1"
                      id="roadmap-trigger-1"
                    >
                      <span className="landing-roadmap-phase-date">{t('roadmap.phase.done.date')}</span>
                      <h3>{t('roadmap.phase.done')}</h3>
                      <FaChevronDown className="landing-roadmap-accordion-icon" aria-hidden />
                    </button>
                    <div id="roadmap-body-1" className="landing-roadmap-card-body" hidden={!expandedRoadmap.has(1)}>
                      <ul>
                        <li>{t('roadmap.done.1')}</li>
                        <li>{t('roadmap.done.2')}</li>
                        <li>{t('roadmap.done.3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className={`landing-roadmap-item ${expandedRoadmap.has(2) ? 'landing-roadmap-item--expanded' : ''}`}
                data-phase="now"
                data-side="left"
                data-index={2}
                initial={{ opacity: 0, x: -28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-roadmap-content">
                  <div className="landing-roadmap-card">
                    <button
                      type="button"
                      className="landing-roadmap-accordion-trigger"
                      onClick={() => toggleRoadmap(2)}
                      aria-expanded={expandedRoadmap.has(2)}
                      aria-controls="roadmap-body-2"
                      id="roadmap-trigger-2"
                    >
                      <span className="landing-roadmap-phase-date">{t('roadmap.phase.now.date')}</span>
                      <h3>{t('roadmap.phase.now')}</h3>
                      <FaChevronDown className="landing-roadmap-accordion-icon" aria-hidden />
                    </button>
                    <div id="roadmap-body-2" className="landing-roadmap-card-body" hidden={!expandedRoadmap.has(2)}>
                      <ul>
                        <li>{t('roadmap.now.1')}</li>
                        <li>{t('roadmap.now.2')}</li>
                        <li>{t('roadmap.now.3')}</li>
                        <li>{t('roadmap.now.4')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="landing-roadmap-node" aria-hidden="true">
                  <FaMapMarkedAlt />
                </div>
                <div className="landing-roadmap-spacer" aria-hidden="true" />
              </motion.div>
              <motion.div
                className={`landing-roadmap-item ${expandedRoadmap.has(3) ? 'landing-roadmap-item--expanded' : ''}`}
                data-phase="next"
                data-side="right"
                data-index={3}
                initial={{ opacity: 0, x: 28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.5, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-roadmap-spacer" aria-hidden="true" />
                <div className="landing-roadmap-node" aria-hidden="true">
                  <FaMapMarkedAlt />
                </div>
                <div className="landing-roadmap-content">
                  <div className="landing-roadmap-card">
                    <button
                      type="button"
                      className="landing-roadmap-accordion-trigger"
                      onClick={() => toggleRoadmap(3)}
                      aria-expanded={expandedRoadmap.has(3)}
                      aria-controls="roadmap-body-3"
                      id="roadmap-trigger-3"
                    >
                      <span className="landing-roadmap-phase-date">{t('roadmap.phase.next.date')}</span>
                      <h3>{t('roadmap.phase.next')}</h3>
                      <FaChevronDown className="landing-roadmap-accordion-icon" aria-hidden />
                    </button>
                    <div id="roadmap-body-3" className="landing-roadmap-card-body" hidden={!expandedRoadmap.has(3)}>
                      <ul>
                        <li>{t('roadmap.next.1')}</li>
                        <li>{t('roadmap.next.2')}</li>
                        <li>{t('roadmap.next.3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className={`landing-roadmap-item ${expandedRoadmap.has(4) ? 'landing-roadmap-item--expanded' : ''}`}
                data-phase="vision"
                data-side="left"
                data-index={4}
                initial={{ opacity: 0, x: -28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.5, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-roadmap-content">
                  <div className="landing-roadmap-card">
                    <button
                      type="button"
                      className="landing-roadmap-accordion-trigger"
                      onClick={() => toggleRoadmap(4)}
                      aria-expanded={expandedRoadmap.has(4)}
                      aria-controls="roadmap-body-4"
                      id="roadmap-trigger-4"
                    >
                      <span className="landing-roadmap-phase-date">{t('roadmap.phase.vision.date')}</span>
                      <h3>{t('roadmap.phase.vision')}</h3>
                      <FaChevronDown className="landing-roadmap-accordion-icon" aria-hidden />
                    </button>
                    <div id="roadmap-body-4" className="landing-roadmap-card-body" hidden={!expandedRoadmap.has(4)}>
                      <ul>
                        <li>{t('roadmap.vision.1')}</li>
                        <li>{t('roadmap.vision.2')}</li>
                        <li>{t('roadmap.vision.3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="landing-roadmap-node" aria-hidden="true">
                  <FaMapMarkedAlt />
                </div>
                <div className="landing-roadmap-spacer" aria-hidden="true" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* — FAQ: 2x2 — */}
        <section id="faq" className="landing-faq">
          <div className="landing-faq-inner">
            <motion.h2
              className="landing-faq-title"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportScrollSoft}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('faq.title')}
            </motion.h2>
            <div className="landing-faq-grid">
              <motion.article
                className="landing-faq-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="landing-faq-q">{t('faq.q1')}</h3>
                <p className="landing-faq-a">{t('faq.a1')}</p>
              </motion.article>
              <motion.article
                className="landing-faq-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="landing-faq-q">{t('faq.q2')}</h3>
                <p className="landing-faq-a">{t('faq.a2')}</p>
              </motion.article>
              <motion.article
                className="landing-faq-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.4, delay: 0.19, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="landing-faq-q">{t('faq.q3')}</h3>
                <p className="landing-faq-a">{t('faq.a3')}</p>
              </motion.article>
              <motion.article
                className="landing-faq-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportScroll}
                transition={{ duration: 0.4, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="landing-faq-q">{t('faq.q4')}</h3>
                <p className="landing-faq-a">{t('faq.a4')}</p>
              </motion.article>
            </div>
          </div>
        </section>

        {/* — CTA final — */}
        <section className="landing-cta">
          <motion.div
            className="landing-cta-inner"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportScroll}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="landing-cta-title">{t('hero.cta.title')}</h2>
            <p className="landing-cta-desc">{t('hero.cta.desc')}</p>
            <Link to="/register" className="landing-cta-btn">
              {t('hero.cta.button')} <FaArrowRight />
            </Link>
          </motion.div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Hero;

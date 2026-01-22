/**
 * FreelancersList.tsx
 * Componente principal para mostrar lista de freelancers con filtros, búsqueda y paginación
 */

import { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaSortAmountDown, FaChevronLeft, FaChevronRight, FaSpinner } from 'react-icons/fa';
import { getFreelancers } from '../services/freelancerService';
import type { Freelancer, FreelancerFilters } from '../types/freelancer';
import FreelancerCard from './FreelancerCard';
import { useI18n } from '../i18n/I18nProvider';
import { useDebounce } from '../hooks/useDebounce';
import '../css/FreelancersList.css';

const FreelancersList = () => {
  const { t } = useI18n();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [minTasks, setMinTasks] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<FreelancerFilters['sortBy']>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Debounce para búsqueda usando hook personalizado
  const searchDebounced = useDebounce(search, 500);

  const fetchFreelancers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: FreelancerFilters = {
        page,
        limit,
        search: searchDebounced.trim() || undefined,
        minRating: minRating !== '' ? Number(minRating) : undefined,
        minTasks: minTasks !== '' ? Number(minTasks) : undefined,
        sortBy,
        sortOrder,
      };

      const response = await getFreelancers(filters);
      setFreelancers(response.freelancers);
      setTotalPages(response.pagination.total_pages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar freelancers');
      setFreelancers([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, minRating, minTasks, sortBy, sortOrder]);

  // Efecto para cargar freelancers
  useEffect(() => {
    fetchFreelancers();
  }, [fetchFreelancers]);

  // Resetear página cuando cambia la búsqueda o filtros
  useEffect(() => {
    setPage(1);
  }, [searchDebounced, minRating, minTasks, sortBy, sortOrder]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleMinRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinRating(value === '' ? '' : Number(value));
  };

  const handleMinTasksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinTasks(value === '' ? '' : Number(value));
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as FreelancerFilters['sortBy']);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-btn ${i === page ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="pagination-btn pagination-nav"
          title={t('freelancers.pagination.previous')}
        >
          <FaChevronLeft />
          <span>{t('freelancers.pagination.previous')}</span>
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="pagination-btn"
            >
              1
            </button>
            {startPage > 2 && <span className="pagination-ellipsis">...</span>}
          </>
        )}

        {pages}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="pagination-btn"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="pagination-btn pagination-nav"
          title={t('freelancers.pagination.next')}
        >
          <span>{t('freelancers.pagination.next')}</span>
          <FaChevronRight />
        </button>
      </div>
    );
  };

  if (loading && freelancers.length === 0) {
    return (
      <div className="freelancers-list-container">
        <div className="loading-container">
          <FaSpinner className="spinner-icon" />
          <p>{t('freelancers.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && freelancers.length === 0) {
    return (
      <div className="freelancers-list-container">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchFreelancers} className="retry-button">
            {t('freelancers.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="freelancers-list-container">
      <div className="freelancers-list-header">
        <h2 className="freelancers-title">{t('freelancers.title')}</h2>
      </div>

      <div className="freelancers-filters">
        <div className="filter-row">
          <div className="filter-group search-group">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder={t('freelancers.search.placeholder')}
              value={search}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label>{t('freelancers.filter.rating')}</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              placeholder="0.0"
              value={minRating}
              onChange={handleMinRatingChange}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>{t('freelancers.filter.tasks')}</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={minTasks}
              onChange={handleMinTasksChange}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>{t('freelancers.filter.sort')}</label>
            <div className="sort-controls">
              <select
                value={sortBy}
                onChange={handleSortByChange}
                className="sort-select"
              >
                <option value="rating">{t('freelancers.filter.sort.rating')}</option>
                <option value="tasks_completed">{t('freelancers.filter.sort.tasks')}</option>
                <option value="total_earned">{t('freelancers.filter.sort.earned')}</option>
                <option value="joined_date">{t('freelancers.filter.sort.joined')}</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-order-btn"
                title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
              >
                <FaSortAmountDown style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && freelancers.length > 0 && (
        <div className="loading-overlay">
          <FaSpinner className="spinner-icon" />
        </div>
      )}

      {freelancers.length === 0 && !loading ? (
        <div className="no-freelancers">
          <p>{t('freelancers.no.results')}</p>
        </div>
      ) : (
        <>
          <div className="freelancers-grid">
            {freelancers.map((freelancer) => (
              <FreelancerCard key={freelancer.id} freelancer={freelancer} />
            ))}
          </div>

          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default FreelancersList;


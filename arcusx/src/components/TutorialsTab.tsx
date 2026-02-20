import React from 'react';
import { FaPlay, FaYoutube } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import type { Lang } from '../i18n/translations';
import '../css/TutorialsTab.css';

interface Tutorial {
  id: number;
  title: { es: string; en: string };
  description: { es: string; en: string };
  thumbnail: string;
  youtubeUrl: string;
  duration?: string;
}

/** Devuelve el texto en el idioma indicado; si es 'pt' usa 'es' como fallback (los tutoriales solo tienen es/en). */
function getTutorialText(text: { es: string; en: string }, lang: Lang): string {
  if (lang === 'pt') return text.es;
  return text[lang];
}

const TutorialsTab: React.FC = () => {
  const { t, lang } = useI18n();

  // Array de tutoriales en orden lógico de aprendizaje
  const tutorials: Tutorial[] = [
    {
      id: 1,
      title: {
        es: 'Introducción a Stellar y Wallets',
        en: 'Introduction to Stellar and Wallets'
      },
      description: {
        es: 'Conoce qué es Stellar, cómo funciona la blockchain y qué wallets puedes usar. Aprende sobre Freighter y otras opciones para gestionar tus activos digitales.',
        en: 'Learn what Stellar is, how the blockchain works and what wallets you can use. Learn about Freighter and other options to manage your digital assets.'
      },
      thumbnail: 'https://img.youtube.com/vi/UvOQeifU9Qc/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/UvOQeifU9Qc',
      duration: '5:27'
    },
    {
      id: 2,
      title: {
        es: 'Introducción a ArcusX',
        en: 'Introduction to ArcusX'
      },
      description: {
        es: 'Aprende qué es ArcusX, cómo funciona la plataforma, qué puedes hacer como cliente o freelancer, y los conceptos básicos para empezar a usarla.',
        en: 'Learn what ArcusX is, how the platform works, what you can do as a client or freelancer, and the basic concepts to get started.'
      },
      thumbnail: 'https://img.youtube.com/vi/lxytFT_MarI/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/lxytFT_MarI',
      duration: '3:23'
    },
    {
      id: 3,
      title: {
        es: 'Cómo Conectar tu Wallet Freighter',
        en: 'How to Connect your Freighter Wallet'
      },
      description: {
        es: 'Aprende a conectar tu wallet Freighter a la plataforma ArcusX de forma rápida y sencilla.',
        en: 'Learn how to connect your Freighter wallet to the ArcusX platform quickly and easily.'
      },
      thumbnail: 'https://img.youtube.com/vi/7glLKl1_AQk/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/7glLKl1_AQk',
      duration: '1:19'
    },
    {
      id: 4,
      title: {
        es: 'Cómo Crear tu Primera Tarea',
        en: 'How to Create your First Task'
      },
      description: {
        es: 'Guía completa para publicar tu primera tarea en ArcusX: establecer presupuesto, descripción, categorías y todo lo necesario para encontrar al freelancer perfecto.',
        en: 'Complete guide to publish your first task on ArcusX: set budget, description, categories and everything needed to find the perfect freelancer.'
      },
      thumbnail: 'https://img.youtube.com/vi/_h67MSoIc54/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/_h67MSoIc54',
      duration: '1:58'
    },
    {
      id: 5,
      title: {
        es: 'Cómo Aplicar a una Tarea',
        en: 'How to Apply to a Task'
      },
      description: {
        es: 'Aprende cómo aplicar a tareas como freelancer: crear una propuesta atractiva, mostrar tu portafolio y aumentar tus posibilidades de ser seleccionado.',
        en: 'Learn how to apply to tasks as a freelancer: create an attractive proposal, show your portfolio and increase your chances of being selected.'
      },
      thumbnail: 'https://img.youtube.com/vi/iVnqCM-87BU/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/iVnqCM-87BU',
      duration: '1:14'
    },
    {
      id: 6,
      title: {
        es: 'Escoger a tu Freelancer Ideal, Aprobarlo y Fondear Tarea',
        en: 'Choose your Ideal Freelancer, Approve them and Fund Task'
      },
      description: {
        es: 'Explicación detallada del funcionamiento del escrow en ArcusX: cómo fondear una tarea y liberar pagos de forma segura.',
        en: 'Detailed explanation of how escrow works on ArcusX: how to fund a task and release payments securely.'
      },
      thumbnail: 'https://img.youtube.com/vi/Fr6nTCuXvlA/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/Fr6nTCuXvlA',
      duration: '2:01'
    },
    {
      id: 7,
      title: {
        es: 'Supervisar y Completar Tareas',
        en: 'Supervise and Complete Tasks'
      },
      description: {
        es: 'Aprende cómo comunicarte con el freelancer durante el trabajo, revisar entregables y completar una tarea exitosamente.',
        en: 'Learn how to communicate with the freelancer during work, review deliverables and successfully complete a task.'
      },
      thumbnail: 'https://img.youtube.com/vi/m9NYRqIaDIg/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/m9NYRqIaDIg',
      duration: '1:50'
    },
    {
      id: 8,
      title: {
        es: 'Cómo Usar el Swap de la Plataforma',
        en: 'How to Use the Platform Swap'
      },
      description: {
        es: 'Aprende a intercambiar XLM y USDC de forma rápida y segura usando la función de swap integrada en ArcusX.',
        en: 'Learn how to swap XLM and USDC quickly and securely using the integrated swap feature on ArcusX.'
      },
      thumbnail: 'https://img.youtube.com/vi/yreoraIbj8I/maxresdefault.jpg',
      youtubeUrl: 'https://youtu.be/yreoraIbj8I',
      duration: '1:13'
    }
  ];

  const handleWatchTutorial = (youtubeUrl: string) => {
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="tutorials-container">
      <div className="tutorials-header">
        <h2>{t('tutorials.title')}</h2>
        <p className="tutorials-subtitle">{t('tutorials.subtitle')}</p>
      </div>

      <div className="tutorials-grid">
        {tutorials.map((tutorial) => (
          <div key={tutorial.id} className="tutorial-card">
            <div className="tutorial-thumbnail">
              <img
                src={tutorial.thumbnail}
                alt={getTutorialText(tutorial.title, lang)}
                loading="lazy"
                onError={(e) => {
                  // Si falla la imagen, usar un placeholder genérico
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/640x360/0a0a0a/10dd88?text=ArcusX+Tutorial';
                }}
              />
              <div className="tutorial-play-overlay">
                <FaYoutube className="play-icon" />
              </div>
            </div>

            <div className="tutorial-content">
              <h3 className="tutorial-title">{getTutorialText(tutorial.title, lang)}</h3>
              <p className="tutorial-description">{getTutorialText(tutorial.description, lang)}</p>

              {tutorial.duration && (
                <div className="tutorial-meta">
                  <span className="tutorial-duration">⏱️ {tutorial.duration}</span>
                </div>
              )}

              <button
                className="tutorial-watch-btn"
                onClick={() => handleWatchTutorial(tutorial.youtubeUrl)}
                aria-label={`${t('tutorials.watch')}: ${getTutorialText(tutorial.title, lang)}`}
              >
                <FaPlay />
                <span>{t('tutorials.watch')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TutorialsTab;

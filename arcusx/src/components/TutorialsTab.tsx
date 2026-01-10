import React from 'react';
import { FaPlay, FaYoutube } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import '../css/TutorialsTab.css';

interface Tutorial {
  id: number;
  title: {
    es: string;
    en: string;
  };
  description: {
    es: string;
    en: string;
  };
  thumbnail: string;
  youtubeUrl: string;
  duration?: string;
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
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_1/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_1',
      duration: '8:00'
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
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_2/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_2',
      duration: '6:30'
    },
    {
      id: 3,
      title: {
        es: 'Cómo Conectar tu Wallet Freighter',
        en: 'How to Connect your Freighter Wallet'
      },
      description: {
        es: 'Tutorial paso a paso para instalar Freighter, crear tu wallet y conectar tu cuenta a la plataforma ArcusX.',
        en: 'Step-by-step tutorial to install Freighter, create your wallet and connect your account to the ArcusX platform.'
      },
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_3/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_3',
      duration: '5:00'
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
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_4/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_4',
      duration: '7:00'
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
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_5/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_5',
      duration: '6:00'
    },
    {
      id: 6,
      title: {
        es: 'Sistema de Escrow y Pagos',
        en: 'Escrow System and Payments'
      },
      description: {
        es: 'Explicación detallada del funcionamiento del escrow en ArcusX: cómo fondear una tarea, aprobar trabajo y liberar pagos de forma segura.',
        en: 'Detailed explanation of how escrow works on ArcusX: how to fund a task, approve work and release payments securely.'
      },
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_6/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_6',
      duration: '10:00'
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
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_7/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_7',
      duration: '8:30'
    },
    {
      id: 8,
      title: {
        es: 'Gestión de Disputas',
        en: 'Dispute Management'
      },
      description: {
        es: 'Cómo crear una disputa cuando surge un problema, proporcionar evidencia y entender el proceso de resolución de conflictos.',
        en: 'How to create a dispute when a problem arises, provide evidence and understand the conflict resolution process.'
      },
      thumbnail: 'https://img.youtube.com/vi/VIDEO_ID_8/maxresdefault.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID_8',
      duration: '9:00'
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
                alt={tutorial.title[lang]}
                loading="lazy"
                onError={(e) => {
                  // Si falla la imagen, usar un placeholder genérico
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/640x360/07233c/28c0f0?text=ArcusX+Tutorial';
                }}
              />
              <div className="tutorial-play-overlay">
                <FaYoutube className="play-icon" />
              </div>
            </div>

            <div className="tutorial-content">
              <h3 className="tutorial-title">{tutorial.title[lang]}</h3>
              <p className="tutorial-description">{tutorial.description[lang]}</p>

              {tutorial.duration && (
                <div className="tutorial-meta">
                  <span className="tutorial-duration">⏱️ {tutorial.duration}</span>
                </div>
              )}

              <button
                className="tutorial-watch-btn"
                onClick={() => handleWatchTutorial(tutorial.youtubeUrl)}
                aria-label={`${t('tutorials.watch')}: ${tutorial.title[lang]}`}
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

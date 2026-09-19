import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Week1Demo from './Week1Demo';
import AgenticPaymentsDemo from './AgenticPaymentsDemo';
import './app.css';

type View = 'agentic' | 'week1' | 'harness';

function readView(): View {
  const q = new URLSearchParams(window.location.search).get('view');
  if (q === 'harness' || q === 'test') return 'harness';
  if (q === 'week1' || q === 'demo') return 'week1';
  if (q === 'agentic' || q === 'payments') return 'agentic';
  return 'agentic';
}

function Root() {
  const [view, setView] = useState<View>(readView);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.replaceState({}, '', url);
  }, [view]);

  if (view === 'harness') {
    return (
      <>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            background: 'rgba(15,18,16,0.92)',
            borderBottom: '1px solid #2a332c',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button type="button" className="primary" onClick={() => setView('agentic')}>
            ← Recorrido agentico
          </button>
          <button type="button" className="ghost" onClick={() => setView('week1')}>
            Demo Week1
          </button>
        </div>
        <App />
      </>
    );
  }

  if (view === 'week1') {
    return (
      <Week1Demo
        onOpenHarness={() => setView('harness')}
      />
    );
  }

  return (
    <AgenticPaymentsDemo
      onOpenHarness={() => setView('harness')}
      onOpenWeek1={() => setView('week1')}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

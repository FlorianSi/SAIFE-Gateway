import { useState, useEffect } from 'react';
import LayerConfig from './components/LayerConfig';
import ChatSimulation from './components/ChatSimulation';
import GatewayPipeline from './components/GatewayPipeline';
import AboutPage from './components/AboutPage';
import { translations } from './i18n';

function App() {
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  const [config, setConfig] = useState({
    layer1Enabled: true,
    simulateSignatureFail: false,
    didacticMode: 'socratic',
    ghostwritingPolicy: 'block',
    focusTopic: 'fractions',
    struggleThreshold: 3,
  });

  const [session, setSession] = useState({
    turnIndex: 0,
    sessionId: 'session_8f4c29a1'
  });

  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: translations.en.chatAiGreeting }
  ]);

  useEffect(() => {
    setChatLog(prev => {
      if (prev.length === 1 && (prev[0].text === translations.en.chatAiGreeting || prev[0].text === translations.de.chatAiGreeting)) {
        return [{ sender: 'ai', text: translations[lang].chatAiGreeting }];
      }
      return prev;
    });
  }, [lang]);

  const [pipelineLogs, setPipelineLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState('playground');
  const [currentPrompt, setCurrentPrompt] = useState('<System>\nDu bist ein sokratischer Tutor...\n</System>');

  const [activeModal, setActiveModal] = useState(null);

  const openModal = (termKey) => {
    setActiveModal({
      title: t[`${termKey}Title`],
      description: t[`${termKey}Desc`]
    });
  };

  const handleConfigChange = (newConfig) => {
    setConfig({ ...config, ...newConfig });
  };

  const addLog = (log) => {
    setPipelineLogs(prev => [...prev, log]);
  };

  const clearLogs = () => {
    setPipelineLogs([]);
  };

  return (
    <div className={`app ${currentPage === 'about' ? 'page-about' : ''}`}>
      <header className="header">
        <div className="header-brand">
          <h1 className="header-title">
            <span>SAIFE</span> Gateway [{t.headerTitle}]
          </h1>
          <p className="header-subtitle">
            <span className="subtitle-letter">S</span>afe{' '}
            <span className="subtitle-letter">A</span>
            <span className="subtitle-letter">I</span>{' '}
            <span className="subtitle-letter">F</span>ramework for{' '}
            <span className="subtitle-letter">E</span>ducation
          </p>
        </div>
        <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="https://github.com/FlorianSi/SAIFE-Gateway"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            aria-label="GitHub Repository"
            style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.12.88.01.47.01.84.01.93 0 .22-.16.47-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
          </a>
          <button 
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button 
            className={`lang-btn ${lang === 'de' ? 'active' : ''}`}
            onClick={() => setLang('de')}
          >
            DE
          </button>
        </div>
      </header>

      {currentPage === 'playground' ? (
        <main className="main">
          <LayerConfig 
            config={config} 
            onConfigChange={handleConfigChange} 
            t={t} 
            lang={lang}
            onOpenHelp={openModal}
          />
          <ChatSimulation 
            config={config} 
            chatLog={chatLog} 
            setChatLog={setChatLog}
            addLog={addLog}
            clearLogs={clearLogs}
            setCurrentPrompt={setCurrentPrompt}
            session={session}
            setSession={setSession}
            t={t}
            lang={lang}
          />
          <GatewayPipeline 
            logs={pipelineLogs} 
            currentPrompt={currentPrompt} 
            session={session}
            t={t} 
            lang={lang}
            onOpenHelp={openModal}
          />
        </main>
      ) : (
        <main className="main single-pane">
          <AboutPage t={t} onBack={() => setCurrentPage('playground')} />
        </main>
      )}

      <footer className="footer">
        <div>
          {t.footer}{' '}
          <button 
            className="footer-link-btn" 
            onClick={() => setCurrentPage('about')}
          >
            {t.footerLink}
          </button>
        </div>
        <div className="footer-credits">
          Made with ♥️ in Potsdam
        </div>
      </footer>

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeModal.title}</h3>
              <button className="close-btn" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {activeModal.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

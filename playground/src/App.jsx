import React, { useState } from 'react';
import LayerConfig from './components/LayerConfig';
import ChatSimulation from './components/ChatSimulation';
import GatewayPipeline from './components/GatewayPipeline';
import { translations } from './i18n';

function App() {
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  const [config, setConfig] = useState({
    layer1Enabled: true,
    simulateSignatureFail: false,
    didacticMode: 'socratic',
    ghostwritingPolicy: 'block',
  });

  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: translations.en.chatAiGreeting }
  ]);

  const [pipelineLogs, setPipelineLogs] = useState([]);
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

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1 className="header-title">
            <span>SAIFE Gateway</span> {t.headerTitle}
          </h1>
          <p className="header-subtitle">
            {t.headerSubtitle}
          </p>
        </div>
        <div className="header-controls">
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
          clearLogs={() => setPipelineLogs([])}
          setCurrentPrompt={setCurrentPrompt}
          t={t}
          lang={lang}
          onOpenHelp={openModal}
        />
        <GatewayPipeline 
          logs={pipelineLogs} 
          currentPrompt={currentPrompt} 
          t={t} 
          lang={lang}
          onOpenHelp={openModal}
        />
      </main>

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

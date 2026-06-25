import { useRef, useEffect } from 'react';

const GatewayPipeline = ({ logs, currentPrompt, session, t, lang, onOpenHelp }) => {
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const highlightPrompt = (text) => {
    if (!text) return null;
    const parts = text.split(/(<\/?[a-zA-Z0-9]+>)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('<') && part.endsWith('>')) {
        return <span key={idx} className="xml-tag">{part}</span>;
      }
      return <span key={idx} className="xml-content">{part}</span>;
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        {t.pipelineTitle}
      </div>
      <div className="panel-content pipeline-panel-content">
        
        <div className="field">
          <div className="section-title">{t.promptCompilerTitle}</div>
          <p className="field-desc">
            {lang === 'de' ? (
              <>Setzt die 4 Ebenen zu einem sicheren System-Prompt zusammen. Verwendet <span className="term-link" onClick={() => onOpenHelp('xmlIsolation')}>XML-Isolation</span>.</>
            ) : (
              <>Assembles the 4-Layers into a secure system prompt using <span className="term-link" onClick={() => onOpenHelp('xmlIsolation')}>XML isolation</span>.</>
            )}
          </p>
          <pre>
            {highlightPrompt(currentPrompt)}
          </pre>
        </div>

        <div className="field" style={{marginTop: '1rem'}}>
          <div className="section-title">{t.sessionTrackerTitle}</div>
          <p className="field-desc">
            {lang === 'de' ? (
              <>Verwaltet den <span className="term-link" onClick={() => onOpenHelp('turnIndex')}>Turn-Index</span> für den StruggleTracker und isoliert Sessions für LDP.</>
            ) : (
              <>Manages the <span className="term-link" onClick={() => onOpenHelp('turnIndex')}>Turn-Index</span> for the StruggleTracker and isolates sessions for LDP.</>
            )}
          </p>
          <div className="session-tracker-box">
            <div className="tracker-row">
              <span className="tracker-label">{t.sessionHash}:</span>
              <span className="tracker-value">{session.sessionId}</span>
            </div>
            <div className="tracker-row">
              <span className="tracker-label">{t.currentTurn}:</span>
              <span className="tracker-value highlight-turn">{session.turnIndex}</span>
            </div>
          </div>
        </div>

        <div className="field pipeline-logs-field">
          <div className="section-title">{t.telemetryTitle}</div>
          <p className="field-desc">
            {lang === 'de' ? (
              <>Echtzeit-Stream-Inspektion und datenschutzfreundliche Events. Nutzt <span className="term-link" onClick={() => onOpenHelp('jwe')}>JWE</span> für Krisenfälle und <span className="term-link" onClick={() => onOpenHelp('ldp')}>LDP</span> für Forschungsdaten.</>
            ) : (
              <>Real-time stream inspection and privacy-preserving events. Uses <span className="term-link" onClick={() => onOpenHelp('jwe')}>JWE</span> for crisis events and <span className="term-link" onClick={() => onOpenHelp('ldp')}>LDP</span> for research data.</>
            )}
          </p>
          
          <div className="log-container">
            {logs.length === 0 && (
              <div style={{color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem'}}>
                {t.waitingStream}
              </div>
            )}
            {logs.map((log, idx) => (
              <div key={idx} className={`log-entry ${log.type} ${log.category ? `log-cat-${log.category}` : ''}`}>
                {log.text && <div>{log.text}</div>}
                {log.payload && (
                  <pre className="payload-json" style={{ background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default GatewayPipeline;

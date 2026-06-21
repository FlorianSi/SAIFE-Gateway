import React, { useRef, useEffect } from 'react';

const GatewayPipeline = ({ logs, currentPrompt, t, lang, onOpenHelp }) => {
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
      <div className="panel-content">
        
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
                {log.text}
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

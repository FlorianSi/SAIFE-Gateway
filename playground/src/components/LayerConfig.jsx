
const LayerConfig = ({ config, onConfigChange, t, lang, onOpenHelp }) => {
  return (
    <div className="panel config-panel">
      <div className="panel-header">
        {t.configTitle}
      </div>
      <div className="panel-content">
        
        {/* Layer 1 */}
        <div className="field">
          <div className="section-title layer">{t.layer1Title}</div>
          <p className="field-desc">
            {lang === 'de' ? (
              <>Harte Vorgaben, <span className="term-link" onClick={() => onOpenHelp('pki')}>PKI</span>, <span className="term-link" onClick={() => onOpenHelp('chunkGate')}>Chunk-Gate</span>.</>
            ) : (
              <>Hard constraints, <span className="term-link" onClick={() => onOpenHelp('pki')}>PKI</span>, <span className="term-link" onClick={() => onOpenHelp('chunkGate')}>chunk-gate</span>.</>
            )}
          </p>
          
          <label className="switch-label">
            <div className="switch">
              <input 
                type="checkbox" 
                checked={config.layer1Enabled}
                onChange={(e) => onConfigChange({ layer1Enabled: e.target.checked })} 
              />
              <span className="slider"></span>
            </div>
            {t.enableFilters}
          </label>

          <label className={`switch-label ${!config.layer1Enabled ? 'disabled' : ''}`}>
            <div className="switch">
              <input 
                type="checkbox" 
                checked={config.simulateSignatureFail}
                disabled={!config.layer1Enabled}
                onChange={(e) => onConfigChange({ simulateSignatureFail: e.target.checked })} 
              />
              <span className="slider"></span>
            </div>
            {t.simulateFail}
          </label>
        </div>

        {/* Layer 2 */}
        <div className="field" style={{marginTop: '1rem'}}>
          <div className="section-title layer">{t.layer2Title}</div>
          <p className="field-desc">{t.layer2Desc}</p>
          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
            <em>{t.layer2ReadOnly}</em>
          </div>
        </div>

        {/* Layer 3 */}
        <div className="field" style={{marginTop: '1rem'}}>
          <div className="section-title layer">{t.layer3Title}</div>
          <p className="field-desc">
            {lang === 'de' ? (
              <>Lehrer-gesteuerte <span className="term-link" onClick={() => onOpenHelp('dsl')}>DSL</span>.</>
            ) : (
              <>Teacher-controlled <span className="term-link" onClick={() => onOpenHelp('dsl')}>DSL</span>.</>
            )}
          </p>
          
          <label className="field-label">{t.didacticMode}</label>
          <select 
            value={config.didacticMode} 
            onChange={(e) => onConfigChange({ didacticMode: e.target.value })}
          >
            <option value="socratic">{t.modeSocratic}</option>
            <option value="direct">{t.modeDirect}</option>
            <option value="exam_prep">{t.modeExamPrep}</option>
          </select>

          <label className="field-label" style={{marginTop: '0.5rem'}}>{t.ghostwritingPolicy}</label>
          <select 
            value={config.ghostwritingPolicy} 
            onChange={(e) => onConfigChange({ ghostwritingPolicy: e.target.value })}
          >
            <option value="block">{t.policyBlock}</option>
            <option value="allow_scaffold">{t.policyScaffold}</option>
          </select>

          <div style={{marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)'}}>
            <div className="section-title" style={{fontSize: '0.9rem'}}>{t.focusDirectiveTitle}</div>
            
            <label className="field-label" style={{marginTop: '0.5rem'}}>{t.focusTopic}</label>
            <input 
              type="text" 
              className="text-input"
              value={config.focusTopic} 
              onChange={(e) => onConfigChange({ focusTopic: e.target.value })}
              placeholder="e.g. fractions, linear_equations"
            />

            <label className="field-label" style={{marginTop: '0.5rem'}}>{t.struggleThreshold}</label>
            <input 
              type="number" 
              className="number-input"
              min="1"
              max="10"
              value={config.struggleThreshold} 
              onChange={(e) => onConfigChange({ struggleThreshold: parseInt(e.target.value) || 3 })}
            />
          </div>
        </div>

        {/* Layer 4 */}
        <div className="field" style={{marginTop: '1rem'}}>
          <div className="section-title layer">{t.layer4Title}</div>
          <p className="field-desc">
            {lang === 'de' ? (
              <>Schüler-Prompt sicher via <span className="term-link" onClick={() => onOpenHelp('xmlIsolation')}>XML-Isolation</span> injiziert.</>
            ) : (
              <>Student prompt injected safely via <span className="term-link" onClick={() => onOpenHelp('xmlIsolation')}>XML isolation</span>.</>
            )}
          </p>
          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
            <em>{t.layer4ReadOnly}</em>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LayerConfig;

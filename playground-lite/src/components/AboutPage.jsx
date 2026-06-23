const AboutPage = ({ t, onBack }) => {
  return (
    <div className="about-page">
      <button className="back-btn" onClick={onBack}>
        &larr; {t.backBtn}
      </button>

      <div className="about-header">
        <h1 className="about-title">{t.aboutTitle}</h1>
      </div>

      <div className="safety-badge" style={{ marginBottom: '2rem', borderColor: 'var(--danger)', backgroundColor: 'var(--danger-dim)', color: 'var(--text-primary)' }}>
        <span className="safety-badge-icon">⚠️</span>
        <div>
          <strong>{t.aboutDisclaimerTitle}:</strong>
          <br/>
          {t.aboutDisclaimerText}
        </div>
      </div>

      <div className="about-content">
        <p className="about-intro-acronym" style={{ fontStyle: 'italic', marginBottom: '2rem', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
          {t.aboutIntroAcronym}
        </p>

        <section className="about-section">
          <h3>{t.aboutWhatTitle}</h3>
          <div className="about-text">
            <p>{t.aboutWhatText}</p>
          </div>
        </section>

        <section className="about-section">
          <h3>1. {t.aboutPrivacyTitle}</h3>
          <div className="about-text">
            <h4>{t.aboutDataFlowsTitle}</h4>
            <p>{t.aboutDataFlowsDesc}</p>
            <ul>
              <li><strong>{t.aboutTransientTitle}:</strong> {t.aboutTransientDesc}</li>
              <li><strong>{t.aboutMinimizationTitle}:</strong> {t.aboutMinimizationDesc}</li>
            </ul>

            <h4>{t.aboutDiffPrivacyTitle}</h4>
            <p>{t.aboutDiffPrivacyDesc}</p>
            <ul>
              <li><strong>{t.aboutMathGuaranteesTitle}:</strong> {t.aboutMathGuaranteesDesc}</li>
              <li><strong>{t.aboutStatsTrendsTitle}:</strong> {t.aboutStatsTrendsDesc}</li>
            </ul>
          </div>
        </section>

        <section className="about-section">
          <h3>2. {t.aboutSecurityTitle}</h3>
          <div className="about-text">
            <h4>{t.aboutPromptInjectionTitle}</h4>
            <p>{t.aboutPromptInjectionDesc}</p>
            <ul>
              <li><strong>{t.aboutRoleSeparationTitle}:</strong> {t.aboutRoleSeparationDesc}</li>
              <li><strong>{t.aboutHardwareGuaranteesTitle}:</strong> {t.aboutHardwareGuaranteesDesc}</li>
            </ul>

            <h4 style={{ marginTop: '1.5rem' }}>{t.aboutAiActTitle}</h4>
            <p>{t.aboutAiActDesc}</p>
          </div>
        </section>

        <section className="about-section">
          <h3>3. {t.aboutCrisisTitle}</h3>
          <div className="about-text">
            <p>{t.aboutCrisisDesc}</p>
            <ul>
              <li><strong>{t.aboutPrimaryLayerTitle}:</strong> {t.aboutPrimaryLayerDesc}</li>
              <li><strong>{t.aboutSecondaryLayerTitle}:</strong> {t.aboutSecondaryLayerDesc}</li>
            </ul>
          </div>
        </section>

        <section className="about-section">
          <h3>4. {t.aboutEqualSecurityTitle}</h3>
          <div className="about-text">
            <p>{t.aboutEqualSecurityDesc}</p>
            <ul>
              <li><strong>{t.aboutLightweightTitle}:</strong> {t.aboutLightweightDesc}</li>
              <li><strong>{t.aboutEnterpriseTitle}:</strong> {t.aboutEnterpriseDesc}</li>
            </ul>
          </div>
        </section>

        <section className="about-section">
          <h3>5. {t.aboutEdgeCasesTitle}</h3>
          <div className="about-text">
            <h4>{t.aboutChatHistoryTitle}</h4>
            <ul>
              <li><strong>{t.aboutCompressionTitle}:</strong> {t.aboutCompressionDesc}</li>
              <li><strong>{t.aboutLostMiddleTitle}:</strong> {t.aboutLostMiddleDesc}</li>
            </ul>

            <h4>{t.aboutRateLimitingTitle}</h4>
            <ul>
              <li><strong>{t.aboutProbingTitle}:</strong> {t.aboutProbingDesc}</li>
              <li><strong>{t.aboutThrottlingTitle}:</strong> {t.aboutThrottlingDesc}</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;

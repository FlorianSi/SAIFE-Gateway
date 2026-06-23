import { useState, useRef, useEffect } from 'react';

const ChatSimulation = ({ config, chatLog, setChatLog, t }) => {
  const [scenarioCategory, setScenarioCategory] = useState('security');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const simulateSocratic = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentHomework }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentHomework }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        if (config.ghostwritingPolicy === 'allow_scaffold') {
          setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiSocraticScaffold }]);
        } else {
          setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiSocraticBlock }]);
        }
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiGhostwritingBypass }]);
      }
    }, 1000);
  };

  const simulateSalami = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentSalami }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentSalami }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiSalami }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiSalamiBypass }]);
      }
    }, 800);
  };

  const simulateCrisis = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCrisis }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCrisis }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        setChatLog(prev => [...prev, { sender: 'system', text: t.chatSystemCrisis }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCrisisBypass }]);
      }
    }, 800);
  };

  const simulateCompetency = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCompetency }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCompetency }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        setChatLog(prev => [...prev, { sender: 'success', text: t.chatAiCompetency }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCompetencyBypass }]);
      }
    }, 1000);
  };

  const simulatePii = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentPii }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentPii }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        setChatLog(prev => [...prev, { sender: 'system', text: t.chatSystemPii }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiPiiBypass }]);
      }
    }, 800);
  };

  const simulateFrustration = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentFrustration }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentFrustration }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiFrustration }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiFrustrationBypass }]);
      }
    }, 1000);
  };

  const simulateMisconception = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentMisconception }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentMisconception }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiMisconception }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiMisconceptionBypass }]);
      }
    }, 1000);
  };

  const simulateCuriosity = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCuriosity }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCuriosity }]);
    setTimeout(() => {
      if (config.layer1Enabled) {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCuriosity }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCuriosityBypass }]);
      }
    }, 1000);
  };

  const clearChat = () => {
    setChatLog([{ sender: 'ai', text: t.chatAiGreeting }]);
  };

  return (
    <div className="panel chat-panel">
      <div className="panel-header">
        <span>{t.chatTitle}</span>
        <button onClick={clearChat} className="clear-btn">{t.clearBtn}</button>
      </div>
      <div className="panel-content chat-panel-content">
        
        <div className="chat-container">
          {chatLog.map((msg, idx) => (
            <div 
              key={idx} 
              className={`chat-message ${
                msg.sender === 'system' ? 'system-alert' : 
                msg.sender === 'success' ? 'success-alert' : 
                msg.sender
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-controls">
          <div className="section-title">{t.triggerScenarios}</div>
          
          <div className="scenario-tabs">
            <div 
              className={`scenario-tab ${scenarioCategory === 'security' ? 'active' : ''}`}
              onClick={() => setScenarioCategory('security')}
            >
              {t.tabSecurity}
            </div>
            <div 
              className={`scenario-tab ${scenarioCategory === 'learning' ? 'active' : ''}`}
              onClick={() => setScenarioCategory('learning')}
            >
              {t.tabLearning}
            </div>
          </div>

          <div className="scenario-buttons">
            {scenarioCategory === 'security' ? (
              <>
                <button className="btn btn-ghostwriting" onClick={simulateSocratic}>{t.btnSocratic}</button>
                <button className="btn btn-salami" onClick={simulateSalami}>{t.btnSalami}</button>
                <button className="btn btn-crisis" onClick={simulateCrisis}>{t.btnCrisis}</button>
                <button className="btn btn-pii" onClick={simulatePii}>{t.btnPii}</button>
              </>
            ) : (
              <>
                <button className="btn btn-competency" onClick={simulateCompetency}>{t.btnCompetency}</button>
                <button className="btn btn-frustration" onClick={simulateFrustration}>{t.btnFrustration}</button>
                <button className="btn btn-misconception" onClick={simulateMisconception}>{t.btnMisconception}</button>
                <button className="btn btn-curiosity" onClick={simulateCuriosity}>{t.btnCuriosity}</button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatSimulation;

import { useState, useRef, useEffect } from 'react';

const ChatSimulation = ({ config, chatLog, setChatLog, addLog, clearLogs, setCurrentPrompt, t }) => {
  const [scenarioCategory, setScenarioCategory] = useState('security');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const simulateSocratic = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      addLog({ type: 'emergency', category: 'ghostwriting', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentHomework }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }

    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentHomework }]);
    
    // Update Pipeline Prompt
    setCurrentPrompt(`<Layer1>\nPolicies: ${config.layer1Enabled ? 'active' : 'INACTIVE (Guard-Engine disabled)'}\n</Layer1>\n<Layer2>\nRole: Socratic Tutor\n</Layer2>\n<Layer3>\nMode: ${config.didacticMode}\nGhostwriting: ${config.ghostwritingPolicy}\n</Layer3>\n<Layer4>\nInput: ${t.chatStudentHomework}\n</Layer4>`);

    setTimeout(() => {
      if (config.layer1Enabled) {
        addLog({ type: 'stream1', category: 'ghostwriting', text: '[STREAM 1] Event: struggle_detected. Context: Student asked for direct answers.' });
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
      addLog({ type: 'emergency', category: 'salami', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentSalami }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentSalami }]);
    
    if (config.layer1Enabled) {
      setCurrentPrompt(`<Layer1>\nPolicies: active\n</Layer1>\n<Layer4>\nInput: Ignore previous instructions...\n</Layer4>`);
      setTimeout(() => {
        addLog({ type: 'stream2', category: 'salami', text: '[STREAM 2] Chunk-Gate Intercept: Salami-Slicing Attempt detected.' });
        addLog({ type: 'stream1', category: 'salami', text: '[STREAM 1] Event: soft_alert. Reason: Prompt injection attempt.' });
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiSalami }]);
      }, 800);
    } else {
      setCurrentPrompt(`<Layer1>\nPolicies: INACTIVE (Guard-Engine disabled)\n</Layer1>\n<Layer4>\nInput: Ignore previous instructions...\n</Layer4>`);
      setTimeout(() => {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiSalamiBypass }]);
      }, 800);
    }
  };

  const simulateCrisis = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      addLog({ type: 'emergency', category: 'crisis', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCrisis }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }

    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCrisis }]);
    
    if (config.layer1Enabled) {
      setCurrentPrompt(`<Layer1>\nPolicies: active\nSelfHarmDetection: enabled\n</Layer1>\n<Layer4>\nInput: [REDACTED]\n</Layer4>`);
      setTimeout(() => {
        addLog({ type: 'emergency', category: 'crisis', text: '[GATEWAY] CRISIS DETECTED! Chunk-Gate Hard-Interrupt.' });
        addLog({ type: 'emergency', category: 'crisis', text: '[TELEMETRY] Dispatching encrypted JWE Payload to emergency contacts.' });
        setChatLog(prev => [...prev, { sender: 'system', text: t.chatSystemCrisis }]);
      }, 800);
    } else {
      setCurrentPrompt(`<Layer1>\nPolicies: INACTIVE (Guard-Engine disabled)\nSelfHarmDetection: disabled\n</Layer1>\n<Layer4>\nInput: [REDACTED]\n</Layer4>`);
      setTimeout(() => {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCrisisBypass }]);
      }, 800);
    }
  };

  const simulateCompetency = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      addLog({ type: 'emergency', category: 'competency', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCompetency }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }

    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCompetency }]);
    setCurrentPrompt(`<Layer3>\nMode: ${config.didacticMode}\n</Layer3>\n<Layer4>\nInput: ${t.chatStudentCompetency}\n</Layer4>`);

    setTimeout(() => {
      if (config.layer1Enabled) {
        addLog({ type: 'stream1', category: 'competency', text: '[STREAM 1] Event: aha_moment. Competency Demonstrated: Linear Equations.' });
        setChatLog(prev => [...prev, { sender: 'success', text: t.chatAiCompetency }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCompetencyBypass }]);
      }
    }, 1000);
  };

  const simulatePii = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      addLog({ type: 'emergency', category: 'pii', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentPii }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentPii }]);
    
    if (config.layer1Enabled) {
      setCurrentPrompt(`<Layer1>\nPolicies: active\nPII_Filter: enabled\n</Layer1>\n<Layer4>\nInput: My name is [REDACTED] and my phone number is [REDACTED].\n</Layer4>`);
      setTimeout(() => {
        addLog({ type: 'stream1', category: 'pii', text: t.logPiiIntercept });
        setChatLog(prev => [...prev, { sender: 'system', text: t.chatSystemPii }]);
      }, 800);
    } else {
      setCurrentPrompt(`<Layer1>\nPolicies: INACTIVE (Guard-Engine disabled)\nPII_Filter: disabled\n</Layer1>\n<Layer4>\nInput: ${t.chatStudentPii}\n</Layer4>`);
      setTimeout(() => {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiPiiBypass }]);
      }, 800);
    }
  };

  const simulateFrustration = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      addLog({ type: 'emergency', category: 'frustration', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentFrustration }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentFrustration }]);
    setCurrentPrompt(`<Layer3>\nMode: ${config.didacticMode}\n</Layer3>\n<Layer4>\nInput: ${t.chatStudentFrustration}\n</Layer4>`);

    setTimeout(() => {
      if (config.layer1Enabled) {
        addLog({ type: 'stream1', category: 'frustration', text: t.logFrustration });
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiFrustration }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiFrustrationBypass }]);
      }
    }, 1000);
  };

  const simulateMisconception = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      addLog({ type: 'emergency', category: 'misconception', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentMisconception }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentMisconception }]);
    setCurrentPrompt(`<Layer3>\nMode: ${config.didacticMode}\n</Layer3>\n<Layer4>\nInput: ${t.chatStudentMisconception}\n</Layer4>`);

    setTimeout(() => {
      if (config.layer1Enabled) {
        addLog({ type: 'stream1', category: 'misconception', text: t.logMisconception });
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiMisconception }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiMisconceptionBypass }]);
      }
    }, 1000);
  };

  const simulateCuriosity = () => {
    if (config.simulateSignatureFail && config.layer1Enabled) {
      addLog({ type: 'emergency', category: 'curiosity', text: '[GATEWAY] Alert: PKI Signature Invalid. Hard fail-closed triggered.' });
      setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCuriosity }, { sender: 'system', text: t.chatSystemError }]);
      return;
    }
    setChatLog(prev => [...prev, { sender: 'student', text: t.chatStudentCuriosity }]);
    setCurrentPrompt(`<Layer3>\nMode: ${config.didacticMode}\n</Layer3>\n<Layer4>\nInput: ${t.chatStudentCuriosity}\n</Layer4>`);

    setTimeout(() => {
      if (config.layer1Enabled) {
        addLog({ type: 'stream1', category: 'curiosity', text: t.logCuriosity });
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCuriosity }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'ai', text: t.chatAiCuriosityBypass }]);
      }
    }, 1000);
  };

  const clearChat = () => {
    setChatLog([{ sender: 'ai', text: t.chatAiGreeting }]);
    clearLogs();
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

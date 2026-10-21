import React from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Languages,
  Bot,
  Radio
} from 'lucide-react';
import { voiceService } from '../../services/voiceService';

export const CallHUD = ({
  callStatus, // 'idle' | 'calling' | 'bot_speaking' | 'listening' | 'processing' | 'ended'
  callDuration,
  isRecordingConsentGranted,
  setIsRecordingConsentGranted,
  language,
  setLanguage,
  selectedProduct,
  isMicMuted,
  toggleMicMute,
  isSpeakerMuted,
  toggleSpeakerMute,
  onStartCall,
  onEndCall,
  activeVoiceEngine = 'idle'
}) => {
  const isCallActive = callStatus !== 'idle' && callStatus !== 'ended';

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling': return 'Connecting...';
      case 'bot_speaking': return 'AI Bot Speaking...';
      case 'listening': return 'Listening to Customer...';
      case 'processing': return 'Thinking...';
      case 'ended': return 'Call Ended';
      default: return 'Ready to Connect';
    }
  };

  return (
    <div className="glass-panel call-hud-panel">
      {/* HUD Header */}
      <div className="call-hud-header">
        <div className="product-badge-group">
          <span className="product-eyebrow">Target Product</span>
          <h2 className="product-target-name">{selectedProduct.name}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isCallActive && activeVoiceEngine === 'gemini-live' && (
            <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', borderRadius: 6, fontWeight: 700, letterSpacing: '0.02em' }}>
              ⚡ Gemini 3.8 Live
            </span>
          )}
          {isCallActive && activeVoiceEngine === 'consultative-fallback' && (
            <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', borderRadius: 6, fontWeight: 700, letterSpacing: '0.02em' }}>
              🛡️ Consultative Voice
            </span>
          )}
          <div className="hud-status-badge">
            <span className={`hud-status-dot ${callStatus === 'bot_speaking' ? 'speaking' :
                callStatus === 'listening' ? 'listening' :
                  isCallActive ? 'active-call' : ''
              }`} />
            <span>{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Recording Consent & Compliance Notice */}
      <div className={`consent-box ${isRecordingConsentGranted ? 'granted' : 'declined'}`} style={{ transition: 'all 0.2s ease' }}>
        <ShieldCheck size={20} color={isRecordingConsentGranted ? '#10b981' : '#f59e0b'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span>Audio Recording Consent</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isCallActive && isRecordingConsentGranted && (
                <span className="recording-indicator">
                  <span className="rec-blinking-circle" />
                  REC
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsRecordingConsentGranted(!isRecordingConsentGranted)}
                disabled={isCallActive}
                className="btn-secondary"
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: 6,
                  cursor: isCallActive ? 'not-allowed' : 'pointer',
                  borderColor: isRecordingConsentGranted ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
                  color: isRecordingConsentGranted ? '#34d399' : '#fbbf24',
                  background: isRecordingConsentGranted ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'
                }}
                title={isCallActive ? 'Consent locked during active call' : 'Toggle recording consent before call'}
              >
                {isRecordingConsentGranted ? '✓ Consent Granted' : '✕ Recording Declined'}
              </button>
            </div>
          </div>
          <p style={{ opacity: 0.9, fontSize: '0.75rem', margin: 0 }}>
            {isRecordingConsentGranted
              ? 'Audio will be recorded and saved in browser IndexedDB for training and quality verification.'
              : 'Call will proceed without saving audio recording (privacy mode enabled).'}
          </p>
        </div>
      </div>

      {/* 3D Glowing Voice Orb Visualizer */}
      <div className="voice-orb-container">
        <div className={`orb-wrapper ${callStatus === 'bot_speaking' ? 'speaking' :
            callStatus === 'listening' ? 'listening' : ''
          }`}>
          <div className="orb-ring orb-ring-1" />
          <div className="orb-ring orb-ring-2" />
          <div className="orb-sphere">
            {callStatus === 'listening' ? (
              <Radio size={48} className="orb-core-icon" />
            ) : (
              <Bot size={48} className="orb-core-icon" />
            )}
          </div>
        </div>

        {/* Audio Waveform Equalizer */}
        <div className={`waveform-container ${isCallActive ? 'active' : ''}`}>
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
          <div className="wave-bar" />
        </div>
      </div>

      {/* Call Duration Box */}
      <div className="call-timer-box">
        <span className="timer-label">Call Duration</span>
        <span className="timer-digits">{formatDuration(callDuration)}</span>
      </div>

      {/* Language Selector Strip & Test Voice */}
      <div className="language-selector-strip">
        <div className="lang-label">
          <Languages size={15} color="#94a3b8" />
          <span>Language:</span>
        </div>
        <div className="lang-buttons-group">
          <button
            type="button"
            className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
            disabled={isCallActive}
            title="English"
          >
            English
          </button>
          <button
            type="button"
            className={`lang-btn ${language === 'hi' ? 'active' : ''}`}
            onClick={() => setLanguage('hi')}
            disabled={isCallActive}
            title="Hindi (हिंदी)"
          >
            हिंदी
          </button>
          <button
            type="button"
            className={`lang-btn ${language === 'te' ? 'active' : ''}`}
            onClick={() => setLanguage('te')}
            disabled={isCallActive}
            title="Telugu (తెలుగు)"
          >
            తెలుగు
          </button>
        </div>
      </div>

      {language === 'te' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.73rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)', padding: '0.22rem 0.5rem', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.25)', margin: '-4px 0 6px 0' }}>
          <span>⚡ Telugu Cadence: <strong>sales ai bot</strong></span>
        </div>
      )}

      {/* Test Speaker Button when Idle */}
      {!isCallActive && (
        <button
          type="button"
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.55rem' }}
          onClick={() => {
            const testText = language === 'hi'
              ? 'नमस्ते! मैं ओम्निफ्लो एआई से बोल रहा हूँ। मेरी आवाज़ स्पष्ट रूप से सुनाई दे रही है।'
              : language === 'te'
                ? 'నమస్కారం! నేను ఓమ్నిఫ్లో AI నుండి మాట్లాడుతున్నాను. నా వాయిస్ వినబడుతోందా?'
                : "Hello! I'm Alex from OmniFlow AI. My voice output is working properly and ready for your call!";
            voiceService.speak(testText, { lang: language });
          }}
          title="Click to test speech audio output"
        >
          <Volume2 size={16} color="#38bdf8" />
          <span>🔊 Test Voice Output</span>
        </button>
      )}

      {/* Call Action Controls */}
      <div className="call-controls-section">
        <div className="primary-call-actions">
          {!isCallActive ? (
            <button
              type="button"
              className="btn-start-call"
              onClick={onStartCall}
            >
              <Phone size={22} />
              <span>Start Voice Call</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-end-call"
              onClick={onEndCall}
            >
              <PhoneOff size={22} />
              <span>End Call</span>
            </button>
          )}
        </div>

        {/* Secondary Toggles (Mic Mute / Speaker Mute) */}
        {isCallActive && (
          <div className="secondary-call-actions">
            <button
              type="button"
              className={`btn-toggle-aux ${isMicMuted ? 'active-muted' : ''}`}
              onClick={toggleMicMute}
              title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
              <span>{isMicMuted ? 'Mic Muted' : 'Mute Mic'}</span>
            </button>

            <button
              type="button"
              className={`btn-toggle-aux ${isSpeakerMuted ? 'active-muted' : ''}`}
              onClick={toggleSpeakerMute}
              title={isSpeakerMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            >
              {isSpeakerMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isSpeakerMuted ? 'AI Muted' : 'Mute AI'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

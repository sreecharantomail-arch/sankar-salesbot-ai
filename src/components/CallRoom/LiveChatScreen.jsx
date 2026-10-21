import React, { useRef, useEffect } from 'react';
import { Bot, User, Send, Volume2, Sparkles, MessageSquare } from 'lucide-react';

export const LiveChatScreen = ({
  transcript = [],
  interimUserSpeech = '',
  callStatus,
  onSendMessage,
  onReplayAudio
}) => {
  const messagesEndRef = useRef(null);
  const [inputValue, setInputValue] = React.useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript, interimUserSpeech]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="glass-panel live-chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="chat-header-left">
          <MessageSquare size={18} color="#38bdf8" />
          <h3 className="chat-header-title">Live Call Transcript & Real-Time Chat</h3>
          <span className="chat-msg-count">{transcript.length} turns</span>
        </div>

        <div className="chat-header-actions">
          <span style={{ 
            fontSize: '0.74rem', 
            background: 'rgba(99, 102, 241, 0.15)', 
            color: '#a5b4fc', 
            padding: '0.2rem 0.6rem', 
            borderRadius: 999, 
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Sparkles size={12} color="#38bdf8" />
            <span>Human Conversational AI</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-container">
        {transcript.length === 0 && !interimUserSpeech ? (
          <div className="chat-empty-state">
            <div className="empty-icon-ring">
              <Bot size={28} />
            </div>
            <div style={{ maxWidth: 360 }}>
              <h4 style={{ color: '#fff', marginBottom: 4 }}>No Messages Yet</h4>
              <p style={{ fontSize: '0.85rem' }}>
                Click <strong>"Start Voice Call"</strong> to speak with the AI Sales Bot, or type a message below. The bot will reply with spoken voice and text in real time!
              </p>
            </div>
          </div>
        ) : (
          <>
            {transcript.map((msg, index) => {
              const isBot = msg.sender === 'bot';
              return (
                <div key={index} className={`chat-message-row ${isBot ? 'bot' : 'user'}`}>
                  <div className={`msg-avatar ${isBot ? 'bot' : 'user'}`}>
                    {isBot ? <Bot size={20} /> : <User size={20} />}
                  </div>

                  <div className="msg-body-wrapper">
                    <div className="msg-meta-line">
                      <span className="msg-sender-name">
                        {isBot ? 'AI Sales Executive' : 'Customer'}
                      </span>
                      <span>•</span>
                      <span>{msg.time || 'Live'}</span>
                      {isBot && msg.source && msg.source !== 'initial-greeting' && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: msg.isFallback ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: msg.isFallback ? '#facc15' : '#34d399',
                            border: `1px solid ${msg.isFallback ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                          title={msg.isFallback ? 'Generated via Consultative Dialogue Synthesizer (Backend Gemini offline)' : `Generated dynamically by ${msg.model || 'Gemini 2.5 Flash'}`}
                        >
                          {msg.isFallback ? '🛡️ Consultative Engine' : `⚡ ${msg.model || 'Gemini 2.5 Flash'}`}
                        </span>
                      )}
                      {isBot && onReplayAudio && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ 
                            width: 'auto', 
                            height: 22, 
                            padding: '0 6px', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            background: 'rgba(255,255,255,0.05)',
                            display: 'inline-flex',
                            gap: 4,
                            alignItems: 'center',
                            fontSize: '0.72rem',
                            color: '#38bdf8'
                          }}
                          onClick={() => onReplayAudio(msg.text)}
                          title="Click to replay bot speech"
                        >
                          <Volume2 size={13} color="#38bdf8" />
                          <span>Speak</span>
                        </button>
                      )}
                    </div>

                    <div className="msg-bubble">
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Speech Preview (as customer speaks) */}
            {interimUserSpeech && (
              <div className="interim-speech-preview">
                <Sparkles size={16} />
                <span>Customer speaking: "{interimUserSpeech}..."</span>
              </div>
            )}

            {/* Bot Thinking / Speaking indicator */}
            {callStatus === 'bot_speaking' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#38bdf8' }}>
                <span className="hud-status-dot speaking" />
                <Volume2 size={15} className="pulse-icon" />
                <span>AI Bot is speaking aloud...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Manual Input Fallback Bar */}
      <form onSubmit={handleSend} className="chat-footer-bar">
        <input 
          type="text"
          className="chat-input-field"
          placeholder={callStatus === 'idle' ? 'Type customer question here (AI will speak response aloud)...' : 'Speak into mic or type your response here...'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button 
          type="submit" 
          className="btn-send-message"
          disabled={!inputValue.trim()}
          title="Send Customer Response"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bot, 
  User, 
  Play, 
  Download, 
  Sparkles, 
  Check, 
  XCircle, 
  ArrowRight, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  PhoneMissed,
  AlertCircle,
  TrendingUp,
  HelpCircle,
  FileText
} from 'lucide-react';
import { dbService } from '../services/dbService';

export const TranscriptDetailModal = ({ call, onClose }) => {
  const initialAudio = call?.recording?.audioUrl || call?.recording?.base64Data || null;
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState(initialAudio);

  useEffect(() => {
    if (!call) return;
    let active = true;
    let createdUrl = null;

    if (!initialAudio && call.id && call.consentGranted !== false) {
      dbService.getAudioRecordingUrl(call.id).then((url) => {
        if (active && url) {
          createdUrl = url;
          setResolvedAudioUrl(url);
        }
      }).catch(() => {});
    }

    return () => {
      active = false;
      if (createdUrl && createdUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [call, initialAudio]);

  if (!call) return null;

  const getStatusIcon = (statusKey) => {
    switch (statusKey) {
      case 'Converted': return <CheckCircle2 size={16} color="#10b981" />;
      case 'Interested': return <Sparkles size={16} color="#3b82f6" />;
      case 'Demo Requested': return <Calendar size={16} color="#8b5cf6" />;
      case 'Follow-up Required': return <Clock size={16} color="#f59e0b" />;
      case 'Not Interested': return <XCircle size={16} color="#ef4444" />;
      default: return <PhoneMissed size={16} color="#94a3b8" />;
    }
  };

  const statusClassMap = {
    'Converted': 'status-converted',
    'Interested': 'status-interested',
    'Demo Requested': 'status-demo-requested',
    'Follow-up Required': 'status-follow-up-required',
    'Not Interested': 'status-not-interested',
    'No Response': 'status-no-response'
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor((seconds || 0) / 60);
    const secs = (seconds || 0) % 60;
    return `${mins}m ${secs}s`;
  };

  const downloadAudio = () => {
    if (!resolvedAudioUrl) return;
    const a = document.createElement('a');
    a.href = resolvedAudioUrl;
    a.download = `call_recording_${call.id}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const summary = call.summary || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Call Details & Full Transcript</h3>
              <div className={`status-pill ${statusClassMap[call.salesStatus] || 'status-no-response'}`}>
                {getStatusIcon(call.salesStatus)}
                <span>{call.salesStatus}</span>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {new Date(call.timestamp).toLocaleString()} • Duration: {formatDuration(call.durationSeconds)} • Product: {call.productName}
            </span>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Recording Player */}
          {call.consentGranted === false ? (
            <div style={{ fontSize: '0.82rem', color: '#f59e0b', fontStyle: 'italic', background: 'rgba(245, 158, 11, 0.08)', padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              🛡️ <strong>Recording Not Stored:</strong> Customer declined audio recording consent before or during this call.
            </div>
          ) : resolvedAudioUrl ? (
            <div className="call-recording-player-wrap">
              <div className="player-header">
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Play size={14} color="#10b981" />
                  Call Audio Recording
                </span>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={downloadAudio}
                >
                  <Download size={14} />
                  Download Audio
                </button>
              </div>
              <audio 
                controls 
                style={{ width: '100%', filter: 'invert(0.9) hue-rotate(180deg)' }}
                src={resolvedAudioUrl}
              />
            </div>
          ) : null}

          {/* AI Summary 8-Part Breakdown */}
          <div className="summary-blocks-grid">
            <div className="summary-block-card overview">
              <div className="summary-block-title">
                <FileText size={14} color="#818cf8" />
                1. Conversation Overview
              </div>
              <div className="summary-block-text">{summary.overview || 'Exploratory conversation completed.'}</div>
            </div>

            <div className="summary-block-card">
              <div className="summary-block-title">
                <Check size={14} color="#38bdf8" />
                2. Customer Requirements
              </div>
              <div className="summary-block-text">{summary.customerRequirements || 'Not provided'}</div>
            </div>

            <div className="summary-block-card">
              <div className="summary-block-title">
                <AlertCircle size={14} color="#fb923c" />
                3. Pain Points
              </div>
              <div className="summary-block-text">{summary.painPoints || 'Not provided'}</div>
            </div>

            <div className="summary-block-card">
              <div className="summary-block-title">
                <TrendingUp size={14} color="#34d399" />
                4. Product Interest
              </div>
              <div className="summary-block-text">{summary.productInterest || 'Not provided'}</div>
            </div>

            <div className="summary-block-card">
              <div className="summary-block-title">
                <XCircle size={14} color="#f87171" />
                5. Objections Raised
              </div>
              <div className="summary-block-text">{summary.objections || 'None noted'}</div>
            </div>

            <div className="summary-block-card">
              <div className="summary-block-title">
                <Clock size={14} color="#fbbf24" />
                6. Budget & Timeline
              </div>
              <div className="summary-block-text">{summary.budgetTimeline || 'Not provided'}</div>
            </div>

            <div className="summary-block-card">
              <div className="summary-block-title">
                <HelpCircle size={14} color="#a78bfa" />
                7. Promised Actions
              </div>
              <div className="summary-block-text">{summary.promisedActions || 'Not provided'}</div>
            </div>

            <div className="summary-block-card" style={{ gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <div className="summary-block-title" style={{ color: '#34d399' }}>
                <ArrowRight size={14} color="#34d399" />
                8. Recommended Next Steps
              </div>
              <div className="summary-block-text" style={{ color: '#d1fae5' }}>{summary.nextSteps || 'Follow up with lead'}</div>
            </div>
          </div>

          {/* Full Conversation Transcript */}
          <div style={{ marginTop: '0.5rem' }}>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              Full Conversation Transcript ({call.transcript?.length || 0} messages)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {call.transcript && call.transcript.map((msg, idx) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={idx} className={`chat-message-row ${isBot ? 'bot' : 'user'}`} style={{ maxWidth: '95%' }}>
                    <div className={`msg-avatar ${isBot ? 'bot' : 'user'}`}>
                      {isBot ? <Bot size={18} /> : <User size={18} />}
                    </div>
                    <div className="msg-body-wrapper">
                      <div className="msg-meta-line">
                        <span className="msg-sender-name">{isBot ? 'AI Sales Bot' : 'Customer'}</span>
                        <span>•</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="msg-bubble">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

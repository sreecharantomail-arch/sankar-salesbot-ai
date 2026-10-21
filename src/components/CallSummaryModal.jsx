import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Clock, 
  Calendar, 
  XCircle, 
  PhoneMissed, 
  Play, 
  FileText, 
  Check, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { dbService } from '../services/dbService';

export const CallSummaryModal = ({
  callRecord,
  onClose,
  onSaveStatusChange,
  onNavigateToHistory
}) => {
  const [currentStatus, setCurrentStatus] = useState(callRecord?.salesStatus || 'Interested');
  const initialAudio = callRecord?.recording?.audioUrl || callRecord?.recording?.base64Data || null;
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState(initialAudio);

  useEffect(() => {
    if (!callRecord) return;
    let active = true;
    let createdUrl = null;

    if (!initialAudio && callRecord.id && callRecord.consentGranted !== false) {
      dbService.getAudioRecordingUrl(callRecord.id).then((url) => {
        if (active && url) {
          createdUrl = url;
          setResolvedAudioUrl(url);
        }
      }).catch(() => {});
    }

    // If converted, trigger celebration confetti
    if (callRecord.salesStatus === 'Converted') {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Confetti optional
      }
    }

    return () => {
      active = false;
      if (createdUrl && createdUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [callRecord, initialAudio]);

  if (!callRecord) return null;

  const handleStatusSelect = (newStatus) => {
    setCurrentStatus(newStatus);
    if (onSaveStatusChange) {
      onSaveStatusChange(callRecord.id, newStatus);
    }
  };

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

  const downloadAudio = () => {
    if (!resolvedAudioUrl) return;
    const a = document.createElement('a');
    a.href = resolvedAudioUrl;
    a.download = `call_recording_${callRecord.id}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const summary = callRecord.summary || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-logo-icon" style={{ width: 34, height: 34 }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>AI Call Analysis & Executive Summary</h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Duration: {Math.floor((callRecord.durationSeconds || 0) / 60)}m {(callRecord.durationSeconds || 0) % 60}s • Product: {callRecord.productName}
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Sales Status Section */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            padding: '1.25rem', 
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>
                  Automated Sales Pipeline Status
                </span>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`status-pill ${statusClassMap[currentStatus] || 'status-no-response'}`}>
                    {getStatusIcon(currentStatus)}
                    <span>{currentStatus}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Confidence: <strong>{Math.round((callRecord.confidenceScore || 0.95) * 100)}%</strong>
                  </span>
                </div>
              </div>

              {/* Status Override Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Adjust Status:</span>
                <select 
                  className="form-select"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                  value={currentStatus}
                  onChange={(e) => handleStatusSelect(e.target.value)}
                >
                  <option value="Converted">Converted</option>
                  <option value="Interested">Interested</option>
                  <option value="Demo Requested">Demo Requested</option>
                  <option value="Follow-up Required">Follow-up Required</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="No Response">No Response</option>
                </select>
              </div>
            </div>

            {callRecord.statusReason && (
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem' }}>
                💡 <strong>AI Justification:</strong> {callRecord.statusReason}
              </p>
            )}
          </div>

          {/* Call Voice Recording Playback Section */}
          <div className="call-recording-player-wrap">
            <div className="player-header">
              <span style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={15} color="#10b981" />
                Call Voice Recording
              </span>
              {resolvedAudioUrl && (
                <button 
                  type="button" 
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={downloadAudio}
                >
                  <Download size={14} />
                  Download Audio
                </button>
              )}
            </div>

            {callRecord.consentGranted === false ? (
              <div style={{ fontSize: '0.82rem', color: '#f59e0b', fontStyle: 'italic', background: 'rgba(245, 158, 11, 0.08)', padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                🛡️ <strong>Recording Not Stored:</strong> Customer declined audio recording consent before or during this call. Call proceeded in privacy-first mode.
              </div>
            ) : resolvedAudioUrl ? (
              <audio 
                controls 
                style={{ width: '100%', outline: 'none', filter: 'invert(0.9) hue-rotate(180deg)' }}
                src={resolvedAudioUrl}
              >
                Your browser does not support audio playback.
              </audio>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Audio stream was captured during the live session. (Audio recording saved in IndexedDB or mic permission was silent).
              </div>
            )}
          </div>

          {/* Structured AI Summary 8-Part Grid */}
          <div className="summary-blocks-grid">
            {/* 1. Overview */}
            <div className="summary-block-card overview">
              <div className="summary-block-title">
                <FileText size={15} color="#818cf8" />
                1. Conversation Overview
              </div>
              <div className="summary-block-text">
                {summary.overview || 'Sales exploratory conversation completed.'}
              </div>
            </div>

            {/* 2. Customer Requirements */}
            <div className="summary-block-card">
              <div className="summary-block-title">
                <Check size={15} color="#38bdf8" />
                2. Customer Requirements & Business
              </div>
              <div className="summary-block-text">
                {summary.customerRequirements || 'Explored automation and product fit for business workflow.'}
              </div>
            </div>

            {/* 3. Pain Points */}
            <div className="summary-block-card">
              <div className="summary-block-title">
                <AlertCircle size={15} color="#fb923c" />
                3. Pain Points & Desired Outcomes
              </div>
              <div className="summary-block-text">
                {summary.painPoints || 'Looking to reduce manual friction and increase operational efficiency.'}
              </div>
            </div>

            {/* 4. Product Interest */}
            <div className="summary-block-card">
              <div className="summary-block-title">
                <TrendingUp size={15} color="#34d399" />
                4. Product Interest & Buying Signals
              </div>
              <div className="summary-block-text">
                {summary.productInterest || 'Expressed positive interest in product capabilities and features.'}
              </div>
            </div>

            {/* 5. Objections Raised */}
            <div className="summary-block-card">
              <div className="summary-block-title">
                <XCircle size={15} color="#f87171" />
                5. Questions & Objections Raised
              </div>
              <div className="summary-block-text">
                {summary.objections || 'No critical blockers or pricing objections encountered.'}
              </div>
            </div>

            {/* 6. Budget & Timeline */}
            <div className="summary-block-card">
              <div className="summary-block-title">
                <Clock size={15} color="#fbbf24" />
                6. Budget, Timeline & Decision Details
              </div>
              <div className="summary-block-text">
                {summary.budgetTimeline || 'Not provided / Under review by decision makers.'}
              </div>
            </div>

            {/* 7. Promised Actions */}
            <div className="summary-block-card">
              <div className="summary-block-title">
                <HelpCircle size={15} color="#a78bfa" />
                7. Promised Actions & Follow-up
              </div>
              <div className="summary-block-text">
                {summary.promisedActions || 'Send product overview documentation and follow-up timeline.'}
              </div>
            </div>

            {/* 8. Recommended Next Steps */}
            <div className="summary-block-card" style={{ gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
              <div className="summary-block-title" style={{ color: '#34d399' }}>
                <ArrowRight size={15} color="#34d399" />
                8. Recommended Next Steps
              </div>
              <div className="summary-block-text" style={{ color: '#d1fae5' }}>
                {summary.nextSteps || 'Schedule a live product walkthrough with account executive.'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button 
            className="btn-primary" 
            onClick={() => {
              onClose();
              if (onNavigateToHistory) onNavigateToHistory();
            }}
          >
            <span>View in Call History</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

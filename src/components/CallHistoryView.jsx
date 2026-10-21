import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Eye, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  XCircle, 
  PhoneMissed,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { TranscriptDetailModal } from './TranscriptDetailModal';

const HistoryCardAudio = ({ call }) => {
  const [audioUrl, setAudioUrl] = useState(call.recording?.audioUrl || call.recording?.base64Data || null);

  useEffect(() => {
    let active = true;
    let createdUrl = null;
    if (!audioUrl && call.id && call.consentGranted !== false) {
      dbService.getAudioRecordingUrl(call.id).then((url) => {
        if (active && url) {
          createdUrl = url;
          setAudioUrl(url);
        }
      }).catch(() => {});
    }
    return () => {
      active = false;
      if (createdUrl && createdUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [call.id, call.consentGranted, audioUrl]);

  if (call.consentGranted === false) {
    return (
      <div style={{ fontSize: '0.74rem', color: '#fbbf24', fontStyle: 'italic', padding: '0.3rem 0' }}>
        🛡️ Recording declined by customer
      </div>
    );
  }

  if (!audioUrl) return null;

  return (
    <div className="card-audio-player">
      <audio controls src={audioUrl} preload="none" />
    </div>
  );
};

export const CallHistoryView = ({ calls, onUpdateCalls }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [inspectingCall, setInspectingCall] = useState(null);

  const statusClassMap = {
    'Converted': 'status-converted',
    'Interested': 'status-interested',
    'Demo Requested': 'status-demo-requested',
    'Follow-up Required': 'status-follow-up-required',
    'Not Interested': 'status-not-interested',
    'No Response': 'status-no-response'
  };

  const getStatusIcon = (statusKey) => {
    switch (statusKey) {
      case 'Converted': return <CheckCircle2 size={14} color="#10b981" />;
      case 'Interested': return <Sparkles size={14} color="#3b82f6" />;
      case 'Demo Requested': return <Calendar size={14} color="#8b5cf6" />;
      case 'Follow-up Required': return <Clock size={14} color="#f59e0b" />;
      case 'Not Interested': return <XCircle size={14} color="#ef4444" />;
      default: return <PhoneMissed size={14} color="#94a3b8" />;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor((seconds || 0) / 60);
    const secs = (seconds || 0) % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredCalls = calls.filter((call) => {
    const matchesStatus = selectedStatusFilter === 'ALL' || call.salesStatus === selectedStatusFilter;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const productMatch = (call.productName || '').toLowerCase().includes(q);
    const summaryMatch = (call.summary?.overview || '').toLowerCase().includes(q);
    const transcriptMatch = Array.isArray(call.transcript) && call.transcript.some(m => typeof m?.text === 'string' && m.text.toLowerCase().includes(q));
    const statusMatch = (call.salesStatus || '').toLowerCase().includes(q);
    return productMatch || summaryMatch || transcriptMatch || statusMatch;
  });

  const handleDeleteCall = (id) => {
    if (window.confirm('Delete this call record permanently?')) {
      const updated = dbService.deleteCall(id);
      onUpdateCalls(updated);
    }
  };

  const handleResetSampleCalls = () => {
    if (window.confirm('Reset call history to preloaded sample records?')) {
      const reset = dbService.resetToDefault();
      onUpdateCalls(reset);
    }
  };

  return (
    <div className="history-view-container">
      {/* History Toolbar */}
      <div className="history-toolbar">
        {/* Search */}
        <div className="search-input-box">
          <Search size={16} color="#94a3b8" />
          <input 
            type="text"
            placeholder="Search transcripts, summaries, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filters */}
        <div className="status-filter-pills">
          {['ALL', 'Converted', 'Interested', 'Demo Requested', 'Follow-up Required', 'Not Interested', 'No Response'].map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-btn ${selectedStatusFilter === status ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Export / Reset Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            onClick={() => dbService.exportCallsCSV()}
            title="Export call logs as CSV spreadsheet"
          >
            <FileSpreadsheet size={15} />
            <span>CSV</span>
          </button>

          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            onClick={() => dbService.exportCallsJSON()}
            title="Export raw JSON records"
          >
            <FileCode size={15} />
            <span>JSON</span>
          </button>

          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            onClick={handleResetSampleCalls}
            title="Reset to initial sample calls"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        <span>Showing <strong>{filteredCalls.length}</strong> of <strong>{calls.length}</strong> recorded calls</span>
      </div>

      {/* Call History Grid */}
      {filteredCalls.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <PhoneMissed size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3>No calls match your criteria</h3>
          <p style={{ fontSize: '0.88rem', marginTop: 6 }}>Try clearing your search query or selecting a different status filter.</p>
        </div>
      ) : (
        <div className="history-grid">
          {filteredCalls.map((call) => (
            <div key={call.id} className="glass-panel history-card">
              {/* Card Header */}
              <div className="history-card-header">
                <div className="card-title-group">
                  <span className="card-product-name">{call.productName || 'OmniFlow AI'}</span>
                  <span className="card-timestamp">{call.timestamp ? new Date(call.timestamp).toLocaleString() : 'Recent call'}</span>
                </div>

                <div className={`status-pill ${statusClassMap[call.salesStatus] || 'status-no-response'}`}>
                  {getStatusIcon(call.salesStatus)}
                  <span>{call.salesStatus}</span>
                </div>
              </div>

              {/* Meta Chips */}
              <div className="card-meta-chips">
                <span className="meta-chip">
                  <Clock size={12} />
                  {formatDuration(call.durationSeconds)}
                </span>
                <span className="meta-chip">
                  Lang: <strong>{(call.language || 'en').toUpperCase()}</strong>
                </span>
                <span className="meta-chip">
                  {call.transcript?.length || 0} messages
                </span>
              </div>

              {/* Summary Preview */}
              <div className="card-summary-preview">
                {call.summary?.overview || 'Conversation logged.'}
              </div>

              {/* Audio Player if recording exists / consent was granted */}
              <HistoryCardAudio call={call} />

              {/* Card Actions Footer */}
              <div className="card-actions-bar">
                <button 
                  type="button" 
                  className="btn-view-details"
                  onClick={() => setInspectingCall(call)}
                >
                  <Eye size={14} />
                  <span>View Transcript & AI Summary</span>
                </button>

                <button 
                  type="button" 
                  className="icon-btn" 
                  style={{ width: 32, height: 32 }}
                  onClick={() => handleDeleteCall(call.id)}
                  title="Delete call record"
                >
                  <Trash2 size={14} color="#f87171" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transcript Detail Modal */}
      {inspectingCall && (
        <TranscriptDetailModal 
          call={inspectingCall} 
          onClose={() => setInspectingCall(null)} 
        />
      )}
    </div>
  );
};

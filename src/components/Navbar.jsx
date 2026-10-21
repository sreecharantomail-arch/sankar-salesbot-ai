import React from 'react';
import { PhoneCall, History, BarChart3, Settings, Sparkles, ChevronDown } from 'lucide-react';

export const Navbar = ({ 
  activeTab, 
  setActiveTab, 
  selectedProduct, 
  onOpenSettings,
  isCallActive 
}) => {
  return (
    <nav className="navbar">
      <div className="brand-wrapper">
        <div className="brand-logo-icon">
          <PhoneCall size={22} />
        </div>
        <div className="brand-info">
          <div className="brand-title">
            Sankar SalesBot AI
            <span className="brand-badge">SaaS Voice Agent</span>
          </div>
          <span className="brand-sub">Autonomous Voice Sales & Revenue Pipeline</span>
        </div>
      </div>

      <div className="nav-tabs">
        <button 
          className={`nav-tab-btn ${activeTab === 'call' ? 'active' : ''}`}
          onClick={() => setActiveTab('call')}
        >
          <PhoneCall size={16} />
          <span>Live Call Room</span>
          {isCallActive && <span className="rec-blinking-circle" style={{ width: 8, height: 8 }} />}
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>Call History</span>
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} />
          <span>Sales Analytics</span>
        </button>
      </div>

      <div className="nav-actions">
        <div className="product-selector-pill" onClick={onOpenSettings} title="Click to change SaaS product or AI settings">
          <Sparkles size={14} color="#38bdf8" />
          <span style={{ fontWeight: 600 }}>{selectedProduct.name}</span>
          <ChevronDown size={14} color="#94a3b8" />
        </div>

        <button 
          className="icon-btn" 
          onClick={onOpenSettings}
          title="Bot Settings & API Keys"
        >
          <Settings size={18} />
        </button>
      </div>
    </nav>
  );
};

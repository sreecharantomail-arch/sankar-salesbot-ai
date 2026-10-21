import React, { useState } from 'react';
import { X, Key, Bot, Volume2, Save, CheckCircle2 } from 'lucide-react';
import { SAAS_PRODUCTS } from '../data/saasProducts';
import { voiceService } from '../services/voiceService';

export const SettingsModal = ({
  isOpen,
  onClose,
  selectedProduct,
  setSelectedProduct,
  language,
  setLanguage
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Custom product state
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTagline, setCustomTagline] = useState('');
  const [customPricing, setCustomPricing] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();

    if (isCustomProduct && customName.trim()) {
      const customProd = {
        id: 'custom-' + Date.now(),
        name: customName,
        category: 'Custom SaaS Solution',
        tagline: customTagline || 'Enterprise SaaS Solution',
        description: customDescription || 'Custom enterprise software solving business workflows.',
        pricing: {
          starter: customPricing || '$49 / user / month',
          growth: '$99 / user / month',
          enterprise: 'Custom Quote'
        },
        trial: '14-day free trial',
        keyFeatures: [
          'Enterprise Automation & Workflow Speed',
          'Cloud-native Scalability',
          'Instant 2-click Integration',
          'Dedicated Customer Support'
        ],
        objectionHandling: {
          budget: `Our solution delivers positive ROI within 30 days, starting at just ${customPricing || '$49/month'}.`,
          competition: 'We streamline your team’s existing workflows without rip-and-replace friction.',
          timing: 'Our setup takes under 10 minutes with zero code required.',
          authority: 'We can arrange a tailored 15-minute screen-share for your leadership team.'
        },
        greetings: {
          en: `Hello! I'm your AI sales representative for ${customName}. How is your team currently tackling this workflow?`,
          hi: `नमस्ते! मैं ${customName} का AI सेल्स एडवाइज़र हूँ। क्या आपकी टीम इसके लिए कोई टूल इस्तेमाल कर रही है?`,
          te: `నమస్కారం! నేను ${customName} యొక్క AI సేల్స్ ప్రతినిధిని. మీ టీమ్ ఈ పని కోసం ఏదైనా సాఫ్ట్‌వేర్ వాడుతున్నారా?`
        }
      };
      setSelectedProduct(customProd);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const testVoice = () => {
    const testPhrase = language === 'hi' 
      ? 'नमस्ते! मैं ओम्निफ्लो एआई से आपकी सहायता के लिए तैयार हूँ।'
      : language === 'te'
      ? 'నమస్కారం! నేను ఓమ్నిఫ్లో AI సేల్స్ అసిస్టెంట్‌ని మాట్లాడటానికి సిద్ధంగా ఉన్నాను.'
      : 'Hello! I am ready to conduct interactive voice conversations with your customers.';
    
    voiceService.speak(testPhrase, { lang: language });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-logo-icon" style={{ width: 34, height: 34 }}>
              <Bot size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Bot & Product Configuration</h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Customize SaaS product details, language, and AI reasoning backend
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* 1. SaaS Product Selection */}
            <div className="form-group">
              <label className="form-label">Active SaaS Product to Sell:</label>
              <select 
                className="form-select"
                value={isCustomProduct ? 'custom' : selectedProduct.id}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomProduct(true);
                  } else {
                    setIsCustomProduct(false);
                    const prod = SAAS_PRODUCTS.find(p => p.id === e.target.value);
                    if (prod) setSelectedProduct(prod);
                  }
                }}
              >
                {SAAS_PRODUCTS.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} ({prod.category})
                  </option>
                ))}
                <option value="custom">✨ + Custom SaaS Product (Define Your Own)</option>
              </select>
            </div>

            {/* Custom Product Inputs if toggled */}
            {isCustomProduct && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Custom Product Name:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. HealthSync Pro, DataPulse AI" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    required={isCustomProduct}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">One-Line Tagline:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. AI-driven hospital patient scheduling" 
                    value={customTagline}
                    onChange={(e) => setCustomTagline(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pricing / Starter Plan:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. $79 / month with 14-day trial" 
                    value={customPricing}
                    onChange={(e) => setCustomPricing(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Key Features & Workflow Description:</label>
                  <textarea 
                    className="form-input" 
                    rows={2}
                    placeholder="e.g. Real-time patient triage, automated scheduling, and EHR integration." 
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* 2. Conversation Language */}
            <div className="form-group">
              <label className="form-label">Default Spoken & Text Language:</label>
              <div className="lang-buttons-group" style={{ display: 'flex', gap: 8 }}>
                {[
                  { code: 'en', label: 'English (US / IN)' },
                  { code: 'hi', label: 'Hindi (हिंदी)' },
                  { code: 'te', label: 'Telugu (తెలుగు)' }
                ].map(l => (
                  <button
                    key={l.code}
                    type="button"
                    className={`btn-secondary ${language === l.code ? 'active' : ''}`}
                    style={{ flex: 1, borderColor: language === l.code ? 'var(--accent-indigo)' : undefined, background: language === l.code ? 'rgba(99, 102, 241, 0.25)' : undefined }}
                    onClick={() => setLanguage(l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              {language === 'te' && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)', padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚡ <strong>Telugu Speed Boost:</strong> AI voice cadence automatically tuned to <strong>1.5x (+0.50x increase)</strong> for brisk, professional delivery.</span>
                </div>
              )}
            </div>

            {/* Voice Test Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>Test Speech Synthesis Voice</span>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Preview the bot's pronunciation for the selected language</p>
              </div>
              <button type="button" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={testVoice}>
                <Volume2 size={15} />
                <span>Test Voice</span>
              </button>
            </div>

            {/* 3. Enterprise Security & Model Architecture */}
            <div className="form-group" style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '1rem', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <label className="form-label" style={{ color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Key size={14} color="#34d399" />
                <span>Enterprise Security &amp; Model Architecture</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4 }}>
                  <span>Live Voice Model:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Gemini 3.8 Live (Native Audio)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4 }}>
                  <span>Text Reasoning Model:</span>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>Gemini 2.5 Flash</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4 }}>
                  <span>API Key Isolation:</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Server-Side Only (server/.env)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Browser Privacy:</span>
                  <span style={{ color: '#94a3b8' }}>Zero permanent keys in localStorage</span>
                </div>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                For enterprise security, master credentials are never stored in the browser. Voice sessions use short-lived, restricted tokens generated by the backend server.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {savedSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

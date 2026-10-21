import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { CallHUD } from './components/CallRoom/CallHUD';
import { LiveChatScreen } from './components/CallRoom/LiveChatScreen';
import { CallSummaryModal } from './components/CallSummaryModal';
import { CallHistoryView } from './components/CallHistoryView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SettingsModal } from './components/SettingsModal';

import { SAAS_PRODUCTS } from './data/saasProducts';
import { voiceService } from './services/voiceService';
import { audioRecorder } from './services/audioRecorderService';
import { salesAgentEngine } from './services/salesAgentEngine';
import { geminiLiveService } from './services/geminiLiveService';
import { dbService } from './services/dbService';

export default function App() {
  const [activeTab, setActiveTab] = useState('call'); // 'call' | 'history' | 'analytics'
  const [selectedProduct, setSelectedProduct] = useState(SAAS_PRODUCTS[0]);
  const [language, setLanguage] = useState('en'); // 'en' | 'hi' | 'te'

  // Call Room state
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'calling' | 'bot_speaking' | 'listening' | 'processing' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isRecordingConsentGranted, setIsRecordingConsentGranted] = useState(false);
  const [activeVoiceEngine, setActiveVoiceEngine] = useState('idle'); // 'idle' | 'gemini-live' | 'consultative-fallback'
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Live dialogue state
  const [transcript, setTranscript] = useState([]);
  const [interimUserSpeech, setInterimUserSpeech] = useState('');

  // Modals & History state
  const [completedCallRecord, setCompletedCallRecord] = useState(null);
  const [calls, setCalls] = useState(() => dbService.getAllCalls());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // References for live closures
  const timerRef = useRef(null);
  const callDurationRef = useRef(0);
  const transcriptRef = useRef([]);
  const callStatusRef = useRef('idle');
  const isSpeakerMutedRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const activeVoiceEngineRef = useRef('idle');

  // Sync refs
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    activeVoiceEngineRef.current = activeVoiceEngine;
  }, [activeVoiceEngine]);

  // Sync IndexedDB on mount
  useEffect(() => {
    dbService.initDB().then(() => {
      const records = dbService.getAllCalls();
      if (records && records.length > 0) {
        setCalls(records);
      }
    }).catch(() => {});
  }, []);

  // Format time MM:SS
  const getFormattedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Call Handler
  const handleStartCall = async () => {
    // 1. Reset state cleanly to prevent context contamination from previous calls
    setTranscript([]);
    transcriptRef.current = [];
    setInterimUserSpeech('');
    setCallDuration(0);
    callDurationRef.current = 0;
    setCompletedCallRecord(null);
    setCallStatus('calling');

    // 2. Play ringtone and start audio recorder with explicit consent status (defaults to false)
    audioRecorder.playRingtone();
    await audioRecorder.startRecording({ consentGranted: isRecordingConsentGranted });

    // 3. Start Call Duration Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // 4. Connect to Gemini Live if supported; otherwise fallback to consultative voice mode
    let liveSessionEstablished = false;
    if (geminiLiveService.isSupported()) {
      try {
        await geminiLiveService.connect({
          product: selectedProduct,
          language,
          onOpen: () => {
            console.log('Gemini Live session connected with gemini-3.8-live');
          },
          onTranscriptionChunk: (_chunkText, fullTurnText) => {
            if (fullTurnText) {
              setInterimUserSpeech('');
            }
          },
          onTurnComplete: (finishedText) => {
            if (finishedText && finishedText.trim()) {
              const botTimeStr = getFormattedTime(callDurationRef.current);
              const botMsg = {
                sender: 'bot',
                text: finishedText.trim(),
                time: botTimeStr,
                source: 'gemini-live',
                model: 'gemini-3.8-live',
                isFallback: false
              };
              setTranscript((prev) => [...prev, botMsg]);
            }
          },
          onStartSpeaking: () => {
            setCallStatus('bot_speaking');
          },
          onStopSpeaking: () => {
            if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'idle') {
              setCallStatus('listening');
            }
          },
          onInterrupted: () => {
            console.log('Gemini Live speech interrupted (barge-in)');
          },
          onError: (err) => {
            console.warn('Gemini Live session notice:', err);
          },
          onClose: () => {
            console.log('Gemini Live session closed');
          }
        });

        liveSessionEstablished = true;
        setActiveVoiceEngine('gemini-live');
        audioRecorder.playConnectedSound();
        geminiLiveService.setMicMuted(isMicMutedRef.current);
        geminiLiveService.setSpeakerMuted(isSpeakerMutedRef.current);
        setCallStatus('listening');
      } catch (liveErr) {
        console.info('Gemini Live session unavailable (activating consultative fallback):', liveErr.message);
        liveSessionEstablished = false;
      }
    }

    if (!liveSessionEstablished) {
      setActiveVoiceEngine('consultative-fallback');
      audioRecorder.playConnectedSound();

      // Retrieve product greeting
      const greeting = selectedProduct.greetings[language] || selectedProduct.greetings['en'];
      const initialMessage = {
        sender: 'bot',
        text: greeting,
        time: getFormattedTime(0),
        source: 'initial-greeting',
        model: 'Consultative Synthesizer',
        isFallback: true
      };

      setTranscript([initialMessage]);
      setCallStatus('bot_speaking');

      // Bot speaks greeting via Web Speech synthesis
      if (!isSpeakerMutedRef.current) {
        voiceService.speak(greeting, {
          lang: language,
          onStart: () => setCallStatus('bot_speaking'),
          onEnd: () => {
            // Once bot greeting ends, begin listening to customer
            if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'idle') {
              startCustomerListening();
            }
          }
        });
      } else {
        // If muted, switch directly to listening
        setTimeout(() => {
          if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'idle') {
            startCustomerListening();
          }
        }, 1200);
      }
    }
  };

  // Start listening to customer's voice
  const startCustomerListening = () => {
    if (isMicMutedRef.current || callStatusRef.current === 'ended') return;

    setCallStatus('listening');

    voiceService.startRecognition({
      lang: language,
      onStart: () => {
        setCallStatus('listening');
      },
      onInterimResult: ({ interim }) => {
        if (!isMicMutedRef.current) {
          setInterimUserSpeech(interim);
        }
      },
      onFinalResult: (finalText) => {
        setInterimUserSpeech('');
        if (finalText && finalText.trim() && !isMicMutedRef.current) {
          handleCustomerMessage(finalText.trim());
        }
      },
      onError: (err) => {
        console.warn('Recognition notice:', err);
      }
    });
  };

  // Handle a committed customer message (either spoken or typed)
  const handleCustomerMessage = async (userText) => {
    voiceService.stopRecognition();
    setInterimUserSpeech('');

    const timeStr = getFormattedTime(callDurationRef.current);
    const userMsg = { sender: 'user', text: userText, time: timeStr };
    const updatedHistory = [...transcriptRef.current, userMsg];
    setTranscript(updatedHistory);

    // If active Gemini Live session is connected, forward text to Live session
    if (activeVoiceEngineRef.current === 'gemini-live' && geminiLiveService.isConnected) {
      geminiLiveService.sendTextMessage(userText);
      setCallStatus('processing');
      return;
    }

    setCallStatus('processing');

    try {
      // Generate intelligent sales response
      const botReply = await salesAgentEngine.generateResponse({
        userMessage: userText,
        conversationHistory: updatedHistory,
        product: selectedProduct,
        language
      });

      audioRecorder.playMessageChime();

      // Retrieve response metadata from the AI engine
      const meta = salesAgentEngine.getLastResponseMeta();
      const botTimeStr = getFormattedTime(callDurationRef.current);
      const botMsg = { 
        sender: 'bot', 
        text: botReply, 
        time: botTimeStr,
        source: meta.source,
        model: meta.model,
        isFallback: meta.isFallback
      };
      const finalHistory = [...updatedHistory, botMsg];
      setTranscript(finalHistory);

      setCallStatus('bot_speaking');

      if (!isSpeakerMutedRef.current) {
        voiceService.speak(botReply, {
          lang: language,
          onStart: () => setCallStatus('bot_speaking'),
          onEnd: () => {
            if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'idle') {
              startCustomerListening();
            }
          }
        });
      } else {
        setTimeout(() => {
          if (callStatusRef.current !== 'ended' && callStatusRef.current !== 'idle') {
            startCustomerListening();
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Error generating AI response:', err);
      startCustomerListening();
    }
  };

  // End Call Handler
  const handleEndCall = async () => {
    // 1. Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 2. Stop voice services and Gemini Live session cleanly
    geminiLiveService.disconnect(true);
    voiceService.stopSpeaking();
    voiceService.stopRecognition();
    audioRecorder.playHangupSound();

    const durationSnapshot = callDurationRef.current;
    const transcriptSnapshot = [...transcriptRef.current];
    const engineSnapshot = activeVoiceEngineRef.current;
    setActiveVoiceEngine('idle');

    // 3. Stop recording and get audio data
    const recordingResult = await audioRecorder.stopRecording();
    setCallStatus('ended');

    // 4. Perform AI Analysis & Classification
    const analysis = await salesAgentEngine.analyzeCallTranscript({
      transcript: transcriptSnapshot,
      durationSeconds: durationSnapshot,
      product: selectedProduct,
      language
    });

    // 5. Build completed call record
    const callRecord = {
      id: 'call-' + Date.now(),
      timestamp: new Date().toISOString(),
      productName: selectedProduct.name,
      language,
      durationSeconds: durationSnapshot,
      consentGranted: isRecordingConsentGranted,
      salesStatus: analysis.salesStatus,
      confidenceScore: analysis.confidenceScore,
      statusReason: analysis.statusReason,
      summary: analysis.summary,
      recording: recordingResult,
      transcript: transcriptSnapshot,
      voiceEngine: engineSnapshot
    };

    // 6. Save in persistent storage
    const updatedCalls = dbService.saveCall(callRecord);
    setCalls(updatedCalls);

    // 7. Open post-call summary modal
    setCompletedCallRecord(callRecord);
  };

  // Toggle Mute Microphone
  const toggleMicMute = () => {
    setIsMicMuted((prev) => {
      const next = !prev;
      geminiLiveService.setMicMuted(next);
      if (next) {
        voiceService.stopRecognition();
        setInterimUserSpeech('');
      } else {
        if (callStatus === 'listening' && activeVoiceEngineRef.current !== 'gemini-live') {
          startCustomerListening();
        }
      }
      return next;
    });
  };

  // Toggle Mute AI Voice Speaker
  const toggleSpeakerMute = () => {
    setIsSpeakerMuted((prev) => {
      const next = !prev;
      geminiLiveService.setSpeakerMuted(next);
      if (next) {
        voiceService.stopSpeaking();
      }
      return next;
    });
  };

  // Replay a message
  const handleReplayAudio = (text) => {
    voiceService.speak(text, { lang: language });
  };

  // Adjust Status in modal
  const handleSaveStatusChange = (callId, newStatus) => {
    const updated = calls.map((c) => {
      if (c.id === callId) {
        return { ...c, salesStatus: newStatus };
      }
      return c;
    });
    setCalls(updated);
    localStorage.setItem('sankar_salesbot_calls_v1', JSON.stringify(updated));
  };

  return (
    <div>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedProduct={selectedProduct}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isCallActive={callStatus !== 'idle' && callStatus !== 'ended'}
      />

      {/* Main Container */}
      <main className="app-container">
        {activeTab === 'call' && (
          <div className="call-room-grid">
            {/* Left: Call HUD & 3D Visualizer */}
            <CallHUD
              callStatus={callStatus}
              callDuration={callDuration}
              isRecordingConsentGranted={isRecordingConsentGranted}
              setIsRecordingConsentGranted={setIsRecordingConsentGranted}
              language={language}
              setLanguage={setLanguage}
              selectedProduct={selectedProduct}
              isMicMuted={isMicMuted}
              toggleMicMute={toggleMicMute}
              isSpeakerMuted={isSpeakerMuted}
              toggleSpeakerMute={toggleSpeakerMute}
              onStartCall={handleStartCall}
              onEndCall={handleEndCall}
              activeVoiceEngine={activeVoiceEngine}
            />

            {/* Right: Live Chat Screen */}
            <LiveChatScreen
              transcript={transcript}
              interimUserSpeech={interimUserSpeech}
              callStatus={callStatus}
              onSendMessage={handleCustomerMessage}
              onReplayAudio={handleReplayAudio}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <CallHistoryView
            calls={calls}
            onUpdateCalls={(updated) => setCalls(updated)}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </main>

      {/* Post-Call Summary Modal */}
      {completedCallRecord && (
        <CallSummaryModal
          callRecord={completedCallRecord}
          onClose={() => setCompletedCallRecord(null)}
          onSaveStatusChange={handleSaveStatusChange}
          onNavigateToHistory={() => {
            setCompletedCallRecord(null);
            setActiveTab('history');
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          language={language}
          setLanguage={setLanguage}
        />
      )}
    </div>
  );
}

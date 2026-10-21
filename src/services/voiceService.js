// Enhanced Multi-Engine Voice Service (Web Speech API + Cloud Audio Fallback)
// Fixes known Chromium bugs: utterance garbage collection, cancel() race conditions, and paused state.

class VoiceService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.voices = [];
    this.isListening = false;
    this.isSpeaking = false;
    this.audioElement = null;
    
    // Prevent Chromium V8 garbage collection of utterances
    if (typeof window !== 'undefined') {
      window.__speechUtterances = window.__speechUtterances || [];
    }

    this.initVoices();
    this.setupUserGestureUnlock();
  }

  // Pre-unlock speech synthesis on any user interaction to bypass browser autoplay blocks
  setupUserGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.synth) {
        try {
          this.synth.resume();
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('click', unlock, { once: false, passive: true });
    window.addEventListener('keydown', unlock, { once: false, passive: true });
  }

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      try {
        this.voices = this.synth.getVoices() || [];
      } catch (e) {
        console.warn('Error loading voices:', e);
      }
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  getVoices() {
    if (!this.voices || this.voices.length === 0) {
      if (this.synth) {
        this.voices = this.synth.getVoices() || [];
      }
    }
    return this.voices;
  }

  getBestVoice(langCode) {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    let targetPrefix = 'en';
    if (langCode === 'hi') targetPrefix = 'hi';
    if (langCode === 'te') targetPrefix = 'te';

    // 1. Look for high quality online / neural voices
    const naturalVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith(targetPrefix) && 
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online'))
    );
    if (naturalVoice) return naturalVoice;

    // 2. Look for any matching voice by language prefix
    const matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix));
    if (matchingVoice) return matchingVoice;

    // 3. Indian English fallback
    if (langCode === 'en') {
      const inMatch = voices.find(v => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en-us'));
      if (inMatch) return inMatch;
    }

    return voices.find(v => v.default) || voices[0] || null;
  }

  // Speak using Cloud Audio TTS via secure backend proxy
  // Bypasses browser CORS restrictions and guarantees natural spoken audio for Telugu & Hindi
  speakViaCloudAudio(text, langCode, { onStart, onEnd, onError, rate } = {}) {
    try {
      this.stopSpeaking();

      let tl = 'en';
      if (langCode === 'hi') tl = 'hi';
      else if (langCode === 'te') tl = 'te';

      // Default to 1.50x (+0.50x speed boost) for Telugu for fast, brisk, professional sales delivery
      const effectiveRate = rate !== undefined ? rate : (langCode === 'te' ? 1.50 : 1.0);

      const cleanText = text.replace(/[*_#`]/g, '').trim().slice(0, 600);
      const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 
        (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) || 
        'http://localhost:3001';

      const audioUrl = `${apiBase}/api/tts?lang=${tl}&text=${encodeURIComponent(cleanText)}`;

      const audio = new Audio(audioUrl);
      this.audioElement = audio;

      // Apply playback speed
      audio.defaultPlaybackRate = effectiveRate;
      audio.playbackRate = effectiveRate;
      if ('preservesPitch' in audio) {
        audio.preservesPitch = true;
      }

      audio.onplay = () => {
        // Enforce playback rate on play event to guarantee browser doesn't reset it
        audio.playbackRate = effectiveRate;
        this.isSpeaking = true;
        if (onStart) onStart();
      };

      audio.onended = () => {
        this.isSpeaking = false;
        this.audioElement = null;
        if (onEnd) onEnd();
      };

      audio.onerror = (e) => {
        console.warn('Backend TTS audio stream error, falling back to local speech synthesis:', e);
        this.isSpeaking = false;
        this.audioElement = null;
        this.speakViaBrowserSynth(cleanText, langCode, { rate: effectiveRate, onStart, onEnd, onError });
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play was prevented by browser policy, attempting browser synth:', err);
          this.isSpeaking = false;
          this.audioElement = null;
          this.speakViaBrowserSynth(cleanText, langCode, { rate: effectiveRate, onStart, onEnd, onError });
        });
      }
    } catch (e) {
      console.warn('TTS playback exception:', e);
      this.speakViaBrowserSynth(text, langCode, { rate, onStart, onEnd, onError });
    }
  }

  // Local Web Speech API synthesis helper
  speakViaBrowserSynth(cleanText, lang, { rate, pitch = 1.0, onStart, onEnd, onError } = {}) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    const effectiveRate = rate !== undefined ? rate : (lang === 'te' ? 1.50 : 1.0);
    this.stopSpeaking();

    try {
      this.synth.resume();
    } catch {}

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);

        if (lang === 'hi') utterance.lang = 'hi-IN';
        else if (lang === 'te') utterance.lang = 'te-IN';
        else utterance.lang = 'en-US';

        const voice = this.getBestVoice(lang);
        if (voice) {
          utterance.voice = voice;
        }

        utterance.rate = effectiveRate;
        utterance.pitch = pitch;

        let hasEnded = false;

        utterance.onstart = () => {
          this.isSpeaking = true;
          if (onStart) onStart();
        };

        const cleanupAndFinish = () => {
          if (hasEnded) return;
          hasEnded = true;
          this.isSpeaking = false;
          if (typeof window !== 'undefined' && window.__speechUtterances) {
            window.__speechUtterances = window.__speechUtterances.filter(u => u !== utterance);
          }
          if (onEnd) onEnd();
        };

        utterance.onend = cleanupAndFinish;

        utterance.onerror = (event) => {
          if (event.error === 'interrupted' || event.error === 'canceled') {
            this.isSpeaking = false;
            return;
          }
          console.warn('SpeechSynthesis error:', event.error);
          cleanupAndFinish();
          if (onError) onError(event);
        };

        if (typeof window !== 'undefined') {
          window.__speechUtterances = window.__speechUtterances || [];
          window.__speechUtterances.push(utterance);
        }

        this.synth.resume();
        this.synth.speak(utterance);
      } catch (err) {
        console.error('Error in SpeechSynthesis.speak:', err);
        if (onEnd) onEnd();
      }
    }, 60);
  }

  // Calculate effective speech rate (Telugu defaults to 1.50x - an increase of +0.50x speed)
  getEffectiveRate(lang = 'en', customRate) {
    if (customRate !== undefined && customRate !== null) return customRate;
    return lang === 'te' ? 1.50 : 1.0;
  }

  // Master speak method: Uses Web Speech API with Chrome bug fixes, or backend audio TTS for Telugu/Hindi
  speak(text, { lang = 'en', rate, pitch = 1.0, onStart, onEnd, onError } = {}) {
    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    const effectiveRate = this.getEffectiveRate(lang, rate);
    const cleanText = text.replace(/[*_#`]/g, '').trim();

    // Check if local voices exist for this language
    const voices = this.getVoices();
    const hasMatchingVoice = voices.some(v => {
      const p = lang === 'hi' ? 'hi' : lang === 'te' ? 'te' : 'en';
      return v.lang.toLowerCase().startsWith(p);
    });

    // If language is Telugu ('te') or Hindi ('hi' without local voice), or synth is unavailable:
    // Route to server-side audio proxy which streams genuine Telugu audio!
    if (!this.synth || lang === 'te' || (lang === 'hi' && !hasMatchingVoice) || (voices.length > 0 && !hasMatchingVoice)) {
      this.speakViaCloudAudio(cleanText, lang, { rate: effectiveRate, onStart, onEnd, onError });
      return;
    }

    this.speakViaBrowserSynth(cleanText, lang, { rate: effectiveRate, pitch, onStart, onEnd, onError });
  }

  stopSpeaking() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement = null;
      } catch {
        // ignore
      }
    }
    this.isSpeaking = false;
  }

  isRecognitionSupported() {
    return typeof window !== 'undefined' && 
      (Boolean(window.SpeechRecognition) || Boolean(window.webkitSpeechRecognition));
  }

  startRecognition({
    lang = 'en',
    onInterimResult,
    onFinalResult,
    onError,
    onStart,
    onEnd
  } = {}) {
    if (!this.isRecognitionSupported()) {
      if (onError) onError({ error: 'not_supported', message: 'Speech Recognition API is not supported in this browser.' });
      return null;
    }

    this.stopRecognition();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    if (lang === 'hi') {
      this.recognition.lang = 'hi-IN';
    } else if (lang === 'te') {
      this.recognition.lang = 'te-IN';
    } else {
      this.recognition.lang = 'en-US';
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    let silenceTimer = null;
    let accumulatedFinalTranscript = '';

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (accumulatedFinalTranscript.trim()) {
          const committedText = accumulatedFinalTranscript.trim();
          accumulatedFinalTranscript = '';
          if (onFinalResult) {
            onFinalResult(committedText);
          }
        }
      }, 1500);
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      if (onStart) onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedFinalTranscript += ' ' + transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (onInterimResult) {
        onInterimResult({
          interim: interimTranscript,
          currentFinal: accumulatedFinalTranscript.trim()
        });
      }

      resetSilenceTimer();
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.warn('SpeechRecognition error:', event.error);
      if (onError) onError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (silenceTimer) clearTimeout(silenceTimer);
      if (accumulatedFinalTranscript.trim()) {
        const committedText = accumulatedFinalTranscript.trim();
        accumulatedFinalTranscript = '';
        if (onFinalResult) onFinalResult(committedText);
      }
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
    }

    return this.recognition;
  }

  stopRecognition() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.isListening = false;
  }
}

export const voiceService = new VoiceService();

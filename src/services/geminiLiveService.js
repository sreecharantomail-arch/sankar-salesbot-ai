// Dedicated Gemini Live WebSocket Service
// Uses short-lived ephemeral tokens issued by server/ POST /api/gemini/token
// Never exposes permanent GEMINI_API_KEY to browser
// Streams 16kHz PCM audio to Gemini Live and plays 24kHz PCM response audio in real time

class GeminiLiveService {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.audioInputSource = null;
    this.scriptProcessor = null;
    this.outputAudioContext = null;
    this.nextScheduledTime = 0;
    this.activeSourceNodes = [];
    this.isConnected = false;
    this.isSessionReady = false;
    this.currentTurnText = '';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.isManuallyDisconnected = false;
    this.lastConnectParams = null;
    this.isMicMuted = false;
    this.isSpeakerMuted = false;
  }

  setMicMuted(isMuted) {
    this.isMicMuted = Boolean(isMuted);
  }

  setSpeakerMuted(isMuted) {
    this.isSpeakerMuted = Boolean(isMuted);
    if (isMuted) {
      this.stopAudioPlayback();
    }
  }

  // Check if browser supports Web Audio and MediaDevices
  isSupported() {
    return typeof window !== 'undefined' &&
      !!(window.AudioContext || window.webkitAudioContext) &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof WebSocket !== 'undefined';
  }

  // Request ephemeral token from server
  async getEphemeralToken({ product, language } = {}) {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:3001';
    
    const response = await fetch(`${apiBase}/api/gemini/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, language })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to obtain Gemini Live token: HTTP ${response.status}`);
    }

    return await response.json();
  }

  // Connect to Gemini Live session
  async connect({
    product,
    language = 'en',
    onOpen,
    onTranscriptionChunk,
    onTurnComplete,
    onStartSpeaking,
    onStopSpeaking,
    onInterrupted,
    onError,
    onClose
  } = {}) {
    if (!this.isSupported()) {
      throw new Error('Web Audio or WebSockets are not supported in this browser.');
    }

    this.lastConnectParams = {
      product,
      language,
      onOpen,
      onTranscriptionChunk,
      onTurnComplete,
      onStartSpeaking,
      onStopSpeaking,
      onInterrupted,
      onError,
      onClose
    };
    this.isManuallyDisconnected = false;

    this.disconnect(false);

    // 1. Obtain ephemeral token from secure server endpoint
    const tokenData = await this.getEphemeralToken({ product, language });
    const { token, model } = tokenData;

    if (!token) {
      throw new Error('No ephemeral token received from server.');
    }

    // 2. Open WebSocket to Google Generative Language Live endpoint
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;

    return new Promise((resolve, reject) => {
      let isOpened = false;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (wsErr) {
        return reject(wsErr);
      }

      this.ws.onopen = async () => {
        isOpened = true;
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Send initial setup message with system instruction and modality config
        const langDirective = language === 'hi'
          ? 'Respond in natural, conversational Hindi (हिंदी).'
          : language === 'te'
          ? 'Respond in natural, conversational Telugu (తెలుగు).'
          : 'Respond in natural, conversational English.';

        const systemPrompt = `You are Alex, an intelligent, empathetic, professional SaaS sales executive for "${product?.name || 'SaaS Platform'}".
Tagline: ${product?.tagline || ''}
Description: ${product?.description || ''}
Pricing: Starter: ${product?.pricing?.starter || '$49/mo'}, Growth: ${product?.pricing?.growth || '$99/mo'}, Enterprise: ${product?.pricing?.enterprise || 'Custom quote'}.
Trial: ${product?.trial || '14-day free trial'}.
Key Features: ${product?.keyFeatures?.join(', ') || 'AI automation'}.

CRITICAL SALES RULES:
1. Speak naturally like a real human consultant on a phone call. Keep answers concise (1-3 sentences) followed by a natural follow-up question.
2. Only speak verified product features. If feature or policy is unknown, be honest and offer to check with the engineering team.
3. ${langDirective}`;

        const activeModel = model || 'gemini-3.8-live';
        const modelEndpoint = activeModel.startsWith('models/') ? activeModel : `models/${activeModel}`;

        const setupMessage = {
          setup: {
            model: modelEndpoint,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            }
          }
        };

        this.ws.send(JSON.stringify(setupMessage));
        if (onOpen) onOpen();
      };

      this.ws.onmessage = async (event) => {
        try {
          let data;
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data);
          } else if (event.data instanceof Blob) {
            const text = await event.data.text();
            data = JSON.parse(text);
          }

          if (!data) return;

          // Acknowledge setup completion
          if (data.setupComplete) {
            this.isSessionReady = true;
            // Initialize mic capture after setup is complete
            await this.initMicrophoneCapture();
            resolve({ model, ready: true });
            return;
          }

          // Handle server content (AI speech and text)
          if (data.serverContent) {
            const { modelTurn, turnComplete, interrupted } = data.serverContent;

            if (interrupted) {
              this.stopAudioPlayback();
              if (onInterrupted) onInterrupted();
            }

            if (modelTurn?.parts) {
              for (const part of modelTurn.parts) {
                // If model returned text part
                if (part.text) {
                  this.currentTurnText += part.text;
                  if (onTranscriptionChunk) {
                    onTranscriptionChunk(part.text, this.currentTurnText);
                  }
                }

                // If model returned audio PCM
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                  this.playPcmChunk(part.inlineData.data);
                  if (onStartSpeaking) onStartSpeaking();
                }
              }
            }

            if (turnComplete) {
              const finishedText = this.currentTurnText.trim();
              this.currentTurnText = '';
              if (onTurnComplete) {
                onTurnComplete(finishedText);
              }
              if (onStopSpeaking) onStopSpeaking();
            }
          }
        } catch (msgErr) {
          console.warn('Error processing Gemini Live message:', msgErr);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Gemini Live WebSocket error:', err);
        if (!isOpened) {
          reject(new Error('WebSocket connection to Gemini Live failed.'));
        }
        if (onError) onError(err);
      };

      this.ws.onclose = (evt) => {
        this.isConnected = false;
        this.isSessionReady = false;
        if (onClose) onClose(evt);

        // Auto-reconnect on unexpected drop if not manually disconnected
        if (!this.isManuallyDisconnected && this.reconnectAttempts < this.maxReconnectAttempts && this.lastConnectParams) {
          this.reconnectAttempts++;
          const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 4000);
          console.log(`Gemini Live connection closed unexpectedly. Auto-reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffDelay}ms...`);
          setTimeout(() => {
            if (!this.isManuallyDisconnected && this.lastConnectParams) {
              this.connect(this.lastConnectParams).catch((err) => {
                console.warn('Live reconnection failed:', err.message);
              });
            }
          }, backoffDelay);
        }
      };
    });
  }

  // Initialize microphone capture and stream 16kHz PCM audio
  async initMicrophoneCapture() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });

    this.audioInputSource = this.audioContext.createMediaStreamSource(this.mediaStream);
    // 4096 buffer size at 16kHz corresponds to ~256ms audio frames
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      if (!this.isConnected || !this.isSessionReady || this.ws?.readyState !== WebSocket.OPEN) {
        return;
      }
      if (this.isMicMuted) {
        return;
      }

      const inputBuffer = audioProcessingEvent.inputBuffer;
      const channelData = inputBuffer.getChannelData(0);

      // Convert Float32Array to linear 16-bit PCM Int16Array
      const int16Array = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to Base64
      let binary = '';
      const bytes = new Uint8Array(int16Array.buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      // Stream realtimeInput to Gemini Live
      const audioMessage = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Audio
            }
          ]
        }
      };

      try {
        this.ws.send(JSON.stringify(audioMessage));
      } catch (err) {
        console.warn('Error sending audio frame:', err);
      }
    };

    this.audioInputSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  // Play incoming 24kHz PCM audio chunks smoothly
  playPcmChunk(base64Pcm) {
    if (this.isSpeakerMuted) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') {
        this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
        this.nextScheduledTime = this.outputAudioContext.currentTime;
      }

      if (this.outputAudioContext.state === 'suspended') {
        this.outputAudioContext.resume();
      }

      // Decode base64 to Float32Array
      const binaryString = atob(base64Pcm);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.outputAudioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const sourceNode = this.outputAudioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.outputAudioContext.destination);

      const currentTime = this.outputAudioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextScheduledTime);
      sourceNode.start(startTime);
      this.nextScheduledTime = startTime + audioBuffer.duration;

      this.activeSourceNodes.push(sourceNode);
      sourceNode.onended = () => {
        this.activeSourceNodes = this.activeSourceNodes.filter(n => n !== sourceNode);
      };
    } catch (e) {
      console.warn('Error playing PCM audio chunk:', e);
    }
  }

  // Stop currently playing audio on interruption
  stopAudioPlayback() {
    for (const node of this.activeSourceNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSourceNodes = [];
    if (this.outputAudioContext) {
      this.nextScheduledTime = this.outputAudioContext.currentTime;
    }
  }

  // Send text message directly into Live session
  sendTextMessage(text) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    const clientContentMessage = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: text.trim() }]
          }
        ],
        turnComplete: true
      }
    };

    this.ws.send(JSON.stringify(clientContentMessage));
    return true;
  }

  // Gracefully disconnect and release resources
  disconnect(manual = true) {
    if (manual) {
      this.isManuallyDisconnected = true;
      this.reconnectAttempts = 0;
      this.lastConnectParams = null;
    }
    this.isConnected = false;
    this.isSessionReady = false;
    this.currentTurnText = '';

    // Stop playback
    this.stopAudioPlayback();

    // Release microphone processor
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.audioInputSource) {
      try {
        this.audioInputSource.disconnect();
      } catch {}
      this.audioInputSource = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(t => t.stop());
      } catch {}
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      try {
        this.outputAudioContext.close();
      } catch {}
      this.outputAudioContext = null;
    }

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}

export const geminiLiveService = new GeminiLiveService();

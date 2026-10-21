// Audio Recording and Web Audio Sound Effects Service
// Captures user microphone audio using MediaRecorder API, manages recording consent,
// and synthesizes realistic telephone audio effects using Web Audio API oscillators.

class AudioRecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.audioContext = null;
    this.isRecording = false;
    this.recordingConsent = false;
    this.recordingStartTime = 0;
  }

  // Initialize Web Audio Context for sound effects
  getAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  // Sound effects synthesized via Web Audio API (zero external assets needed)
  playRingtone() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.setValueAtTime(0.15, now + 0.8);
      gain.gain.linearRampToValueAtTime(0, now + 0.9);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } catch (e) {
      console.warn('Web Audio ringtone error:', e);
    }
  }

  playConnectedSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.24); // G5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Web Audio connect sound error:', e);
    }
  }

  playHangupSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(320, now + 0.15);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Web Audio hangup sound error:', e);
    }
  }

  playMessageChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.08); // C6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Web Audio message chime error:', e);
    }
  }

  // Start recording microphone audio with explicit consent check (defaults to false)
  async startRecording(options = {}) {
    const consentGranted = typeof options === 'boolean'
      ? options
      : Boolean(options && options.consentGranted);

    this.recordingConsent = consentGranted;
    this.audioChunks = [];

    // Explicit consent is required: if not affirmatively granted, do not record audio
    if (!consentGranted) {
      this.isRecording = false;
      return { success: true, recordingEnabled: false, reason: 'Consent declined by user' };
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // collect in chunks every 250ms
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      return { success: true, recordingEnabled: true };
    } catch (err) {
      console.error('Error starting audio recording:', err);
      this.isRecording = false;
      this.cleanup();
      return { success: false, recordingEnabled: false, error: err.message };
    }
  }

  // Stop recording and return audio Blob + data URL
  async stopRecording() {
    return new Promise((resolve) => {
      if (!this.recordingConsent) {
        this.cleanup();
        resolve({
          blob: null,
          audioUrl: null,
          consentGranted: false,
          note: 'Call was not recorded (consent declined by user).'
        });
        return;
      }

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const audioUrl = URL.createObjectURL(blob);
          const durationSeconds = Math.round((Date.now() - this.recordingStartTime) / 1000);
          
          this.cleanup();
          resolve({
            blob,
            audioUrl,
            mimeType,
            sizeBytes: blob.size,
            durationSeconds,
            consentGranted: true
          });
        } catch (e) {
          console.error('Error stopping recording blob generation:', e);
          this.cleanup();
          resolve(null);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.warn('Error calling mediaRecorder.stop():', err);
        this.cleanup();
        resolve(null);
      }
    });
  }

  cleanup() {
    this.isRecording = false;
    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        console.warn('Error stopping media tracks:', e);
      }
      this.stream = null;
    }
  }
}

export const audioRecorder = new AudioRecorderService();

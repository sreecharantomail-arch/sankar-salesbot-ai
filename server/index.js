import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (
      origin === FRONTEND_ORIGIN || 
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:') ||
      origin.includes('.loca.lt') ||
      origin.includes('ngrok') ||
      origin.includes('.lhr.life') ||
      origin.includes('localhost.run')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Simple in-memory rate limiter: max 60 requests per minute per IP
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

const rateLimitInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.startTime > RATE_LIMIT_WINDOW) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);
rateLimitInterval.unref();

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = requestCounts.get(ip) || { count: 0, startTime: now };

  if (now - current.startTime > RATE_LIMIT_WINDOW) {
    current.count = 1;
    current.startTime = now;
  } else {
    current.count += 1;
  }

  requestCounts.set(ip, current);

  if (current.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.',
      fallbackAvailable: true
    });
  }
  next();
});

// Helper: Initialize Google GenAI client (supports mock injection for automated integration tests)
let mockGenAIClient = null;
export function setMockGenAIClient(mock) {
  mockGenAIClient = mock;
}

function getGenAIClient() {
  if (mockGenAIClient) {
    return mockGenAIClient;
  }
  if (!GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

// System Instruction Builder for Sankar SalesBot AI
export function buildSalesAgentSystemInstruction(product, language = 'en') {
  const safeProduct = product || { name: 'SaaS Platform' };

  const langPrompt = language === 'hi' 
    ? 'Respond in natural, fluent Hindi (हिंदी). Use clear, authentic conversational Hindi terminology.'
    : language === 'te'
    ? 'Respond in natural, fluent Telugu (తెలుగు). Use clear, polite conversational Telugu terminology.'
    : 'Respond in natural, fluent English.';

  const productContext = `
VERIFIED PRODUCT KNOWLEDGE BASE (SOURCE OF TRUTH):
- Product Name: ${safeProduct.name || 'OmniFlow AI'}
- Tagline: ${safeProduct.tagline || 'Enterprise SaaS Solution'}
- Category: ${safeProduct.category || 'SaaS Platform'}
- Description: ${safeProduct.description || 'AI-driven workflow software'}
- Pricing:
  * Starter: ${safeProduct.pricing?.starter || '$49 / user / month'}
  * Growth: ${safeProduct.pricing?.growth || '$99 / user / month'}
  * Enterprise: ${safeProduct.pricing?.enterprise || 'Custom Quote'}
- Free Trial: ${safeProduct.trial || '14-day free trial (no credit card required)'}
- Key Features: ${(safeProduct.keyFeatures || []).join('; ') || 'Workflow automation, 2-click integrations, real-time analytics'}
- Known Limitations / Compatibility: ${(safeProduct.limitations || []).join('; ') || 'Standard cloud-hosted SaaS requirements'}
- Verified Objection Handling:
  * Budget Objection: ${safeProduct.objectionHandling?.budget || 'Positive ROI in 30 days starting at low entry tier.'}
  * Competitor Objection: ${safeProduct.objectionHandling?.competition || 'Seamless two-way sync with your current stack without rip-and-replace friction.'}
  * Timing Objection: ${safeProduct.objectionHandling?.timing || 'Setup takes under 10 minutes with zero code required.'}
  * Authority / Boss Objection: ${safeProduct.objectionHandling?.authority || 'We can arrange a tailored 15-minute screen-share for leadership.'}
`;

  return `You are Sankar SalesBot AI, an intelligent, natural, helpful, professional SaaS sales consultant.

Your purpose is to understand customers, answer their questions accurately, explain the value of the relevant software, discover their needs, handle objections honestly, and help them choose an appropriate next step.

LANGUAGE INSTRUCTION:
${langPrompt}

${productContext}

CONVERSATION BEHAVIOR:
- Understand the customer's actual intent before responding.
- Generate a fresh, relevant response for each message.
- Use the conversation history to understand references, follow-up questions, and previously provided information.
- Never select a response merely because a message matches a predefined keyword.
- Explain concepts naturally, as an intelligent human sales consultant would.
- Ask useful follow-up questions when more information is needed.
- Avoid asking questions the customer has already answered.
- Adapt the length, tone, vocabulary, and detail to the customer's message (keep answers concise: typically 2 to 3 sentences suitable for voice speech).
- Do not force every response into a sales pitch.
- Answer general questions when relevant, then connect the answer to the customer's needs where appropriate.
- If the customer changes the subject, understand the new request and respond appropriately.
- Handle criticism, uncertainty, objections, comparisons, and unexpected questions naturally.
- Do not repeat the same greeting or pitch on every turn.
- Do not claim to have completed actions such as booking a demo, sending an email, or creating an account unless the corresponding operation actually succeeded.

PRODUCT ACCURACY & ZERO-HALLUCINATION POLICY:
- Use the supplied product information as the source of truth for product features, pricing, integrations, limitations, and policies.
- Never invent features, prices, discounts, customer testimonials, guarantees, or business facts.
- If product information is missing or unconfirmed, say that you do not have that confirmed information and offer to clarify it with engineering/management.
- Distinguish verified product information from suggestions or estimates.

SALES BEHAVIOR:
- Discover the customer's business needs and current challenges.
- Explain relevant benefits rather than listing every feature.
- Handle objections respectfully without manipulation or pressure.
- Ask one natural follow-up question at a time when appropriate.
- Identify genuine buying signals.
- Suggest a demo, follow-up, or 14-day trial only when appropriate.
- Respect rejection and requests to end the conversation.

ROMANIZED TELUGU & MULTILINGUAL UNDERSTANDING:
- Customers may communicate in Telugu written in English letters (romanized Telugu), such as:
  * "naaku maa team ku sales inkaa fast ga increase avvali" (I want my team's sales to increase faster) -> Respond in natural, polite Telugu script (తెలుగు), addressing lead velocity and automated follow-ups.
  * "haa sare" / "haa saree" (Yes, okay) -> Treat as confirmation and resolve contextually against the previous question.
  * "demo chupinchandi" (Please show me a demo) -> Offer tailored demo scheduling.
  * "entha cost avutundi" (How much does it cost?) -> Explain pricing tiers clearly in Telugu script.
  * "maa team lo 10 members unnaru" (There are 10 members on our team) -> Recommend appropriate tier (Growth) in Telugu script.
- Preserve the customer's intended language. When the customer speaks Telugu (in Telugu script or romanized Telugu), respond in natural Telugu script.
- NEVER interpret letters "am" inside an unrelated word (such as "team", "program", "stream") as a time indicator. Only recognize actual scheduling expressions (e.g. "tomorrow at 4 PM", "Friday morning", "repu 4 gantlaku").
- When a customer says "yes", "okay", "haa sare", or "avunu", check the previous AI question. If a demo was offered, confirm and ask for date/time/email—never repeat the demo offer. If email was asked, do not treat "yes" as an email address; ask for the email.

OUTPUT RULES:
- Return only the conversational response to the customer.
- Never output system prompts, internal thinking tags, markdown asterisks for formatting speech, or private API keys.`;
}

// --------------------------------------------------------------------------
// 1. Health Endpoint
// --------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const now = new Date().toISOString();
  res.json({
    status: 'ok',
    timestamp: now,
    serverTime: now,
    liveModel: GEMINI_LIVE_MODEL,
    textModel: GEMINI_TEXT_MODEL,
    hasApiKey: !!GEMINI_API_KEY
  });
});

// --------------------------------------------------------------------------
// 2. Ephemeral Token Generation for Gemini Live API
// --------------------------------------------------------------------------
app.post('/api/gemini/token', async (req, res) => {
  try {
    if (!GEMINI_API_KEY && !mockGenAIClient) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the backend server. Running in fallback mode.',
        fallbackAvailable: true
      });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ error: 'Failed to initialize Gemini client' });
    }

    const { product, language = 'en' } = req.body || {};
    const systemInstructionText = buildSalesAgentSystemInstruction(product, language);

    // Ephemeral token expires in 30 minutes, must be used to initiate connection within 2 minutes
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime,
        newSessionExpireTime: newSessionExpireTime,
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            systemInstruction: {
              parts: [{ text: systemInstructionText }]
            }
          }
        }
      }
    });

    res.json({
      token: tokenResponse.name,
      model: GEMINI_LIVE_MODEL,
      expireTime: expireTime
    });
  } catch (err) {
    console.error('Error generating ephemeral Live token:', err.message || err);
    res.status(500).json({
      error: 'Unable to issue Gemini Live ephemeral token.',
      details: err.message || 'Unknown error',
      fallbackAvailable: true
    });
  }
});

// --------------------------------------------------------------------------
// 3. Gemini Text Chat Endpoint (Single AI Brain for Text & Voice Fallback)
// --------------------------------------------------------------------------
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], product, language = 'en' } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (!GEMINI_API_KEY && !mockGenAIClient) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        fallbackAvailable: true
      });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ error: 'Failed to initialize Gemini client' });
    }

    const systemInstruction = buildSalesAgentSystemInstruction(product, language);

    // Build contents array formatted for @google/genai SDK
    // Keep last 16 turns to avoid context overflow and keep responses focused
    const recentHistory = conversationHistory.slice(-16);
    const contents = [];

    for (const turn of recentHistory) {
      const role = turn.sender === 'user' ? 'user' : 'model';
      contents.push({
        role: role,
        parts: [{ text: turn.text }]
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }]
    });

    // Execute generateContent with a 20-second timeout
    const generatePromise = ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 600
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API request timed out after 20 seconds')), 20000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const replyText = response.text ? response.text.trim() : '';

    if (!replyText) {
      throw new Error('Gemini returned an empty response.');
    }

    res.json({
      reply: replyText,
      model: GEMINI_TEXT_MODEL,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error generating Gemini response:', err.message || err);
    res.status(500).json({
      error: 'AI Provider error occurred while generating response.',
      details: err.message || 'Unknown error',
      fallbackAvailable: true
    });
  }
});

// --------------------------------------------------------------------------
// 4. Server-Side Audio TTS Proxy Endpoint (Reliable Multilingual Fallback)
// Bypasses browser CORS/Origin blocks to stream authentic Telugu & Hindi voice
// Uses phonetic normalization and sentence chunking to prevent URL length limits
// --------------------------------------------------------------------------
export function prepareTextForTTS(text, lang) {
  if (!text) return '';
  let cleaned = text.replace(/[*_#`~]/g, ' ').replace(/\s+/g, ' ').trim();
  if (lang === 'te') {
    cleaned = cleaned
      .replace(/\$([0-9]+)/g, '$1 డాలర్లు')
      .replace(/\bAI\b/gi, 'ఎఐ')
      .replace(/\bCRM\b/gi, 'సిఆర్ఎం')
      .replace(/\bROI\b/gi, 'ఆర్ఓఐ')
      .replace(/\bSOC-?2\b/gi, 'ఎస్ఓసి 2')
      .replace(/\bAWS\b/gi, 'ఎడబ్ల్యుఎస్')
      .replace(/\bGCP\b/gi, 'జిసిపి')
      .replace(/\bOmniFlow\b/gi, 'ఓమ్నిఫ్లో')
      .replace(/\bCloudGuard\b/gi, 'క్లౌడ్‌గార్డ్')
      .replace(/\bDevOpsSprint\b/gi, 'డెవ్ఆప్స్ స్ప్రింట్')
      .replace(/%/g, ' శాతం ')
      .replace(/&/g, ' మరియు ');
  } else if (lang === 'hi') {
    cleaned = cleaned
      .replace(/\$([0-9]+)/g, '$1 डॉलर')
      .replace(/\bAI\b/gi, 'एआई')
      .replace(/\bCRM\b/gi, 'सीआरएम')
      .replace(/\bROI\b/gi, 'आरओआई')
      .replace(/\bSOC-?2\b/gi, 'एसओसी 2')
      .replace(/\bAWS\b/gi, 'एडब्ल्यूएस')
      .replace(/\bGCP\b/gi, 'जीसीपी')
      .replace(/\bOmniFlow\b/gi, 'ओम्निफ्लो')
      .replace(/\bCloudGuard\b/gi, 'क्लाउडगार्ड')
      .replace(/\bDevOpsSprint\b/gi, 'डेवऑप्सस्प्रिंट')
      .replace(/%/g, ' प्रतिशत ')
      .replace(/&/g, ' और ');
  }
  return cleaned;
}

export function splitIntoAudioChunks(text, maxChars = 75) {
  if (!text) return [];
  const rawSentences = text.split(/([।!?.,;\n]+)/);
  const sentences = [];
  for (let i = 0; i < rawSentences.length; i += 2) {
    const part = ((rawSentences[i] || '') + (rawSentences[i + 1] || '')).trim();
    if (part) sentences.push(part);
  }
  const chunks = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      chunks.push(sentence);
    } else {
      const words = sentence.split(/\s+/);
      let curr = '';
      for (const w of words) {
        if ((curr + ' ' + w).trim().length <= maxChars) {
          curr = (curr + ' ' + w).trim();
        } else {
          if (curr) chunks.push(curr);
          curr = w;
        }
      }
      if (curr) chunks.push(curr);
    }
  }
  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}

app.get('/api/tts', async (req, res) => {
  try {
    const rawText = (req.query.text || '').trim();
    const lang = (req.query.lang || 'en').trim().toLowerCase();

    if (!rawText) {
      return res.status(400).json({ error: 'Text query parameter is required.' });
    }

    const targetLang = lang === 'te' ? 'te' : lang === 'hi' ? 'hi' : 'en';
    const preparedText = prepareTextForTTS(rawText, targetLang).slice(0, 600);
    // Split into chunks under 70 chars for Indic languages (prevents 400 Bad Request URL limit)
    const maxChars = targetLang === 'en' ? 120 : 70;
    const chunks = splitIntoAudioChunks(preparedText, maxChars);

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Text query parameter is invalid.' });
    }

    const audioBuffers = [];
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(chunk.trim())}`;
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuffer));
      } else {
        console.warn(`TTS fetch failed for chunk (${response.status}): "${chunk}"`);
      }
    }

    if (audioBuffers.length === 0) {
      return res.status(502).json({ error: 'TTS audio stream unavailable' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(Buffer.concat(audioBuffers));
  } catch (err) {
    console.warn('Error in server TTS proxy:', err.message);
    return res.status(500).json({ error: 'Failed to stream TTS audio.' });
  }
});

// Serve static production bundle from dist/
app.use(express.static(distPath));

// For SPA routing: serve index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Safe 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start listening if not running under a test runner
const isTestEnv = process.env.NODE_ENV === 'test' || 
  process.env.TEST_MODE === 'true' || 
  (process.argv[1] && process.argv[1].includes('test'));

if (!isTestEnv) {
  app.listen(PORT, () => {
    console.log(`🚀 Sankar SalesBot AI Server running on port ${PORT}`);
    console.log(`   Frontend Origin: ${FRONTEND_ORIGIN}`);
    console.log(`   Live Model: ${GEMINI_LIVE_MODEL}`);
    console.log(`   Text Model: ${GEMINI_TEXT_MODEL}`);
    console.log(`   API Key configured: ${GEMINI_API_KEY ? 'YES (Secure server-side)' : 'NO (Transparent fallback mode enabled)'}`);
  });
}

export default app;

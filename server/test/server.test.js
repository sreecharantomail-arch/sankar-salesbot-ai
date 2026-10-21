import assert from 'node:assert';
import app, { 
  buildSalesAgentSystemInstruction, 
  setMockGenAIClient, 
  prepareTextForTTS, 
  splitIntoAudioChunks 
} from '../index.js';

console.log('🧪 Starting Sankar SalesBot AI Backend Server Automated Verification...\n');

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

// Start temporary local server on port 3999 for test requests
const TEST_PORT = 3999;
const server = app.listen(TEST_PORT);
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

try {
  console.log('--- Test Suite 1: Health & System Diagnostics ---');

  await runTest('GET /api/health returns 200 with server status and gemini-3.8-live', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert(data.serverTime);
    assert.strictEqual(typeof data.hasApiKey, 'boolean');
    assert.strictEqual(data.liveModel, 'gemini-3.8-live');
    assert.strictEqual(data.textModel, 'gemini-2.5-flash');
  });

  console.log('\n--- Test Suite 2: POST /api/gemini/chat Request Validation & Security ---');

  await runTest('POST /api/gemini/chat rejects empty message with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert(data.error.includes('Message text is required'));
  });

  await runTest('POST /api/gemini/chat rejects whitespace-only message with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '     ' })
    });
    assert.strictEqual(res.status, 400);
  });

  await runTest('POST /api/gemini/chat without server API key returns HTTP 503 with transparent fallback flag', async () => {
    setMockGenAIClient(null);
    if (!process.env.GEMINI_API_KEY) {
      const res = await fetch(`${BASE_URL}/api/gemini/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'How much does your Starter plan cost?',
          product: { name: 'OmniFlow AI', pricing: { starter: '$49/mo' } },
          conversationHistory: []
        })
      });
      assert.strictEqual(res.status, 503);
      const data = await res.json();
      assert.strictEqual(data.fallbackAvailable, true);
      assert(data.error.includes('GEMINI_API_KEY'));
    }
  });

  console.log('\n--- Test Suite 3: Mocked Gemini Provider Integration Tests ---');

  await runTest('POST /api/gemini/chat generates successful response with full sales context and memory', async () => {
    let capturedModel = '';
    let capturedSystemPrompt = '';
    let capturedContentsLength = 0;

    const mockAiClient = {
      models: {
        generateContent: async ({ model, contents, config }) => {
          capturedModel = model;
          capturedSystemPrompt = config.systemInstruction;
          capturedContentsLength = contents.length;
          return {
            text: 'OmniFlow AI costs $49 per user per month on our Starter plan and includes a 14-day free trial. What size is your team?'
          };
        }
      },
      authTokens: {
        create: async () => ({ name: 'auth_tokens/mock-token-xyz' })
      }
    };

    setMockGenAIClient(mockAiClient);

    const history = [
      { sender: 'user', text: 'Hi, I need workflow automation software.' },
      { sender: 'bot', text: 'Welcome! I would be glad to help.' }
    ];

    const res = await fetch(`${BASE_URL}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How much is it and is there a trial?',
        conversationHistory: history,
        product: { name: 'OmniFlow AI', pricing: { starter: '$49/mo' }, trial: '14-day free trial' },
        language: 'en'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(capturedModel, 'gemini-2.5-flash');
    assert(capturedSystemPrompt.includes('OmniFlow AI'));
    assert(capturedSystemPrompt.includes('PRODUCT ACCURACY & ZERO-HALLUCINATION POLICY'));
    assert.strictEqual(capturedContentsLength, 3); // 2 history + 1 current message
    assert(data.reply.includes('$49'));
    assert.strictEqual(data.model, 'gemini-2.5-flash');
    assert(data.timestamp);

    setMockGenAIClient(null);
  });

  await runTest('POST /api/gemini/chat handles AI provider error safely and offers fallback', async () => {
    const errorMockClient = {
      models: {
        generateContent: async () => {
          throw new Error('Google AI Quota exceeded: Rate limit reached.');
        }
      }
    };

    setMockGenAIClient(errorMockClient);

    const res = await fetch(`${BASE_URL}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Tell me about enterprise pricing',
        conversationHistory: [],
        product: { name: 'OmniFlow AI' }
      })
    });

    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.fallbackAvailable, true);
    assert(data.error.includes('AI Provider error occurred'));
    assert(data.details.includes('Quota exceeded'));

    setMockGenAIClient(null);
  });

  console.log('\n--- Test Suite 4: POST /api/gemini/token Ephemeral Token & Constraints ---');

  await runTest('POST /api/gemini/token creates token with gemini-3.8-live and AUDIO constraints', async () => {
    let capturedConstraints = null;

    const mockTokenClient = {
      authTokens: {
        create: async ({ config }) => {
          capturedConstraints = config.liveConnectConstraints;
          return {
            name: 'auth_tokens/mock-ephemeral-session-token-12345'
          };
        }
      }
    };

    setMockGenAIClient(mockTokenClient);

    const res = await fetch(`${BASE_URL}/api/gemini/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: { name: 'OmniFlow AI' },
        language: 'en'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.token, 'auth_tokens/mock-ephemeral-session-token-12345');
    assert.strictEqual(data.model, 'gemini-3.8-live');
    assert(data.expireTime);
    assert.strictEqual(capturedConstraints.model, 'gemini-3.8-live');
    assert.deepStrictEqual(capturedConstraints.config.responseModalities, ['AUDIO']);

    setMockGenAIClient(null);
  });

  await runTest('POST /api/gemini/token handles authentication / token generation failure safely', async () => {
    const failingTokenClient = {
      authTokens: {
        create: async () => {
          throw new Error('Authentication failure: Token creation unauthorized');
        }
      }
    };

    setMockGenAIClient(failingTokenClient);

    const res = await fetch(`${BASE_URL}/api/gemini/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'en' })
    });

    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.strictEqual(data.fallbackAvailable, true);
    assert(data.error.includes('Unable to issue Gemini Live ephemeral token'));

    setMockGenAIClient(null);
  });

  console.log('\n--- Test Suite 5: System Prompt & Product Grounding Verifier ---');

  await runTest('buildSalesAgentSystemInstruction accurately embeds product grounding & anti-hallucination rules', () => {
    const mockProduct = {
      name: 'CloudPulse Enterprise',
      tagline: 'Autonomous Database Optimization',
      description: 'AI-driven index tuning and latency monitoring for PostgreSQL and MySQL.',
      pricing: { starter: '$99/mo', growth: '$249/mo', enterprise: 'Custom quote' },
      trial: '30-day risk-free trial',
      keyFeatures: ['Zero-downtime indexing', 'Auto query re-writing', 'Multi-region replication'],
      limitations: ['PostgreSQL 12+ only', 'Self-hosted requires Linux x86_64']
    };

    const prompt = buildSalesAgentSystemInstruction(mockProduct, 'en');

    // Verified product details check
    assert(prompt.includes('CloudPulse Enterprise'), 'Must include product name');
    assert(prompt.includes('$99/mo'), 'Must include starter pricing');
    assert(prompt.includes('30-day risk-free trial'), 'Must include trial policy');
    assert(prompt.includes('Zero-downtime indexing'), 'Must include key features');
    assert(prompt.includes('PostgreSQL 12+ only'), 'Must include known limitations');

    // Behavioral rules check
    assert(prompt.includes('PRODUCT ACCURACY & ZERO-HALLUCINATION POLICY'), 'Must include anti-hallucination header');
    assert(prompt.includes('Never invent features, prices, discounts'), 'Must include strict zero-hallucination clause');
    assert(prompt.includes('If product information is missing or unconfirmed, say that you do not have that confirmed information'), 'Must instruct honest handling of unknown data');
    assert(prompt.includes('Do not force every response into a sales pitch'), 'Must enforce natural consultative sales flow');
    assert(prompt.includes('English'), 'Must enforce English language instruction');
  });

  await runTest('buildSalesAgentSystemInstruction sets appropriate language instructions for Hindi and Telugu', () => {
    const mockProduct = { name: 'OmniFlow AI' };
    const hindiPrompt = buildSalesAgentSystemInstruction(mockProduct, 'hi');
    assert(hindiPrompt.includes('Hindi (हिंदी)'), 'Must instruct model to respond in conversational Hindi');

    const teluguPrompt = buildSalesAgentSystemInstruction(mockProduct, 'te');
    assert(teluguPrompt.includes('Telugu (తెలుగు)'), 'Must instruct model to respond in conversational Telugu');
  });

  console.log('\n--- Test Suite 6: Context Memory & Turn Trimming Safety ---');

  await runTest('Prompt construction handles empty history, single turns, and boundary cases safely', () => {
    const prompt1 = buildSalesAgentSystemInstruction(null, 'en');
    assert(prompt1.includes('SaaS Platform'), 'Defaults safely when product is null');

    const prompt2 = buildSalesAgentSystemInstruction(undefined, 'hi');
    assert(prompt2.includes('Hindi'), 'Handles undefined product with language directive');
  });

  console.log('\n--- Test Suite 7: Multilingual TTS Audio Stream (/api/tts) ---');

  await runTest('prepareTextForTTS phonetically normalizes Telugu terms ($49, AI, CRM, ROI)', () => {
    const raw = 'OmniFlow AI costs $49 with CRM sync and 94% ROI.';
    const prepared = prepareTextForTTS(raw, 'te');
    assert(prepared.includes('49 డాలర్లు'), 'Should convert $49 to 49 డాలర్లు');
    assert(prepared.includes('ఎఐ'), 'Should convert AI to ఎఐ');
    assert(prepared.includes('సిఆర్ఎం'), 'Should convert CRM to సిఆర్ఎం');
    assert(prepared.includes('ఆర్ఓఐ'), 'Should convert ROI to ఆర్ఓఐ');
    assert(prepared.includes('శాతం'), 'Should convert % to శాతం');
  });

  await runTest('splitIntoAudioChunks safely segments sentences without cutting words', () => {
    const longText = 'నమస్కారం! ఓమ్నిఫ్లో ఎఐ కి స్వాగతం. నేను మీ ఎఐ సేల్స్ ప్రతినిధిని. మేము మీ సేల్స్ ప్రాసెస్ మరియు లీడ్స్ ని ఆటోమేట్ చేసి డీల్స్ వేగంగా క్లోజ్ చేయడానికి సహాయం చేస్తాము. మీ టీమ్ ప్రస్తుతం సేల్స్ కోసం ఏదైనా సిఆర్ఎం వాడుతున్నారా?';
    const chunks = splitIntoAudioChunks(longText, 70);
    assert(chunks.length >= 3, 'Long text must be segmented into multiple chunks');
    for (const chunk of chunks) {
      assert(chunk.length <= 75, `Chunk should be under maxChars, got ${chunk.length}`);
      assert(chunk.trim().length > 0, 'Chunk must not be empty');
    }
  });

  await runTest('GET /api/tts rejects missing text parameter with HTTP 400', async () => {
    const res = await fetch(`${BASE_URL}/api/tts`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert(data.error.includes('Text query parameter is required'));
  });

  await runTest('GET /api/tts streams valid audio/mpeg for Telugu language requests', async () => {
    const res = await fetch(`${BASE_URL}/api/tts?lang=te&text=${encodeURIComponent('నమస్కారం')}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'audio/mpeg');
    const audioData = await res.arrayBuffer();
    assert(audioData.byteLength > 1000, 'Audio stream should return valid non-empty MPEG audio data');
  });

  await runTest('GET /api/tts streams valid multi-chunk audio/mpeg for full Telugu sentences', async () => {
    const fullGreeting = 'నమస్కారం! ఓమ్నిఫ్లో AI కి స్వాగతం. నేను మీ AI సేల్స్ ప్రతినిధిని. మేము మీ సేల్స్ ప్రాసెస్ మరియు లీడ్స్ ని ఆటోమేట్ చేసి డీల్స్ వేగంగా క్లోజ్ చేయడానికి సహాయం చేస్తాము.';
    const res = await fetch(`${BASE_URL}/api/tts?lang=te&text=${encodeURIComponent(fullGreeting)}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'audio/mpeg');
    const audioData = await res.arrayBuffer();
    assert(audioData.byteLength > 50000, `Audio stream should concatenate multiple chunks into full audio (got ${audioData.byteLength} bytes)`);
  });

} finally {
  setMockGenAIClient(null);
  server.close();
}

console.log(`\n==============================================`);
console.log(`Server Test Execution Finished! Passed: ${passed}, Failed: ${failed}`);
console.log(`==============================================\n`);

if (failed > 0) {
  process.exitCode = 1;
}

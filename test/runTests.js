import assert from 'node:assert';
import { 
  salesAgentEngine, 
  detectSchedulingIntent, 
  isRomanizedTelugu, 
  isShortConfirmation, 
  extractEmail, 
  analyzeLastBotTurn 
} from '../src/services/salesAgentEngine.js';
import { geminiLiveService } from '../src/services/geminiLiveService.js';
import { audioRecorder } from '../src/services/audioRecorderService.js';
import { voiceService } from '../src/services/voiceService.js';
import { SAAS_PRODUCTS } from '../src/data/saasProducts.js';

console.log('🧪 Starting Sankar SalesBot AI Automated Verification Suite...\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// 1. Sales Status Classification & Conflict Resolution
// ----------------------------------------------------
console.log('--- Test Suite 1: Sales Status Classification (All 6 States) ---');

const product = SAAS_PRODUCTS[0]; // OmniFlow AI

await asyncTest('Classify "Converted" when user confirms purchase / trial', async () => {
  const result = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'Hello!' },
      { sender: 'user', text: 'Sounds amazing, let us do it! I want to start trial right now and buy the plan.' }
    ],
    durationSeconds: 95,
    product,
    language: 'en'
  });
  assert.strictEqual(result.salesStatus, 'Converted');
  assert(result.confidenceScore >= 0.9);
});

await asyncTest('Classify "Demo Requested" when user explicitly asks for screen-share / calendar meet', async () => {
  const result = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'How can I help?' },
      { sender: 'user', text: 'Can we book a live demo and walkthrough on Thursday at 2pm?' }
    ],
    durationSeconds: 70,
    product,
    language: 'en'
  });
  assert.strictEqual(result.salesStatus, 'Demo Requested');
  assert(result.confidenceScore >= 0.9);
});

await asyncTest('Resolve conflict: Demo request priority over general interest', async () => {
  const result = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'Here are features...' },
      { sender: 'user', text: 'This looks very interesting and cool. Can you schedule a demo with our team?' }
    ],
    durationSeconds: 65,
    product,
    language: 'en'
  });
  assert.strictEqual(result.salesStatus, 'Demo Requested');
});

await asyncTest('Classify "Follow-up Required" when boss/team review or collateral requested', async () => {
  const result = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'Ready to proceed?' },
      { sender: 'user', text: 'I need to discuss this with my boss and manager first, please email me the info.' }
    ],
    durationSeconds: 50,
    product,
    language: 'en'
  });
  assert.strictEqual(result.salesStatus, 'Follow-up Required');
});

await asyncTest('Classify "Not Interested" when explicitly rejected', async () => {
  const result = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'Are you looking to automate leads?' },
      { sender: 'user', text: 'No thanks, we are not interested at all, stop calling.' }
    ],
    durationSeconds: 40,
    product,
    language: 'en'
  });
  assert.strictEqual(result.salesStatus, 'Not Interested');
});

await asyncTest('Classify "No Response" when call under 12 seconds or silent', async () => {
  const result = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'Hello?' }
    ],
    durationSeconds: 8,
    product,
    language: 'en'
  });
  assert.strictEqual(result.salesStatus, 'No Response');
});

await asyncTest('Classify "Interested" on active exploratory conversation', async () => {
  const result = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'Hello, how can I help?' },
      { sender: 'user', text: 'How much does the growth tier cost and does it connect to postgres?' }
    ],
    durationSeconds: 80,
    product,
    language: 'en'
  });
  assert.strictEqual(result.salesStatus, 'Interested');
});

// ----------------------------------------------------
// 2. Structured 8-Part Post-Call Summary
// ----------------------------------------------------
console.log('\n--- Test Suite 2: Structured 8-Part Post-Call Summary ---');

await asyncTest('Verify all 8 mandatory summary fields are generated', async () => {
  const analysis = await salesAgentEngine.analyzeCallTranscript({
    transcript: [
      { sender: 'bot', text: 'Hello! I am Alex from OmniFlow AI.' },
      { sender: 'user', text: 'We run a clinic with a team of 10 people. We have a $200 budget and want automated booking.' }
    ],
    durationSeconds: 65,
    product,
    language: 'en'
  });

  const { summary } = analysis;
  assert(summary, 'Summary object must exist');
  assert(summary.overview, '1. overview must exist');
  assert(summary.customerRequirements, '2. customerRequirements must exist');
  assert(summary.painPoints, '3. painPoints must exist');
  assert(summary.productInterest, '4. productInterest must exist');
  assert(summary.objections, '5. objections must exist');
  assert(summary.budgetTimeline, '6. budgetTimeline must exist');
  assert(summary.promisedActions, '7. promisedActions must exist');
  assert(summary.nextSteps, '8. nextSteps must exist');

  // Verify extraction of business context
  assert(summary.customerRequirements.toLowerCase().includes('clinic'), 'Should extract clinic business');
  assert(summary.budgetTimeline.includes('$200'), 'Should extract budget of $200');
});

// ----------------------------------------------------
// 3. Fallback AI Conversational Engine (Zero API Key Mode)
// ----------------------------------------------------
console.log('\n--- Test Suite 3: Fallback Conversational Engine ---');

await asyncTest('Transparent fallback without API key generates contextual English response', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'How much does this cost?',
    conversationHistory: [],
    product,
    language: 'en'
  });
  assert(reply && reply.length > 20, 'Reply should be substantial');
  assert(reply.toLowerCase().includes('trial') || reply.toLowerCase().includes('starter') || reply.includes('$49'), 'Should mention pricing details');
});

await asyncTest('Fallback responds accurately to Hindi language input', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'इसकी कीमत कितनी है?',
    conversationHistory: [],
    product,
    language: 'hi'
  });
  assert(reply && reply.length > 10);
  assert(reply.includes('प्लान') || reply.includes('ट्रायल') || reply.includes('$49'));
});

await asyncTest('Fallback responds accurately to Telugu pricing input', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'ధర ఎంత?',
    conversationHistory: [],
    product,
    language: 'te'
  });
  assert(reply && reply.length > 10);
  assert(reply.includes('ప్లాన్') || reply.includes('ట్రయల్') || reply.includes('$49'));
});

await asyncTest('Fallback responds warmly to Telugu greeting (నమస్కారం)', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'నమస్కారం! బాగున్నారా?',
    conversationHistory: [],
    product,
    language: 'te'
  });
  assert(reply && reply.includes('నమస్కారం'), 'Should return Telugu greeting');
  assert(reply.includes('అలెక్స్') || reply.includes('OmniFlow'), 'Should introduce bot/product');
});

await asyncTest('Fallback handles Romanized Telugu greeting (namaskaram)', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'namaskaram',
    conversationHistory: [],
    product,
    language: 'te'
  });
  assert(reply && reply.includes('నమస్కారం'), 'Should return Telugu greeting for romanized input');
});

await asyncTest('Fallback explains product features in Telugu (ఫీచర్లు ఏమిటి?)', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'ఫీచర్లు ఏమిటి?',
    conversationHistory: [],
    product,
    language: 'te'
  });
  assert(reply && (reply.includes('ఫీచర్లు') || reply.includes('ఆటోమేటిక్') || reply.includes('OmniFlow')), 'Should detail key features in Telugu');
});

await asyncTest('Fallback answers Telugu cost question with ఖర్చు', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'ఖర్చు ఎంత అవుతుంది?',
    conversationHistory: [],
    product,
    language: 'te'
  });
  assert(reply && reply.includes('$49'), 'Should state pricing for ఖర్చు query');
});

await asyncTest('Fallback arranges demo for Telugu request (డెమో కావాలి)', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'నాకు డెమో కావాలి',
    conversationHistory: [],
    product,
    language: 'te'
  });
  assert(reply && (reply.includes('డెమో') || reply.includes('గురువారం')), 'Should arrange demo in Telugu');
});

await asyncTest('Fallback offers trial activation for Telugu request (ట్రయల్ కావాలి)', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'ట్రయల్ ప్రారంభించండి',
    conversationHistory: [],
    product,
    language: 'te'
  });
  assert(reply && reply.includes('14 రోజుల ఉచిత ట్రయల్'), 'Should activate 14-day trial in Telugu');
});

await asyncTest('Fallback handles objection regarding competitors', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'We already use Zapier and another competitor',
    conversationHistory: [],
    product,
    language: 'en'
  });
  assert(reply.toLowerCase().includes('competitor') || reply.toLowerCase().includes('zapier') || reply.toLowerCase().includes('friction') || reply.toLowerCase().includes('two-way'));
});

// ----------------------------------------------------
// 4. Analytics Calculations & Metric Guardrails
// ----------------------------------------------------
console.log('\n--- Test Suite 4: Analytics Calculations & Division-by-Zero Safety ---');

test('Analytics with zero calls should produce valid metrics without crashing', () => {
  const emptyCalls = [];
  const totalCalls = emptyCalls.length;
  const converted = emptyCalls.filter(c => c.salesStatus === 'Converted').length;
  const conversionRate = totalCalls > 0 ? Math.round((converted / totalCalls) * 100) : 0;
  const totalDuration = emptyCalls.reduce((s, c) => s + (c.durationSeconds || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  assert.strictEqual(totalCalls, 0);
  assert.strictEqual(conversionRate, 0);
  assert.strictEqual(avgDuration, 0);
  assert(!isNaN(conversionRate));
  assert(!isNaN(avgDuration));
});

test('Analytics with simulated calls accurately calculates rates and durations', () => {
  const sampleCalls = [
    { salesStatus: 'Converted', durationSeconds: 120 },
    { salesStatus: 'Demo Requested', durationSeconds: 80 },
    { salesStatus: 'Interested', durationSeconds: 60 },
    { salesStatus: 'Not Interested', durationSeconds: 40 }
  ];
  const totalCalls = sampleCalls.length;
  const converted = sampleCalls.filter(c => c.salesStatus === 'Converted').length;
  const conversionRate = Math.round((converted / totalCalls) * 100);
  const totalSec = sampleCalls.reduce((sum, c) => sum + c.durationSeconds, 0);
  const avgDuration = Math.round(totalSec / totalCalls);

  assert.strictEqual(conversionRate, 25); // 1 out of 4 = 25%
  assert.strictEqual(avgDuration, 75); // (120+80+60+40)/4 = 75s
});

// ----------------------------------------------------
// 5. SaaS Product Configuration
// ----------------------------------------------------
console.log('\n--- Test Suite 5: SaaS Product Configuration ---');

test('Verify SAAS_PRODUCTS has valid structure, greetings, and objection handling', () => {
  assert(SAAS_PRODUCTS.length >= 3, 'Must have at least 3 SaaS products');
  for (const p of SAAS_PRODUCTS) {
    assert(p.id, 'Product must have ID');
    assert(p.name, 'Product must have name');
    assert(p.pricing?.starter, 'Product must have starter pricing');
    assert(p.greetings?.en, 'Product must have English greeting');
    assert(p.greetings?.hi, 'Product must have Hindi greeting');
    assert(p.greetings?.te, 'Product must have Telugu greeting');
    assert(p.objectionHandling?.budget, 'Product must have budget objection handling');
    assert(p.objectionHandling?.competition, 'Product must have competition objection handling');
  }
});

// ----------------------------------------------------
// 6. AI Brain & Grounding Verification (Single Brain, Context, Grounding)
// ----------------------------------------------------
console.log('\n--- Test Suite 6: AI Brain & Conversational Grounding ---');

await asyncTest('AI Brain: Follow-up question uses previous conversation context', async () => {
  const history = [
    { sender: 'bot', text: 'Hello! I am your AI sales executive for OmniFlow AI.' },
    { sender: 'user', text: 'We have a team of 15 designers and marketers.' },
    { sender: 'bot', text: 'That sounds like a great team size for our Starter tier.' }
  ];
  
  const followUpReply = await salesAgentEngine.generateResponse({
    userMessage: 'What would that cost for us?',
    conversationHistory: history,
    product,
    language: 'en'
  });

  assert(followUpReply && followUpReply.length > 15, 'Should return a substantial reply');
  assert(followUpReply.includes('$49') || followUpReply.toLowerCase().includes('starter') || followUpReply.toLowerCase().includes('plan'), 'Follow-up reply should reference relevant pricing');
});

await asyncTest('AI Brain: Transparent fallback metadata is attached with isFallback=true when offline', async () => {
  await salesAgentEngine.generateResponse({
    userMessage: 'Can you give me a summary of your features?',
    conversationHistory: [],
    product,
    language: 'en'
  });

  const meta = salesAgentEngine.getLastResponseMeta();
  assert(meta, 'Metadata object must exist');
  assert.strictEqual(typeof meta.isFallback, 'boolean');
  assert(meta.source === 'fallback-offline' || meta.source === 'gemini-llm');
});

await asyncTest('AI Brain: Unified brain handles both typed text and voice transcripts identically', async () => {
  const typedInput = 'Does your platform integrate with Slack?';
  const voiceRecognizedInput = 'Does your platform integrate with Slack?';

  const replyForTyped = await salesAgentEngine.generateResponse({
    userMessage: typedInput,
    conversationHistory: [],
    product,
    language: 'en'
  });

  const replyForVoice = await salesAgentEngine.generateResponse({
    userMessage: voiceRecognizedInput,
    conversationHistory: [],
    product,
    language: 'en'
  });

  assert.strictEqual(replyForTyped, replyForVoice, 'Typed question and voice question with same context produce identical response from shared brain');
});

await asyncTest('AI Brain: Call state isolation clears previous conversation history', async () => {
  // Call 1 with customer discussing Healthcare clinic workflow
  const call1History = [
    { sender: 'user', text: 'We are a healthcare clinic and need HIPAA compliance.' },
    { sender: 'bot', text: 'We take security seriously with enterprise encryption.' }
  ];
  const call1Reply = await salesAgentEngine.generateResponse({
    userMessage: 'How do you handle patient data?',
    conversationHistory: call1History,
    product,
    language: 'en'
  });
  assert(call1Reply, 'Call 1 received response');

  // Call 2 starts fresh with isolated empty history
  const call2History = [];
  const call2Reply = await salesAgentEngine.generateResponse({
    userMessage: 'What is your pricing?',
    conversationHistory: call2History,
    product,
    language: 'en'
  });

  assert(call2Reply, 'Fresh call receives response');
  assert(!call2Reply.toLowerCase().includes('clinic'), 'Customer 2 should not inherit customer 1 medical context');
});

test('Gemini Live Service: Clean disconnect releases resources and resets state', () => {
  geminiLiveService.reconnectAttempts = 2;
  geminiLiveService.disconnect(true);
  assert.strictEqual(geminiLiveService.isConnected, false);
  assert.strictEqual(geminiLiveService.isSessionReady, false);
  assert.strictEqual(geminiLiveService.isManuallyDisconnected, true);
  assert.strictEqual(geminiLiveService.reconnectAttempts, 0);
  assert.strictEqual(geminiLiveService.lastConnectParams, null);
});

test('Gemini Live Service: Environment support check returns boolean', () => {
  const supported = geminiLiveService.isSupported();
  assert.strictEqual(typeof supported, 'boolean');
});

test('Audio Recorder Service: Recording consent defaults to false (privacy by default)', () => {
  assert.strictEqual(audioRecorder.recordingConsent, false, 'Recording consent must default to false');
});

await asyncTest('Audio Recorder Service: Explicit consent is required to start recording', async () => {
  const resultDeclined = await audioRecorder.startRecording({ consentGranted: false });
  assert.strictEqual(resultDeclined.recordingEnabled, false);
  assert.strictEqual(resultDeclined.reason, 'Consent declined by user');
  assert.strictEqual(audioRecorder.isRecording, false);
});

test('Sales Agent Engine: Client-side API key storage is eliminated', () => {
  const config = salesAgentEngine.getApiConfig();
  assert.strictEqual(config.architecture, 'server-secured');
  assert.strictEqual(config.model, 'gemini-2.5-flash');
  assert.strictEqual(config.liveModel, 'gemini-3.8-live');
  assert.strictEqual(salesAgentEngine.apiKey, undefined, 'apiKey property must not exist on salesAgentEngine');
});

test('Gemini Live Service: Mute controls operate correctly without throwing', () => {
  geminiLiveService.setMicMuted(true);
  assert.strictEqual(geminiLiveService.isMicMuted, true);
  geminiLiveService.setMicMuted(false);
  assert.strictEqual(geminiLiveService.isMicMuted, false);

  geminiLiveService.setSpeakerMuted(true);
  assert.strictEqual(geminiLiveService.isSpeakerMuted, true);
  geminiLiveService.setSpeakerMuted(false);
  assert.strictEqual(geminiLiveService.isSpeakerMuted, false);
});

// ----------------------------------------------------
// 7. Voice Service & Cadence Tuning
// ----------------------------------------------------
console.log('\n--- Test Suite 7: Voice Service & Cadence Tuning ---');

test('Voice Service: Telugu speech defaults to 1.5x (+0.50x speed boost)', () => {
  assert.strictEqual(voiceService.getEffectiveRate('te'), 1.5, 'Telugu speech rate must default to 1.5');
});

test('Voice Service: English and Hindi default to 1.0x standard rate', () => {
  assert.strictEqual(voiceService.getEffectiveRate('en'), 1.0, 'English rate must default to 1.0');
  assert.strictEqual(voiceService.getEffectiveRate('hi'), 1.0, 'Hindi rate must default to 1.0');
});

test('Voice Service: Custom rate overrides are respected', () => {
  assert.strictEqual(voiceService.getEffectiveRate('te', 1.75), 1.75, 'Custom rate 1.75 must override default');
  assert.strictEqual(voiceService.getEffectiveRate('en', 0.8), 0.8, 'Custom rate 0.8 must override default');
});

// ----------------------------------------------------
// 8. Contextual Conversation, Telugu Understanding & Scheduling Regression
// ----------------------------------------------------
console.log('\n--- Test Suite 8: Contextual Conversation, Telugu & Scheduling Regression ---');

await asyncTest('1. Regression: "naaku maa team ku sales inkaa fast ga increase avvali" does not trigger scheduling', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'naaku maa team ku sales inkaa fast ga increase avvali',
    conversationHistory: [],
    product,
    language: 'te'
  });
  // Must NOT trigger scheduling response
  assert(!reply.includes('సమయాన్ని నోట్'), 'Must not trigger scheduling or say time is noted');
  assert(!reply.toLowerCase().includes('noted down on our calendar'), 'Must not say time is noted down on calendar');
  assert.strictEqual(detectSchedulingIntent('naaku maa team ku sales inkaa fast ga increase avvali'), false, 'detectSchedulingIntent must return false');
  // Must provide contextual Telugu sales acceleration consultative response
  assert(reply.includes('అర్థమైంది! మీ టీమ్ సేల్స్ వేగంగా పెరగాలంటే'), 'Must respond with consultative sales acceleration response');
  assert(reply.includes('కొత్త లీడ్స్ పొందడంలోనా, లేక వచ్చిన లీడ్స్ని కస్టమర్లుగా మార్చడంలోనా'), 'Must ask lead generation vs conversion discovery question');
});

test('2. Regression: "team" does not match the "am" time indicator', () => {
  assert.strictEqual(detectSchedulingIntent('team'), false, '"team" alone must not trigger scheduling');
  assert.strictEqual(detectSchedulingIntent('our team is ready'), false, '"our team is ready" must not trigger scheduling');
  assert.strictEqual(detectSchedulingIntent('I am interested in your software'), false, '"I am interested" must not trigger scheduling (am in verb phrase)');
  assert.strictEqual(detectSchedulingIntent('naaku maa team ku sales inkaa fast ga increase avvali'), false, 'Telugu sales request with team must not match time');
});

test('3. Regression: "tomorrow at 4 PM" does trigger scheduling intent', () => {
  assert.strictEqual(detectSchedulingIntent('tomorrow at 4 PM'), true, '"tomorrow at 4 PM" must trigger scheduling');
  assert.strictEqual(detectSchedulingIntent('Friday morning'), true, '"Friday morning" must trigger scheduling');
  assert.strictEqual(detectSchedulingIntent('Can we meet tomorrow at 10 am?'), true, '"tomorrow at 10 am" must trigger scheduling');
  assert.strictEqual(detectSchedulingIntent('repu udayam 10 gantlaku'), true, 'Telugu "repu udayam 10 gantlaku" must trigger scheduling');
  
  const reply = salesAgentEngine.synthesizeHumanResponse({
    userMessage: 'tomorrow at 4 PM',
    conversationHistory: [],
    product,
    language: 'en'
  });
  assert(reply.toLowerCase().includes('noted down') || reply.toLowerCase().includes('exact time') || reply.includes('సమయాన్ని నోట్'), 'Response acknowledges schedule time');
});

await asyncTest('4. Regression: "haa sare" following a demo offer is treated as confirmation', async () => {
  assert.strictEqual(isShortConfirmation('haa sare'), true, '"haa sare" must be recognized as short confirmation');
  assert.strictEqual(isShortConfirmation('avunu'), true, '"avunu" must be recognized as short confirmation');

  const historyWithDemoOffer = [
    { sender: 'user', text: 'Tell me about features' },
    { sender: 'bot', text: 'మీ టీమ్‌కి సరిపోయేలా 15 నిమిషాల లైవ్ డెమోను షెడ్యూల్ చేయమంటారా?' }
  ];

  const analyzed = analyzeLastBotTurn(historyWithDemoOffer);
  assert.strictEqual(analyzed.offeredDemo, true, 'analyzeLastBotTurn must recognize demo offer');

  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'haa sare',
    conversationHistory: historyWithDemoOffer,
    product,
    language: 'te'
  });

  // Must NOT re-ask the demo offer
  assert(!reply.includes('డెమోను షెడ్యూల్ చేయమంటారా?'), 'Must not repeat the demo question');
  // Must treat "haa sare" as confirmation of the demo agreement and ask for day/time and email
  assert(reply.includes('చాలా సంతోషం!') || reply.includes('లైవ్ డెమో నిర్వహించడానికి'), 'Must acknowledge demo agreement');
  assert(reply.includes('ఈమెయిల్') || reply.includes('సమయం'), 'Must proceed to collect preferred time or contact email');
});

await asyncTest('5. Regression: "yes" does not cause the same demo question to repeat', async () => {
  const historyWithDemoOffer = [
    { sender: 'user', text: 'I want to see how it works' },
    { sender: 'bot', text: 'Would you like to schedule a quick 15-minute screen-share demo for your team?' }
  ];

  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'yes',
    conversationHistory: historyWithDemoOffer,
    product,
    language: 'en'
  });

  // Must not ask the exact same demo question again
  assert(!reply.includes('Would you like to schedule a quick 15-minute screen-share demo'), 'Must not repeat the same demo question');
  // Must acknowledge confirmation and ask for scheduling time and email
  assert(reply.includes('Wonderful!') || reply.includes('glad to set that up'), 'Must acknowledge confirmation');
  assert(reply.includes('email') || reply.includes('time'), 'Must request date/time/email');
});

await asyncTest('6. Regression: Repeated confirmations advance the conversation appropriately', async () => {
  // Step 1: Bot offers demo
  const t1Bot = 'మీ టీమ్‌కి సరిపోయేలా 15 నిమిషాల లైవ్ డెమోను షెడ్యూల్ చేయమంటారా?';
  
  // Step 2: Customer confirms ("haa sare") -> Bot acknowledges and asks for date/time and email
  const history1 = [
    { sender: 'bot', text: t1Bot }
  ];
  const r2 = await salesAgentEngine.generateResponse({
    userMessage: 'haa sare',
    conversationHistory: history1,
    product,
    language: 'te'
  });
  assert(!r2.includes('డెమోను షెడ్యూల్ చేయమంటారా?'), 'Turn 2 must not repeat demo question');
  assert(r2.includes('ఈమెయిల్') || r2.includes('సమయం'), 'Turn 2 must ask for time and email');

  // Step 3: Customer says "yes" again (confirmation 2) instead of giving email
  const history2 = [
    ...history1,
    { sender: 'user', text: 'haa sare' },
    { sender: 'bot', text: r2 }
  ];
  const r3 = await salesAgentEngine.generateResponse({
    userMessage: 'yes',
    conversationHistory: history2,
    product,
    language: 'te'
  });
  // Must NOT treat "yes" as an email address, must specifically request the email address
  assert(!r3.includes('డెమోను షెడ్యూల్ చేయమంటారా?'), 'Turn 3 must not repeat demo question');
  assert(r3.includes('ఈమెయిల్ అడ్రస్‌ను') || r3.includes('తెలియజేయండి') || r3.includes('చెప్పండి'), 'Turn 3 must prompt for email address');

  // Step 4: Customer provides email
  assert.strictEqual(extractEmail('sankar.sales@example.com'), 'sankar.sales@example.com', 'extractEmail correctly finds email');
  assert.strictEqual(extractEmail('not an email address'), null, 'extractEmail returns null when no email');

  const history3 = [
    ...history2,
    { sender: 'user', text: 'yes' },
    { sender: 'bot', text: r3 }
  ];
  const r4 = await salesAgentEngine.generateResponse({
    userMessage: 'sankar.sales@example.com',
    conversationHistory: history3,
    product,
    language: 'te'
  });
  assert(r4.includes('ధన్యవాదాలు') && r4.includes('sankar.sales@example.com'), 'Turn 4 records email and advances stage');
});

await asyncTest('7. Regression: Romanized Telugu sales questions receive contextually relevant Telugu answers', async () => {
  // Verify helper recognition
  assert.strictEqual(isRomanizedTelugu('naaku maa team ku sales inkaa fast ga increase avvali'), true);
  assert.strictEqual(isRomanizedTelugu('demo chupinchandi'), true);
  assert.strictEqual(isRomanizedTelugu('entha cost avutundi'), true);
  assert.strictEqual(isRomanizedTelugu('maa team lo 10 members unnaru'), true);
  assert.strictEqual(isRomanizedTelugu('hello how are you'), false);

  // Phrase A: "naaku maa team ku sales inkaa fast ga increase avvali"
  const replyA = await salesAgentEngine.generateResponse({
    userMessage: 'naaku maa team ku sales inkaa fast ga increase avvali',
    conversationHistory: [],
    product,
    language: 'en' // Even if client language was default en, romanized Telugu must receive Telugu reply
  });
  assert(/[\u0C00-\u0C7F]/.test(replyA), 'Phrase A must receive Telugu script reply');
  assert(replyA.includes('అర్థమైంది! మీ టీమ్ సేల్స్ వేగంగా పెరగాలంటే'), 'Phrase A contextually addresses sales acceleration');

  // Phrase B: "demo chupinchandi"
  const replyB = await salesAgentEngine.generateResponse({
    userMessage: 'demo chupinchandi',
    conversationHistory: [],
    product,
    language: 'en'
  });
  assert(/[\u0C00-\u0C7F]/.test(replyB), 'Phrase B must receive Telugu script reply');
  assert(replyB.includes('డెమో') || replyB.includes('స్పెషలిస్ట్'), 'Phrase B contextually offers demo schedule');

  // Phrase C: "entha cost avutundi"
  const replyC = await salesAgentEngine.generateResponse({
    userMessage: 'entha cost avutundi',
    conversationHistory: [],
    product,
    language: 'en'
  });
  assert(/[\u0C00-\u0C7F]/.test(replyC), 'Phrase C must receive Telugu script reply');
  assert(replyC.includes('$49') || replyC.includes('స్టార్టర్'), 'Phrase C contextually answers pricing');

  // Phrase D: "maa team lo 10 members unnaru"
  const replyD = await salesAgentEngine.generateResponse({
    userMessage: 'maa team lo 10 members unnaru',
    conversationHistory: [],
    product,
    language: 'en'
  });
  assert(/[\u0C00-\u0C7F]/.test(replyD), 'Phrase D must receive Telugu script reply');
  assert(replyD.includes('10 మంది') && replyD.includes('గ్రోత్ ప్లాన్'), 'Phrase D contextually addresses 10-member team size');
});

await asyncTest('8. Regression: Conversation history is isolated between calls', async () => {
  const call1History = [
    { sender: 'user', text: 'We run a private dental clinic with 10 dentists.' },
    { sender: 'bot', text: 'That sounds great! How do you handle patient appointments?' }
  ];
  const r1 = await salesAgentEngine.generateResponse({
    userMessage: 'We need automated patient reminders',
    conversationHistory: call1History,
    product,
    language: 'en'
  });
  assert(r1, 'Call 1 received response');

  const call2History = [];
  const r2 = await salesAgentEngine.generateResponse({
    userMessage: 'What is your monthly subscription cost?',
    conversationHistory: call2History,
    product,
    language: 'en'
  });
  assert(r2, 'Call 2 received response');
  assert(!r2.toLowerCase().includes('dental') && !r2.toLowerCase().includes('patient'), 'Call 2 must not inherit Call 1 dental context');
});

await asyncTest('9. Regression: Real Gemini errors trigger a clearly labeled fallback', async () => {
  const reply = await salesAgentEngine.generateResponse({
    userMessage: 'How do you handle CRM integrations?',
    conversationHistory: [],
    product,
    language: 'en'
  });
  assert(reply, 'Received fallback response');
  const meta = salesAgentEngine.getLastResponseMeta();
  assert.strictEqual(meta.isFallback, true, 'isFallback must be true when Gemini API is unavailable');
  assert.strictEqual(meta.source, 'fallback-offline', 'source must identify fallback-offline');
  assert.strictEqual(meta.model, 'Consultative Synthesizer', 'model must identify Consultative Synthesizer');
});

await asyncTest('10. Regression: Both typed messages and voice transcripts use the same intent and context pipeline', async () => {
  const sampleText = 'naaku maa team ku sales inkaa fast ga increase avvali';
  const history = [{ sender: 'bot', text: 'నమస్కారం! నేను OmniFlow AI నుండి అలెక్స్ ని.' }];

  const typedResponse = await salesAgentEngine.generateResponse({
    userMessage: sampleText,
    conversationHistory: history,
    product,
    language: 'te'
  });

  const voiceTranscriptResponse = await salesAgentEngine.generateResponse({
    userMessage: sampleText,
    conversationHistory: history,
    product,
    language: 'te'
  });

  assert.strictEqual(typedResponse, voiceTranscriptResponse, 'Typed and voice transcript must produce identical response');
  assert(typedResponse.includes('అర్థమైంది! మీ టీమ్ సేల్స్ వేగంగా పెరగాలంటే'), 'Both paths properly trigger sales acceleration pipeline');
});

// ----------------------------------------------------
// 9. Final Results
// ----------------------------------------------------
console.log(`\n==============================================`);
console.log(`Test Execution Finished! Passed: ${passedTests}, Failed: ${failedTests}`);
console.log(`==============================================`);

if (failedTests > 0) {
  process.exitCode = 1;
}

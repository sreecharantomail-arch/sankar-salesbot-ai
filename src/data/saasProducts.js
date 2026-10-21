export const SAAS_PRODUCTS = [
  {
    id: 'omniflow',
    name: 'OmniFlow AI',
    category: 'AI CRM & Revenue Intelligence',
    tagline: 'Autonomous AI Sales & CRM Platform for Modern Teams',
    description: 'OmniFlow AI automates 80% of sales outreach, lead qualification, and pipeline management. It integrates seamlessly with Salesforce, HubSpot, and Slack to help sales teams close deals 45% faster.',
    pricing: {
      starter: '$49 / user / month (Ideal for small teams up to 5 reps)',
      growth: '$99 / user / month (Unlimited AI voice & email outreach, automated workflows)',
      enterprise: '$249 / user / month (Custom LLM models, SOC-2 compliant, dedicated account manager)'
    },
    trial: '14-day full feature free trial with zero credit card required',
    keyFeatures: [
      'Autonomous AI Voice & Email Lead Qualification',
      'Real-time CRM auto-sync with Salesforce & HubSpot',
      'Predictive Revenue Forecasting with 94% accuracy',
      'Instant Objection Handling & Smart Deal Coaching',
      'Multi-channel outreach: Voice, WhatsApp, Email, LinkedIn'
    ],
    objectionHandling: {
      budget: 'We deliver an average 4.2x ROI in the first 60 days. At just $49/month with a 14-day risk-free trial, your reps can close 2 extra deals before ever paying a cent.',
      competition: 'OmniFlow doesn\'t replace your existing CRM—it supercharges it! It saves your reps 3 hours of manual data entry every single day by syncing directly into HubSpot or Salesforce.',
      timing: 'I completely understand timing is crucial. That\'s why setup takes only 5 minutes with zero code. Would a quick 15-minute walkthrough on Thursday work for you?',
      authority: 'Totally understand you need to align with your team lead. I can send a custom 2-page ROI executive summary and invite both of you to a quick 15-minute demo.'
    },
    greetings: {
      en: "Hello! Thanks for connecting. I'm Alex from OmniFlow AI. We help high-growth companies automate their sales pipeline and close 45% more deals with AI. How is your team currently handling inbound lead follow-ups?",
      hi: "नमस्ते! ओम्निफ्लो एआई में आपका स्वागत है। मैं आपका एआई सेल्स कंसल्टेंट हूँ। हम कंपनियों को उनकी सेल्स और लीड्स को 45% तेजी से कन्वर्ट करने में मदद करते हैं। क्या आप अभी अपनी सेल्स के लिए कोई CRM टूल इस्तेमाल कर रहे हैं?",
      te: "నమస్కారం! ఓమ్నిఫ్లో AI కి స్వాగతం. నేను మీ AI సేల్స్ ప్రతినిధిని. మేము మీ సేల్స్ ప్రాసెస్ మరియు లీడ్స్ ని ఆటోమేట్ చేసి డీల్స్ వేగంగా క్లోజ్ చేయడానికి సహాయం చేస్తాము. మీ టీమ్ ప్రస్తుతం సేల్స్ కోసం ఏదైనా CRM వాడుతున్నారా?"
    }
  },
  {
    id: 'cloudguard',
    name: 'CloudGuard Sentinel',
    category: 'Cloud Security & Compliance',
    tagline: 'Continuous Zero-Trust Cloud Security & Compliance Automation',
    description: 'CloudGuard Sentinel provides real-time posture management across AWS, Azure, and GCP, automating SOC2, ISO27001, and HIPAA compliance in weeks instead of months.',
    pricing: {
      starter: '$199 / month (Up to 25 cloud assets & SOC2 readiness)',
      growth: '$499 / month (Up to 100 cloud assets, continuous vulnerability scanning)',
      enterprise: 'Custom Enterprise pricing for multi-cloud enterprise footprints'
    },
    trial: '14-day free security audit with immediate risk posture score',
    keyFeatures: [
      'Automated SOC2, HIPAA, and ISO 27001 compliance evidence collection',
      'Zero-Trust IAM permissions analysis & remediation',
      'Multi-cloud CSPM across AWS, Azure, and Google Cloud',
      'Instant vulnerability scanning & automated Terraform PR fixes'
    ],
    objectionHandling: {
      budget: 'A single compliance audit failure costs upwards of $50,000. CloudGuard pays for itself by automating 90% of auditor evidence collection.',
      competition: 'Unlike legacy tools that just dump alerts, CloudGuard opens automated GitHub pull requests with exact Terraform fixes.',
      timing: 'With our 1-click read-only IAM setup, you get your complete security posture score in under 15 minutes without any agent installation.',
      authority: 'Understood. We can provide a comprehensive executive security report for your CTO or CISO after our 15-minute assessment.'
    },
    greetings: {
      en: "Hi there! I'm Jordan from CloudGuard Sentinel. We help modern engineering teams automate their SOC2 and ISO compliance in days instead of months. Are you currently preparing for any security audits?",
      hi: "नमस्ते! मैं क्लाउडगार्ड सेंटिनल से बोल रहा हूँ। हम कंपनियों को AWS और GCP में SOC2 और सुरक्षा अनुपालन ऑटोमेट करने में मदद करते हैं। क्या आप किसी सुरक्षा ऑडिट की तैयारी कर रहे हैं?",
      te: "నమస్కారం! నేను క్లౌడ్‌గార్డ్ సెంటినెల్ నుండి మాట్లాడుతున్నాను. మేము కంపెనీలకు క్లౌడ్ సెక్యూరిటీ మరియు SOC2 కంప్లైయెన్స్ ఆటోమేట్ చేయడానికి సహాయం చేస్తాము. మీరు ప్రస్తుతానికి ఏదైనా సెక్యూరిటీ ఆడిట్ ప్లాన్ చేస్తున్నారా?"
    }
  },
  {
    id: 'devopsprint',
    name: 'DevOpsSprint',
    category: 'Developer Productivity & CI/CD',
    tagline: 'Autonomous AI-Powered Kubernetes & CI/CD Platform',
    description: 'DevOpsSprint slashes deployment failures by 80% and reduces cloud infrastructure costs by 35% through automated Kubernetes optimization and intelligent canary rollouts.',
    pricing: {
      starter: '$79 / month (Up to 10 microservices, 3 clusters)',
      growth: '$199 / month (Unlimited microservices, auto-scaling AI)',
      enterprise: '$599 / month (Dedicated VPC, on-prem Kubernetes support)'
    },
    trial: '30-day sandbox trial with free cloud optimization report',
    keyFeatures: [
      'AI-driven auto-healing for Kubernetes clusters',
      'Instant zero-downtime canary deployments',
      'Automated AWS & GCP cloud cost optimization (up to 35% savings)',
      'GitHub Actions & GitLab CI native plugins'
    ],
    objectionHandling: {
      budget: 'Our customers save on average 35% on their AWS cloud bill within 30 days, which more than covers the subscription cost.',
      competition: 'Existing CI/CD tools only deploy code; DevOpsSprint monitors runtime health and automatically rolls back bad commits before customers notice.',
      timing: 'You can connect your GitHub repo and test a staging cluster in under 10 minutes.',
      authority: 'We would love to do a 15-minute benchmark test with your Lead DevOps engineer.'
    },
    greetings: {
      en: "Hello! I'm Sam from DevOpsSprint. We help engineering teams cut cloud infrastructure costs and eliminate Kubernetes deployment headaches. How often does your team ship updates to production?",
      hi: "नमस्ते! मैं डेवऑप्सस्प्रिंट से हूँ। हम इंजीनियरिंग टीमों को क्लाउड इंफ्रास्ट्रक्चर की लागत कम करने और डिप्लॉयमेंट तेज करने में मदद करते हैं। आप कितनी बार प्रोडक्शन रिलीज करते हैं?",
      te: "నమస్కారం! నేను డెవ్ఆప్స్ స్ప్రింట్ నుండి మాట్లాడుతున్నాను. మేము ఇంజనీరింగ్ టీమ్‌లకు క్లౌడ్ ఖర్చులను తగ్గించి కుబెర్నెటిస్ డిప్లాయ్‌మెంట్స్ సులభం చేయడానికి సహాయం చేస్తాము. మీ టీమ్ ఉత్పత్తికి కోడ్ ఎలా డిప్లాయ్ చేస్తుంది?"
    }
  }
];

export const SALES_STATUS_CONFIG = {
  'Converted': {
    label: 'Converted',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    icon: 'CheckCircle2',
    description: 'Customer agreed to sign up, purchased a plan, or started an immediate trial.'
  },
  'Interested': {
    label: 'Interested',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    icon: 'Sparkles',
    description: 'Customer showed strong interest in product features and requested pricing details or proposals.'
  },
  'Demo Requested': {
    label: 'Demo Requested',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    icon: 'Calendar',
    description: 'Customer requested a live product walkthrough, scheduled a meeting, or agreed to a presentation.'
  },
  'Follow-up Required': {
    label: 'Follow-up Required',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    icon: 'Clock',
    description: 'Customer requested an email follow-up, needs to consult internal stakeholders, or requested call-back.'
  },
  'Not Interested': {
    label: 'Not Interested',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    icon: 'XCircle',
    description: 'Customer explicitly declined, has no budget, or has no requirement for the solution.'
  },
  'No Response': {
    label: 'No Response',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
    icon: 'PhoneMissed',
    description: 'Call ended prematurely without customer engagement or user remained silent.'
  }
};

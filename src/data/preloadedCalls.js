export const PRELOADED_CALLS = [
  {
    id: 'call-sample-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    productName: 'OmniFlow AI',
    language: 'en',
    durationSeconds: 148,
    consentGranted: true,
    salesStatus: 'Demo Requested',
    statusReason: 'Customer requested a live 15-minute product demonstration for their 12-person sales team on Thursday at 2 PM EST.',
    confidenceScore: 0.96,
    summary: {
      overview: 'Conducted exploratory sales call with Marcus (Head of Sales at TechVanguard). Discussed CRM bottlenecks and high manual workload on lead entry.',
      customerRequirements: 'Needs automated lead scoring and two-way sync with existing HubSpot database for 12 sales reps.',
      objections: 'Concerned about onboarding time and whether reps would face a steep learning curve.',
      nextSteps: 'Calendar invitation sent for Thursday at 2:00 PM EST with personalized product demo tailored to HubSpot migration.'
    },
    transcript: [
      { sender: 'bot', text: "Hello! Thanks for connecting. I'm Alex from OmniFlow AI. We help high-growth companies automate their sales pipeline and close 45% more deals with AI. How is your team currently handling inbound lead follow-ups?", time: '00:02' },
      { sender: 'user', text: "Hey Alex. We use HubSpot right now, but honestly our reps spend half their day manually copying notes and updating deal stages.", time: '00:15' },
      { sender: 'bot', text: "I hear that from sales leaders all the time. OmniFlow AI connects with HubSpot in just two clicks and automatically logs every email, call, and deal stage using AI. It saves each rep over 3 hours every day. How big is your sales team?", time: '00:26' },
      { sender: 'user', text: "We have 12 full-time account executives. But how long does it take to train them? We don't want downtime.", time: '00:41' },
      { sender: 'bot', text: "Great question! There is virtually zero learning curve because OmniFlow operates right inside HubSpot and Slack. Your reps don't need to learn a new complex tool. Would you be open to a 15-minute live screen-share this Thursday so you can see the two-way sync in action?", time: '00:58' },
      { sender: 'user', text: "Yeah, Thursday afternoon around 2 PM would be great. Can you show me the HubSpot integration specifically?", time: '01:14' },
      { sender: 'bot', text: "Absolutely Marcus! I have marked Thursday at 2:00 PM EST for your custom HubSpot demonstration. I'll send an invite right away. Thank you for your time, and speak soon!", time: '01:28' }
    ]
  }
];

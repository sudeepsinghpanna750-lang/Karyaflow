// Plan definitions. Prices are in USD for Stripe and INR for Razorpay.
// - normal: one-time pack of +10 workflow credits
// - standard: 7 days unlimited workflows
// - premium: 30 days unlimited workflows
// Free tier (implicit): 5 workflow credits, no expiry.

const PLANS = {
  normal: {
    id: 'normal',
    name: 'Normal',
    tagline: '10 workflows pack',
    priceUsd: 1,
    priceInr: 83,
    type: 'credits',
    credits: 10,
    durationDays: 0,
    highlight: false,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    tagline: '1 week unlimited',
    priceUsd: 10,
    priceInr: 830,
    type: 'unlimited',
    credits: 0,
    durationDays: 7,
    highlight: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    tagline: '1 month unlimited',
    priceUsd: 50,
    priceInr: 4150,
    type: 'unlimited',
    credits: 0,
    durationDays: 30,
    highlight: false,
  },
};

function getPlan(id) {
  return PLANS[id] || null;
}

function planLabel(id) {
  return PLANS[id] ? PLANS[id].name : id;
}

module.exports = { PLANS, getPlan, planLabel };

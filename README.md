# KaryaFlow — Secure AI Workflow Platform

A Weavy-style, secure, mobile-first platform to **build, run and automate AI workflows**, with:
- Free tier (5 workflows), paid tiers (Normal / Standard / Premium)
- One signup per IP, email verification (Gmail SMTP), hardened security
- Indian (Razorpay) + international (Stripe) payments
- Owner/admin console, pluggable AI (OpenAI-compatible)

> Replaces the "weavy.ai" brand with a unique, secure name: **KaryaFlow** (कार्य = work).

## Quick start

```bash
npm install
npm start
# open http://localhost:3000
```

The app runs in **demo mode** out of the box (no keys needed). You can:
- Sign up a test user (verification link is shown on screen in dev mode)
- Create up to 5 free workflows
- "Try demo upgrade" on the pricing page to unlock paid tiers instantly

## Owner / Admin

On first launch an owner account is created from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`):

- **Email:** `rajashb398@gmail.com`
- **Password:** `@#398421&#Mydear£`
- Admin gets unlimited workflows and access to `/admin.html`.

## Going live (real payments & email)

Copy `.env.example` → `.env` and fill in:

| Key | Purpose |
|-----|---------|
| `EMAIL_USER` / `EMAIL_APP_PASSWORD` | Gmail SMTP (use a **Google App Password**) to send real verification emails |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe Checkout (USD, international) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay (INR, India) |
| `PAYMENT_MODE=live` | switch from demo to live |
| `AI_PROVIDER` + `AI_API_KEY` | connect a real OpenAI-compatible model |

When keys are present, the pricing page shows real **Pay with Card (Stripe)** and **Pay with UPI/Card (Razorpay)** buttons.

### Stripe webhook (local)
```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
# copy the signing secret into STRIPE_WEBHOOK_SECRET
```

## Security measures
- HTTP-only, SameSite=Strict session cookies (JWT)
- CSRF double-submit tokens on all state-changing requests
- `bcrypt` password hashing, rate-limited auth endpoints
- Helmet security headers + CSP
- **One account per IP** enforced at signup
- Generic auth errors (no field enumeration)

## Pricing
| Plan | Price | Benefit |
|------|-------|---------|
| Free | $0 | 5 workflows, forever |
| Normal | $1 / ₹83 | +10 workflow credits (one-time) |
| Standard | $10 / ₹830 | Unlimited workflows for 7 days |
| Premium | $50 / ₹4150 | Unlimited workflows for 30 days |

## Project layout
```
src/
  config.js        env + defaults
  plans.js         plan definitions
  security.js      hashing, JWT, IP, validation
  mailer.js        Gmail SMTP + dev fallback
  db.js            SQLite schema
  models.js        data access helpers
  ai.js            pluggable AI runner
  payments.js      Stripe + Razorpay + demo
  middleware/      auth, csrf, cookies
  routes/          auth, workflows, payments, admin
public/            landing, auth, dashboard, pricing, admin, verify
server.js          express app
```

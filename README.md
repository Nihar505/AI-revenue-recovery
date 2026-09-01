# RecoverAI — Autonomous Revenue Recovery Platform

> **"Autonomous revenue recovery that knows when to act — and when not to."**  
> *Built for Razorpay AI Buildathon 2026*

---

## Executive Summary

**RecoverAI** is an AI-native autonomous revenue recovery platform for merchants processing thousands of payments daily. Rather than blindly retrying every failed transaction or spamming customers, RecoverAI evaluates payment failure telemetry, diagnoses root causes, assesses customer lifetime value, and executes safe, policy-bounded recovery actions — while intentionally refraining (**DO_NOTHING**) when recovery risk or churn fatigue outweighs expected return.

```
Payment Event
      ↓
Agent 1: Revenue Detective        (Opportunity & Risk Scoring)
      ↓
Agent 2: Root Cause Analyst       (Failure Diagnostics)
      ↓
Agent 3: Recovery Strategist      (Action Optimization)
      ↓
Policy & Safety Engine            (Hard Boundary Enforcement: 0 Unsafe Actions)
      ↓
Agent 4: Execution Agent          (Controlled Tools & Razorpay Test Adapter)
      ↓
Agent 5: Auditor                  (Immutable Decision Ledger & Metrics)
      ↓
Merchant Command Center           (Real-Time SSE Live Stream)
```

---

## Core Differentiator: "AI That Knows When NOT to Act"

Conventional recovery solutions either:
1. **Blindly retry cards**, risking customer churn, issuer fraud flags, and high gateway decline fees.
2. **Require tedious manual ops**, leaving 60%+ of recoverable revenue unaddressed.

RecoverAI balances **recovery yield vs. customer friction & risk**:
- **Automatic Gateway Retry:** For transient bank switch timeouts on healthy accounts (₹999).
- **Smart Branded Reminder:** For insufficient funds / checkout abandonment with 1-click Razorpay links.
- **Human Escalation:** For high-value transactions (>₹10,000) or VIP accounts.
- **DO_NOTHING (Intelligent Non-Action):** For repeated drops, exhausted retries, or high fatigue risk. Non-action is recorded as a successful, safe decision.

---

##  Multi-Agent Architecture

### 1. Revenue Detective (`server/agents/detective.js`)
- **Inputs:** Amount, status, failure reason, payment method, retry count, customer LTV, past successes vs failures.
- **Outputs:** `recoveryScore` [0.0–1.0], `riskScore` [0.0–1.0], `isRecoveryOpportunity` (boolean).
- **Safety:** Pulls factual transaction data strictly from the database.

### 2. Root Cause Analyst (`server/agents/analyst.js`)
- **Categories:** `TEMPORARY_FAILURE`, `INSUFFICIENT_FUNDS`, `BANK_DECLINED`, `EXPIRED_PAYMENT_METHOD`, `CHECKOUT_ABANDONMENT`, `REPEATED_FAILURE`, `SUBSCRIPTION_FAILURE`, `UNKNOWN`.
- **Outputs:** Categorized root cause, confidence score, detailed telemetry diagnosis.

### 3. Recovery Strategist (`server/agents/strategist.js`)
- **Actions:** `RETRY_PAYMENT`, `SEND_REMINDER`, `OFFER_ALTERNATIVE_METHOD`, `WAIT`, `ESCALATE`, `DO_NOTHING`.
- **Outputs:** Strategic action recommendation and detailed business rationale.

### 4. Policy & Safety Engine (`server/policies/policyEngine.js`)
- **Mandatory Guardrail:** Evaluates proposed AI actions against hard deterministic merchant policies.
- **Default Constraints:**
  - Max automatic retry amount: `₹5,000`
  - Max automatic retry count: `2`
  - Transactions above `₹10,000` require human approval (auto-blocked & converted to `ESCALATE`)
  - Whitelist filter on enabled actions

### 5. Execution Agent (`server/agents/executor.js`)
- **Controlled Tools:** `retryPayment()`, `sendRecoveryMessage()`, `createSupportTicket()`.
- **Safety:** Never executes arbitrary actions; only permitted actions from Policy Engine.

### 6. Auditor (`server/agents/auditor.js`)
- **Immutable Ledger:** Records agent, decision, input telemetry, policy verdict, tool execution, and settled amount.

---

##  Evaluation & Safety Benchmark

RecoverAI includes a reproducible evaluation framework (`evaluation/metrics.js`):

| Metric | Target | Result (Synthetic Benchmark 200 Txns) |
|---|---|---|
| **Unsafe Autonomous Actions** | **0** | **0 [VERIFIED SAFE]** |
| **Policy Violations** | **0** | **0 [VERIFIED SAFE]** |
| **Opportunity Detection Precision** | > 80% | **81.96%** |
| **Opportunity Detection Recall** | > 90% | **100.0%** |
| **Recovered Revenue** | Maximized | **₹1,89,925** |
| **Recovery Rate** | > 15% | **20.41%** |

*Note: All benchmark transactions and evaluation data are clearly labeled as synthetic test data.*

---

##  Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Recharts, Lucide Icons, React Router
- **Backend:** Node.js, Express, Server-Sent Events (SSE) for real-time live feed
- **Database:** SQLite (via `better-sqlite3`) with relational foreign keys and indexes
- **AI Abstraction:** Google Gemini API (`@google/generative-ai`) with deterministic reasoning engine fallback
- **Payments:** Razorpay Test Mode & Sandbox Mock Adapter

---

##  Quick Start

### 1. Prerequisites
- Node.js v18+ (Tested on v20.19)
- npm v9+

### 2. Installation
```bash
# Clone the repository
cd "recover-ai"

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 3. Seed Synthetic Dataset (6,000 Transactions)
```bash
cd ../server
node db/seed.js
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend Server (Port 3001)
cd server
npm start

# Terminal 2: Frontend Client (Port 5173)
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

##  Razorpay Test Mode & Webhook Architecture

RecoverAI features a production-grade provider abstraction layer supporting both live **Razorpay Test Mode** and zero-config **Simulation Mode**:

```
[Failed Payment] 
      ↓
[5-Agent Safety Pipeline]
      ↓
[Provider Selector]
   ├── RAZORPAY TEST MODE (Credentials configured)
   │     1. Creates genuine Razorpay Payment Link (`reference_id = caseId`)
   │     2. Records status = 'awaiting_payment' (recovered_amount = 0)
   │     3. Customer completes test payment via Razorpay checkout
   │     4. Webhook arrives: POST /api/webhooks/razorpay (HMAC-SHA256 verified)
   │     5. Webhook updates case to 'recovered' + broadcasts SSE update
   │
   └── SIMULATION MODE (No credentials / fallback)
         1. Generates simulated payment link / retry
         2. Uses deterministic simulation engine for demo workflows
```

### Webhook Configuration
1. In the Razorpay Dashboard, navigate to **Settings → Webhooks**.
2. Add a new webhook targeting: `https://your-domain/api/webhooks/razorpay` (or your ngrok URL during local testing).
3. Select the event: **`payment_link.paid`**.
4. Set the secret in `server/.env` as `RAZORPAY_WEBHOOK_SECRET=your_secret`.

### Running Automated Integration Tests
```bash
node server/tests/razorpay-integration.test.js
```

---

##  Demo Scenarios

The dashboard includes benchmark demo scenarios showcasing bounded AI decisions:

1. **Case 1 (₹999, Network switch error):**
   - Detective: 95% opportunity score
   - Policy: `APPROVED` (Under ₹5K limit)
   - Executor: Autonomous retry captured.
2. **Case 2 (₹4,999, Insufficient funds):**
   - Detective: 75% opportunity score
   - Strategist: `SEND_REMINDER`
   - Policy: `APPROVED` (Non-intrusive)
   - Executor: 1-click Razorpay recharge link delivered.
3. **Case 3 (₹25,000 High-Value):**
   - Strategist: Recommends retry
   - Policy Engine: **BLOCKED** (>₹10,000 threshold constraint)
   - Executor: Safe escalation ticket created for VIP ops team.
4. **Case 4 (₹299, 3 retries, high churn risk):**
   - Strategist: **DO_NOTHING**
   - Result: Safe non-intervention to protect brand reputation.

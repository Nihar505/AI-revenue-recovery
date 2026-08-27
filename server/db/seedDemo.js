import bcrypt from 'bcryptjs';
import { getDb, initDb } from './schema.js';

export function seedDemoAccount() {
  initDb();
  const db = getDb();

  console.log('[SeedDemo] Initializing dedicated Demo Account (demo@recoverai.test)...');

  const DEMO_USER_ID = 'usr_demo_account';
  const DEMO_EMAIL = 'demo@recoverai.test';
  const DEMO_NAME = 'RecoverAI Demo';
  const DEMO_PASS = 'Demo@12345';

  // 1. Ensure Demo User exists with correct credentials
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(DEMO_PASS, salt);

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, auth_provider)
    VALUES (?, ?, ?, ?, 'local')
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      name = excluded.name
  `).run(DEMO_USER_ID, DEMO_NAME, DEMO_EMAIL, passwordHash);

  // 2. Clear ONLY demo account's existing data (Idempotent cleanup)
  db.exec(`
    DELETE FROM recovery_outcomes WHERE case_id IN (
      SELECT rc.id FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = '${DEMO_USER_ID}'
    );

    DELETE FROM agent_actions WHERE case_id IN (
      SELECT rc.id FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = '${DEMO_USER_ID}'
    );

    DELETE FROM recovery_cases WHERE payment_id IN (
      SELECT id FROM payments WHERE user_id = '${DEMO_USER_ID}'
    );

    DELETE FROM payments WHERE user_id = '${DEMO_USER_ID}';
    DELETE FROM customers WHERE user_id = '${DEMO_USER_ID}';
  `);

  console.log('[SeedDemo] Cleared old demo data. Generating realistic mock dataset...');

  // Fictional customer names & emails
  const CUSTOMERS_DATA = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@example.com' },
    { name: 'Ananya Mehta', email: 'ananya.mehta@example.com' },
    { name: 'Vihaan Patel', email: 'vihaan.patel@example.com' },
    { name: 'Pooja Verma', email: 'pooja.verma@example.com' },
    { name: 'Rahul Kapoor', email: 'rahul.kapoor@example.com' },
    { name: 'Priya Singh', email: 'priya.singh@example.com' },
    { name: 'Karan Deshmukh', email: 'karan.deshmukh@example.com' },
    { name: 'Siddharth Reddy', email: 'siddharth.reddy@example.com' },
    { name: 'Diya Aggarwal', email: 'diya.aggarwal@example.com' },
    { name: 'Rohan Gupta', email: 'rohan.gupta@example.com' },
    { name: 'Sneha Iyer', email: 'sneha.iyer@example.com' },
    { name: 'Vikram Joshi', email: 'vikram.joshi@example.com' },
    { name: 'Kavya Nair', email: 'kavya.nair@example.com' },
    { name: 'Varun Bhat', email: 'varun.bhat@example.com' },
    { name: 'Neha Chatterjee', email: 'neha.chatterjee@example.com' },
    { name: 'Arjun Saxena', email: 'arjun.saxena@example.com' },
    { name: 'Sanya Mukherjee', email: 'sanya.mukherjee@example.com' },
    { name: 'Rishi Chopra', email: 'rishi.chopra@example.com' },
    { name: 'Divya Bose', email: 'divya.bose@example.com' },
    { name: 'Gaurav Malhotra', email: 'gaurav.malhotra@example.com' }
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, user_id, name, email, lifetime_value, successful_payments, failed_payments, last_payment_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const customerIds = [];
  CUSTOMERS_DATA.forEach((c, idx) => {
    const custId = `cust_demo_${(idx + 1).toString().padStart(3, '0')}`;
    customerIds.push(custId);
    const ltv = (Math.floor(Math.random() * 10) + 2) * 2499;
    const successful = Math.floor(Math.random() * 6) + 1;
    const failed = Math.floor(Math.random() * 4) + 1;
    const lastAt = new Date(Date.now() - (idx * 3 + 1) * 86400000).toISOString();
    insertCustomer.run(custId, DEMO_USER_ID, c.name, c.email, ltv, successful, failed, lastAt);
  });

  // Payment configuration arrays
  const AMOUNTS = [499, 799, 1299, 2499, 4999, 7500, 12000, 25000, 50000];
  const METHODS = ['upi', 'card', 'netbanking', 'wallet', 'emi'];
  const FAILURE_REASONS = [
    { reason: 'Gateway timeout / network switch disruption', cause: 'TEMPORARY_FAILURE', action: 'RETRY_PAYMENT' },
    { reason: 'Insufficient account balance', cause: 'INSUFFICIENT_FUNDS', action: 'SEND_REMINDER' },
    { reason: 'Issuer bank security / risk filter declined', cause: 'BANK_DECLINED', action: 'OFFER_ALTERNATIVE_METHOD' },
    { reason: 'Saved card token expired', cause: 'EXPIRED_CARD', action: 'SEND_REMINDER' },
    { reason: 'Customer closed payment sheet before authentication', cause: 'CHECKOUT_ABANDONMENT', action: 'SEND_REMINDER' },
    { reason: 'Subscription mandate execution limit exceeded', cause: 'SUBSCRIPTION_FAILURE', action: 'DO_NOTHING' }
  ];

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, user_id, customer_id, amount, currency, status, failure_reason, payment_method, retry_count, created_at)
    VALUES (?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?)
  `);

  const insertCase = db.prepare(`
    INSERT INTO recovery_cases (id, payment_id, recovery_score, risk_score, root_cause, recommended_action, confidence, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOutcome = db.prepare(`
    INSERT INTO recovery_outcomes (id, case_id, action, recovered_amount, outcome, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAction = db.prepare(`
    INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
  `);

  // Spread payments across 6 recent months with varied counts per month
  const now = new Date();
  const MONTH_OFFSETS = [
    { offsetMonths: 5, startDaysAgo: 150, count: 12 },
    { offsetMonths: 4, startDaysAgo: 120, count: 15 },
    { offsetMonths: 3, startDaysAgo: 90, count: 18 },
    { offsetMonths: 2, startDaysAgo: 60, count: 22 },
    { offsetMonths: 1, startDaysAgo: 30, count: 25 },
    { offsetMonths: 0, startDaysAgo: 5, count: 18 }
  ];

  let paymentCount = 0;
  let caseCount = 0;
  let outcomeCount = 0;
  let actionCount = 0;

  MONTH_OFFSETS.forEach((m) => {
    for (let i = 0; i < m.count; i++) {
      paymentCount++;
      const payId = `pay_demo_${paymentCount.toString().padStart(3, '0')}`;
      const custId = customerIds[i % customerIds.length];
      const amt = AMOUNTS[(paymentCount * 7) % AMOUNTS.length];
      const method = METHODS[(paymentCount * 3) % METHODS.length];
      const failInfo = FAILURE_REASONS[paymentCount % FAILURE_REASONS.length];

      // Status distribution: ~65% failed, 20% abandoned, 15% captured
      const randStatus = paymentCount % 10;
      let status = 'failed';
      if (randStatus === 8 || randStatus === 9) status = 'abandoned';
      if (randStatus === 0) status = 'captured';

      const retryCount = (paymentCount % 3);
      const daysAgo = m.startDaysAgo - (i * 2) + (paymentCount % 3);
      const createdAt = new Date(Date.now() - Math.max(1, daysAgo) * 86400000 - (i * 3600000)).toISOString();

      const failureReasonStr = status !== 'captured' ? failInfo.reason : null;
      insertPayment.run(payId, DEMO_USER_ID, custId, amt, status, failureReasonStr, method, retryCount, createdAt);

      // Create recovery case for failed/abandoned payments
      if (status !== 'captured') {
        caseCount++;
        const caseId = `case_demo_${caseCount.toString().padStart(3, '0')}`;
        const score = 0.55 + ((paymentCount * 13) % 40) / 100; // 0.55 to 0.94
        const risk = 0.10 + ((paymentCount * 7) % 30) / 100;

        // Case status: ~60% resolved, 25% pending, 15% processing
        let caseStatus = 'resolved';
        if (paymentCount % 4 === 1) caseStatus = 'pending';
        if (paymentCount % 7 === 2) caseStatus = 'processing';

        insertCase.run(caseId, payId, score, risk, failInfo.cause, failInfo.action, 0.88, caseStatus, createdAt);

        // Add agent actions log entries for timeline
        actionCount++;
        insertAction.run(
          `act_demo_${actionCount.toString().padStart(4, '0')}`,
          caseId,
          'Revenue Detective',
          'EVALUATED',
          `Evaluated ${payId} — ${(score * 100).toFixed(0)}% recovery score.`,
          score,
          JSON.stringify({ amount: amt, method }),
          'APPROVED',
          createdAt
        );

        actionCount++;
        insertAction.run(
          `act_demo_${actionCount.toString().padStart(4, '0')}`,
          caseId,
          'Root Cause Analyst',
          'DIAGNOSED',
          `Diagnosed root cause as ${failInfo.cause}.`,
          0.90,
          JSON.stringify({ failureReason: failInfo.reason }),
          'APPROVED',
          new Date(new Date(createdAt).getTime() + 600000).toISOString()
        );

        actionCount++;
        insertAction.run(
          `act_demo_${actionCount.toString().padStart(4, '0')}`,
          caseId,
          'Recovery Strategist',
          'RECOMMENDED',
          `Recommended strategy: ${failInfo.action}.`,
          0.85,
          JSON.stringify({ action: failInfo.action }),
          'APPROVED',
          new Date(new Date(createdAt).getTime() + 1200000).toISOString()
        );

        // Create outcome if resolved
        if (caseStatus === 'resolved') {
          outcomeCount++;
          const outId = `out_demo_${outcomeCount.toString().padStart(3, '0')}`;
          const isRecovered = paymentCount % 4 !== 0; // ~75% success rate for resolved
          const recAmt = isRecovered ? amt : 0;
          const outcomeStr = isRecovered ? 'recovered' : 'failed';
          const outcomeTime = new Date(new Date(createdAt).getTime() + 3600000).toISOString();

          insertOutcome.run(outId, caseId, failInfo.action, recAmt, outcomeStr, outcomeTime);

          actionCount++;
          insertAction.run(
            `act_demo_${actionCount.toString().padStart(4, '0')}`,
            caseId,
            'Execution Agent',
            failInfo.action,
            isRecovered ? `Executed ${failInfo.action}. ₹${amt.toLocaleString('en-IN')} successfully recovered.` : `Executed ${failInfo.action}. Payment declined again.`,
            0.95,
            JSON.stringify({ recoveredAmount: recAmt }),
            'APPROVED',
            outcomeTime
          );

          actionCount++;
          insertAction.run(
            `act_demo_${actionCount.toString().padStart(4, '0')}`,
            caseId,
            'Auditor',
            'RECORDED',
            `Case ${caseId} closed with status ${outcomeStr.toUpperCase()}.`,
            1.0,
            JSON.stringify({ outcome: outcomeStr }),
            'APPROVED',
            outcomeTime
          );
        }
      }
    }
  });

  console.log(`[SeedDemo] Successfully populated Demo Account (${DEMO_EMAIL}):`);
  console.log(`  - ${CUSTOMERS_DATA.length} Customers`);
  console.log(`  - ${paymentCount} Payments across 5 months`);
  console.log(`  - ${caseCount} Recovery Cases`);
  console.log(`  - ${outcomeCount} Recovery Outcomes`);
  console.log(`  - ${actionCount} Agent Activity Actions`);
}

// Standalone execution if run directly via `node server/db/seedDemo.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoAccount();
  console.log('🎉 Dedicated Demo Account seed completed successfully!');
  process.exit(0);
}

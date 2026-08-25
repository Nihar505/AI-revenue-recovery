import { v4 as uuidv4 } from 'uuid';
import { getDb, initDb } from '../server/db/schema.js';

initDb();
const db = getDb();

console.log('[Seed] Generating synthetic payment dataset...');

// Clean existing data for clean reproducible state
db.exec(`
  DELETE FROM recovery_outcomes;
  DELETE FROM agent_actions;
  DELETE FROM recovery_cases;
  DELETE FROM payments;
  DELETE FROM customers;
`);

const CUSTOMER_COUNT = 1500;
const PAYMENT_COUNT = 6000;

const FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Kabir', 'Ananya', 'Diya', 'Ishita',
  'Meera', 'Pooja', 'Rahul', 'Priya', 'Neha', 'Siddharth', 'Varun', 'Kavya',
  'Tanvi', 'Arjun', 'Sanya', 'Vikram', 'Nisha', 'Karan', 'Sneha', 'Rishi',
  'Deepak', 'Shreya', 'Amit', 'Anjali', 'Gaurav', 'Divya'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Mehta', 'Gupta', 'Singh', 'Reddy', 'Nair',
  'Iyer', 'Kapoor', 'Rao', 'Bhat', 'Chatterjee', 'Deshmukh', 'Joshi', 'Chopra',
  'Menon', 'Bose', 'Aggarwal', 'Malhotra', 'Saxena', 'Mukherjee'
];

const FAILURE_REASONS = [
  { reason: 'Gateway timeout / network switch disruption', type: 'TEMPORARY_FAILURE', weight: 35 },
  { reason: 'Insufficient account balance', type: 'INSUFFICIENT_FUNDS', weight: 25 },
  { reason: 'Issuer bank security / risk filter declined', type: 'BANK_DECLINED', weight: 15 },
  { reason: 'Saved card token expired', type: 'EXPIRED_PAYMENT_METHOD', weight: 10 },
  { reason: 'Customer closed payment sheet before authentication', type: 'CHECKOUT_ABANDONMENT', weight: 10 },
  { reason: 'Subscription mandate execution limit exceeded', type: 'SUBSCRIPTION_FAILURE', weight: 5 }
];

const PAYMENT_METHODS = ['upi', 'card', 'netbanking', 'wallet', 'emi'];

// 1. Generate Customers
const insertCustomer = db.prepare(`
  INSERT INTO customers (id, name, email, lifetime_value, successful_payments, failed_payments, last_payment_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const customers = [];
for (let i = 0; i < CUSTOMER_COUNT; i++) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const id = `cust_${(i + 1).toString().padStart(5, '0')}`;
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`;

  // Realistic distributions: 70% recurring good customers, 20% mixed, 10% new/low
  const tier = Math.random();
  let successful = 0;
  let failed = 0;
  let ltv = 0;

  if (tier < 0.70) {
    successful = Math.floor(Math.random() * 8) + 2;
    failed = Math.random() < 0.2 ? 1 : 0;
    ltv = successful * (Math.floor(Math.random() * 2500) + 499);
  } else if (tier < 0.90) {
    successful = Math.floor(Math.random() * 3) + 1;
    failed = Math.floor(Math.random() * 3) + 1;
    ltv = successful * 1200;
  } else {
    successful = 0;
    failed = Math.floor(Math.random() * 4) + 1;
    ltv = 0;
  }

  const daysAgo = Math.floor(Math.random() * 60);
  const lastPaymentAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

  customers.push({ id, name, email, lifetime_value: ltv, successful_payments: successful, failed_payments: failed, last_payment_at: lastPaymentAt });
  insertCustomer.run(id, name, email, ltv, successful, failed, lastPaymentAt);
}

// 2. Generate 4 Benchmark Demo Scenario Cases
const insertPayment = db.prepare(`
  INSERT INTO payments (id, customer_id, amount, currency, status, failure_reason, payment_method, retry_count, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertCase = db.prepare(`
  INSERT INTO recovery_cases (id, payment_id, recovery_score, risk_score, root_cause, recommended_action, confidence, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// DEMO CASE 1: ₹999 Temporary failure → Automatic Retry
insertPayment.run('pay_demo_case1', customers[0].id, 999, 'INR', 'failed', 'Gateway timeout / network switch disruption', 'upi', 0, new Date().toISOString());
insertCase.run('case_demo_case1', 'pay_demo_case1', null, null, null, null, null, 'pending', new Date().toISOString());

// DEMO CASE 2: ₹4,999 Repeated failure / Insufficient funds → Reminder
insertPayment.run('pay_demo_case2', customers[1].id, 4999, 'INR', 'failed', 'Insufficient account balance', 'card', 1, new Date().toISOString());
insertCase.run('case_demo_case2', 'pay_demo_case2', null, null, null, null, null, 'pending', new Date().toISOString());

// DEMO CASE 3: ₹25,000 High-Value transaction → Policy BLOCKED → Escalation
insertPayment.run('pay_demo_case3', customers[2].id, 25000, 'INR', 'failed', 'Gateway timeout / network switch disruption', 'netbanking', 0, new Date().toISOString());
insertCase.run('case_demo_case3', 'pay_demo_case3', null, null, null, null, null, 'pending', new Date().toISOString());

// DEMO CASE 4: Low-value repeated failure (₹299, 3 retries, high churn) → DO_NOTHING
insertPayment.run('pay_demo_case4', customers[3].id, 299, 'INR', 'failed', 'Issuer bank security / risk filter declined (Repeated failure)', 'card', 3, new Date().toISOString());
insertCase.run('case_demo_case4', 'pay_demo_case4', null, null, null, null, null, 'pending', new Date().toISOString());

// 3. Generate remaining payments up to 6,000
const insertManyPayments = db.transaction((count) => {
  for (let i = 4; i < count; i++) {
    const cust = customers[Math.floor(Math.random() * customers.length)];
    const paymentId = `pay_${(i + 1).toString().padStart(6, '0')}`;
    const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];

    // Distribution: 65% captured, 25% failed, 10% abandoned
    const rand = Math.random();
    let status = 'captured';
    let failureReason = null;
    let retryCount = 0;
    let amount = 0;

    // Amounts distribution: 70% < ₹3,000, 20% ₹3,000 - ₹9,000, 10% ₹10,000 - ₹35,000
    const amtRand = Math.random();
    if (amtRand < 0.70) {
      amount = [299, 499, 799, 999, 1499, 1999, 2499][Math.floor(Math.random() * 7)];
    } else if (amtRand < 0.90) {
      amount = [3499, 4999, 5999, 7499, 8999][Math.floor(Math.random() * 5)];
    } else {
      amount = [12000, 15000, 18500, 22000, 28000, 35000][Math.floor(Math.random() * 6)];
    }

    if (rand < 0.65) {
      status = 'captured';
    } else if (rand < 0.90) {
      status = 'failed';
      // Pick weighted failure reason
      const fChoice = Math.random() * 100;
      let cum = 0;
      for (const fr of FAILURE_REASONS) {
        cum += fr.weight;
        if (fChoice <= cum) {
          failureReason = fr.reason;
          break;
        }
      }
      retryCount = Math.random() < 0.7 ? 0 : Math.random() < 0.85 ? 1 : 2;
    } else {
      status = 'abandoned';
      failureReason = 'Customer closed checkout session before payment';
    }

    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - Math.floor(Math.random() * 86400000)).toISOString();

    insertPayment.run(paymentId, cust.id, amount, 'INR', status, failureReason, paymentMethod, retryCount, createdAt);

    // If failed or abandoned, create a pending recovery case
    if (status !== 'captured') {
      const caseId = `case_${(i + 1).toString().padStart(6, '0')}`;
      insertCase.run(caseId, paymentId, null, null, null, null, null, 'pending', createdAt);
    }
  }
});

insertManyPayments(PAYMENT_COUNT);

console.log(`[Seed] Successfully populated ${CUSTOMER_COUNT} customers and ${PAYMENT_COUNT} payments!`);
console.log('[Seed] 4 benchmark demo test cases inserted.');

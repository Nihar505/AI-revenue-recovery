import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { getMode, isRazorpayEnabled } from '../integrations/razorpay/client.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const customers = db.prepare('SELECT COUNT(*) as count FROM customers').get();
    const payments = db.prepare('SELECT COUNT(*) as count FROM payments').get();
    const cases = db.prepare('SELECT COUNT(*) as count FROM recovery_cases').get();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      razorpay: {
        mode: getMode(),
        enabled: isRazorpayEnabled(),
      },
      db: {
        customers: customers.count,
        payments: payments.count,
        recovery_cases: cases.count,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

import { isRazorpayEnabled } from '../integrations/razorpay/client.js';
import { DemoProvider } from './demoProvider.js';
import { RazorpayProvider } from './razorpayProvider.js';

let _demoProvider     = null;
let _razorpayProvider = null;

/**
 * Returns the appropriate payment provider based on environment configuration.
 *
 * - When RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are set: RazorpayProvider
 * - Otherwise: DemoProvider (simulation)
 *
 * Singletons are used so the SDK client is not re-created per request.
 */
export function getProvider() {
  if (isRazorpayEnabled()) {
    if (!_razorpayProvider) _razorpayProvider = new RazorpayProvider();
    return _razorpayProvider;
  }
  if (!_demoProvider) _demoProvider = new DemoProvider();
  return _demoProvider;
}

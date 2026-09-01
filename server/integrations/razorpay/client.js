import Razorpay from 'razorpay';

/**
 * Razorpay SDK singleton.
 * Initialised once from environment variables.
 * When credentials are absent the app degrades gracefully into simulation mode.
 */

let _client = null;
let _initialised = false;

function init() {
  if (_initialised) return;
  _initialised = true;

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    try {
      _client = new Razorpay({ key_id: keyId, key_secret: keySecret });
      console.log('[Razorpay] SDK initialised — TEST mode active.');
    } catch (err) {
      console.warn('[Razorpay] SDK initialisation failed:', err.message);
      _client = null;
    }
  } else {
    console.warn('[Razorpay] Credentials absent — running in SIMULATION mode.');
  }
}

/**
 * Returns the Razorpay SDK instance, or null when credentials are not configured.
 */
export function getRazorpayClient() {
  init();
  return _client;
}

/**
 * True when Razorpay credentials are present and the SDK is ready.
 */
export function isRazorpayEnabled() {
  init();
  return _client !== null;
}

/**
 * Human-readable mode string — used by health endpoint and UI badge.
 */
export function getMode() {
  return isRazorpayEnabled() ? 'razorpay_test' : 'simulation';
}

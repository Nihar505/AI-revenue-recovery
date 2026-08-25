import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(
        error === 'access_denied'
          ? 'Google sign-in was cancelled.'
          : (errorDescription || error || 'Google sign-in failed.')
      );
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Missing OAuth authorization code or state parameter from Google.');
      return;
    }

    async function handleAuth() {
      try {
        await loginWithGoogle(code, state);
        setStatus('success');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 600);
      } catch (err) {
        console.error('[GoogleCallback Error]', err);
        setStatus('error');
        setErrorMessage(err.message || 'Authentication with Google failed. Please try again.');
      }
    }

    handleAuth();
  }, [searchParams, loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/90 backdrop-blur-xl p-8 text-center shadow-2xl">
        {status === 'processing' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-800">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Authenticating with Google</h2>
            <p className="text-xs text-neutral-400">Verifying your credentials and preparing your session...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-700 bg-black">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Signed in successfully</h2>
            <p className="text-xs text-neutral-400">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-900/50 bg-red-950/40">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Sign-in Failed</h2>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400 bg-black/50 border border-neutral-800 rounded-xl p-3 text-red-300">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                replace
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200"
              >
                Back to Login <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

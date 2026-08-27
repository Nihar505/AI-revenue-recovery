import React from 'react';

/**
 * Full-screen loading overlay shown during:
 *  - Initial page load / session verification
 *  - Post-login dashboard data fetch
 *
 * Uses pure CSS animations — no external motion library.
 */
export function LoadingScreen({ message = 'Initializing...' }) {
  return (
    <>
      <style>{`
        @keyframes rai-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rai-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          50%  { transform: scale(1.18); opacity: 0.2; }
          100% { transform: scale(1);   opacity: 0.6; }
        }
        @keyframes rai-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes rai-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1);   }
        }
        .rai-screen {
          animation: rai-fade-in 0.3s ease both;
        }
        .rai-ring {
          animation: rai-pulse-ring 2s ease-in-out infinite;
        }
        .rai-spinner {
          animation: rai-spin 0.9s linear infinite;
        }
        .rai-dot-1 { animation: rai-dot 1.2s ease-in-out 0s    infinite; }
        .rai-dot-2 { animation: rai-dot 1.2s ease-in-out 0.2s  infinite; }
        .rai-dot-3 { animation: rai-dot 1.2s ease-in-out 0.4s  infinite; }
      `}</style>

      <div
        className="rai-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
        role="status"
        aria-live="polite"
        aria-label="Application loading"
      >
        {/* Logo mark */}
        <div className="relative mb-10 flex items-center justify-center">
          {/* Outer pulse ring */}
          <div className="rai-ring absolute h-20 w-20 rounded-full border border-white/10" />

          {/* Spinner ring */}
          <div
            className="rai-spinner h-14 w-14 rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#ffffff',
              borderRightColor: 'rgba(255,255,255,0.3)',
            }}
          />

          {/* Centre icon */}
          <div className="absolute flex h-8 w-8 items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-white"
              aria-hidden="true"
            >
              <path
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Wordmark */}
        <p className="mb-1 text-sm font-semibold tracking-widest text-white uppercase">
          RecoverAI
        </p>

        {/* Status message */}
        <p className="mb-6 text-[11px] text-neutral-500 tracking-wide">
          {message}
        </p>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          <span className="rai-dot-1 inline-block h-1 w-1 rounded-full bg-neutral-400" />
          <span className="rai-dot-2 inline-block h-1 w-1 rounded-full bg-neutral-400" />
          <span className="rai-dot-3 inline-block h-1 w-1 rounded-full bg-neutral-400" />
        </div>
      </div>
    </>
  );
}

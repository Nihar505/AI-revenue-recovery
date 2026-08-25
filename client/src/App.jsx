import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Overview } from './pages/Overview';
import { Opportunities } from './pages/Opportunities';
import { AgentActivity } from './pages/AgentActivity';
import { PolicyCenter } from './pages/PolicyCenter';
import { Analytics } from './pages/Analytics';
import { Evaluation } from './pages/Evaluation';
import { CaseDetailModal } from './components/CaseDetailModal';
import { Login } from './pages/Login';
import { AuthProvider, authFetch } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function AppContent() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  const showNotice = (message, tone = 'success') => {
    setNotice({ message, tone });
  };

  const fetchStats = async ({ quiet = true } = {}) => {
    try {
      const res = await authFetch('/api/analytics/overview');
      if (!res.ok) throw new Error('Dashboard data could not be refreshed.');
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date());
      if (!quiet) showNotice('Dashboard updated with the latest recovery data.');
      return data;
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      if (!quiet) showNotice(err.message || 'Could not refresh the dashboard.', 'error');
      return null;
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    let eventSource = null;
    let retryTimeout = null;

    async function connectSSE() {
      try {
        // Obtain a short-lived ticket so EventSource can authenticate
        // (browser EventSource cannot set Authorization headers)
        const ticketRes = await authFetch('/api/run-recovery/stream-ticket', { method: 'POST' });
        if (!ticketRes.ok) {
          // Not authenticated yet — do not attempt SSE
          setIsConnected(false);
          return;
        }
        const { ticket } = await ticketRes.json();
        if (!ticket) { setIsConnected(false); return; }

        const url = `/api/run-recovery/stream?ticket=${encodeURIComponent(ticket)}`;
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'CONNECTED') return;

            const newEvent = {
              ...data,
              id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              time: new Date().toLocaleTimeString()
            };

            setEvents(prev => [newEvent, ...prev.slice(0, 150)]);

            if (data.status === 'BATCH_COMPLETE') {
              setIsAgentRunning(false);
              fetchStats();
              showNotice(
                `Recovery run complete — ₹${Number(data.recoveredTotal || 0).toLocaleString('en-IN')} recovered.`,
              );
            }
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource.close();
          // Reconnect after 5 seconds with a fresh ticket
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (_err) {
        setIsConnected(false);
        retryTimeout = setTimeout(connectSSE, 5000);
      }
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  const handleRunAgent = async () => {
    if (isAgentRunning) return;
    setIsAgentRunning(true);
    try {
      const response = await authFetch('/api/run-recovery/batch', {
        method: 'POST',
        body: JSON.stringify({ limit: 15 })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Recovery run could not be started.');

      if (result.count === 0) {
        setIsAgentRunning(false);
        showNotice('Nothing is waiting for recovery. Your queue is clear.');
        return;
      }

      setEvents((previous) => [{
        id: `evt_${Date.now()}_run`,
        agent: 'System',
        status: 'RUN_STARTED',
        message: result.message,
        time: new Date().toLocaleTimeString(),
      }, ...previous]);
      showNotice(`Recovery run started for ${result.count} payments.`);
      navigate('/activity');
    } catch (err) {
      console.error('Failed to trigger recovery run:', err);
      setIsAgentRunning(false);
      showNotice(err.message || 'Recovery run could not be started.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <Sidebar
        isAgentRunning={isAgentRunning}
        onRunAgent={handleRunAgent}
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
      />

      <div className="min-h-screen lg:pl-72 flex flex-col">
        <Header
          isConnected={isConnected}
          onRefresh={() => fetchStats({ quiet: false })}
          lastUpdated={lastUpdated}
          onOpenNavigation={() => setIsNavigationOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={
                <Overview
                  stats={stats}
                  isAgentRunning={isAgentRunning}
                  onRunAgent={handleRunAgent}
                  onOpenCaseModal={setSelectedCaseId}
                  lastUpdated={lastUpdated}
                />
              }
            />
            <Route
              path="/opportunities"
              element={
                <Opportunities
                  onOpenCaseModal={setSelectedCaseId}
                />
              }
            />
            <Route
              path="/activity"
              element={
                <AgentActivity
                  events={events}
                  onClearEvents={() => setEvents([])}
                  isAgentRunning={isAgentRunning}
                  onRunAgent={handleRunAgent}
                  onOpenCaseModal={setSelectedCaseId}
                />
              }
            />
            <Route
              path="/policies"
              element={<PolicyCenter />}
            />
            <Route
              path="/analytics"
              element={<Analytics stats={stats} />}
            />
            <Route
              path="/evaluation"
              element={<Evaluation />}
            />
          </Routes>
        </main>
      </div>

      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onRunSingleCase={() => fetchStats({ quiet: true })}
        />
      )}

      {notice && (
        <div className="fixed right-4 bottom-4 z-[60] max-w-sm">
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${
            notice.tone === 'error'
              ? 'border-neutral-700 bg-neutral-900 text-white'
              : 'border-neutral-700 bg-black text-white'
          }`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${notice.tone === 'error' ? 'bg-neutral-400' : 'bg-white'}`} />
            <p className="flex-1 text-xs leading-snug">{notice.message}</p>
            <button onClick={() => setNotice(null)} className="text-neutral-500 hover:text-white transition text-base leading-none">×</button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

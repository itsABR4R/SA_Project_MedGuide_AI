import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from './api/client.js';
import AppShell from './components/AppShell.jsx';
import ProductTour from './components/ProductTour.jsx';
import SourceModal from './components/SourceModal.jsx';
import Toast from './components/Toast.jsx';
import AuthGate from './features/auth/AuthGate.jsx';
import HealthAssistant from './features/chat/HealthAssistant.jsx';
import CheckHistory from './features/history/CheckHistory.jsx';
import UserProfile from './features/profile/UserProfile.jsx';
import SymptomChecker from './features/symptoms/SymptomChecker.jsx';
import { useI18n } from './i18n/context.js';

export default function App() {
  const { t } = useI18n();
  const [booting, setBooting] = useState(true);
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  const [checks, setChecks] = useState([]);
  const [currentCheck, setCurrentCheck] = useState(null);
  const [reportRevision, setReportRevision] = useState(0);
  const [activeView, setActiveView] = useState('symptom');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [chatSeed, setChatSeed] = useState(null);
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [modalSources, setModalSources] = useState(null);
  const [toast, setToast] = useState(null);
  const bootStartedRef = useRef(false);
  const tourOfferedForRef = useRef(null);

  const showToast = useCallback((message, error = false) => {
    setToast({ id: Date.now(), message, error });
  }, []);
  const closeToast = useCallback(() => setToast(null), []);

  const showSignedOut = useCallback(() => {
    setUser(null);
    setChecks([]);
    setCurrentCheck(null);
    setReportRevision((current) => current + 1);
    setChatSeed(null);
    setShowArchivedChats(false);
    setTourActive(false);
    setActiveView('symptom');
    tourOfferedForRef.current = null;
  }, []);

  const loadChecks = useCallback(async () => {
    const payload = await api('/api/checks');
    setChecks(payload.checks || []);
    return payload.checks || [];
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(showSignedOut);
    return () => setUnauthorizedHandler(null);
  }, [showSignedOut]);

  useEffect(() => {
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;
    (async () => {
      try {
        const payload = await api('/api/me');
        setUser(payload.user);
        setAiConfigured(Boolean(payload.aiConfigured));
        await loadChecks();
      } catch (error) {
        if (error.status !== 401) setAuthError(error.message);
        showSignedOut();
      } finally {
        setBooting(false);
      }
    })();
  }, [loadChecks, showSignedOut]);

  useEffect(() => {
    if (!user || user.onboardingCompleted !== false || tourOfferedForRef.current === user.id) return;
    tourOfferedForRef.current = user.id;
    const frame = window.requestAnimationFrame(() => setTourActive(true));
    return () => window.cancelAnimationFrame(frame);
  }, [user]);

  const navigate = useCallback(
    (view) => {
      if (!['symptom', 'chat', 'history', 'profile'].includes(view)) return;
      setActiveView(view);
      if (view === 'symptom') setShowArchivedChats(false);
      if (view === 'history') loadChecks().catch((error) => showToast(error.message, true));
    },
    [loadChecks, showToast]
  );

  function completeAuthentication(authenticatedUser, configured) {
    setAuthError('');
    setUser(authenticatedUser);
    setAiConfigured(Boolean(configured));
    setCurrentCheck(null);
    setReportRevision((current) => current + 1);
    setActiveView('symptom');
    loadChecks().catch((error) => showToast(error.message, true));
  }

  const finishTour = useCallback(
    async (skipped) => {
      try {
        const payload = await api('/api/onboarding', {
          method: 'PATCH',
          body: JSON.stringify({ completed: true })
        });
        setUser(payload.user);
      } catch (error) {
        showToast(
          t('The tour closed, but its completion could not be saved: {message}', {
            message: error.message
          }),
          true
        );
      } finally {
        setTourActive(false);
        setActiveView('symptom');
        if (!skipped) window.setTimeout(() => document.getElementById('sym-in')?.focus(), 0);
      }
    },
    [showToast, t]
  );

  async function handleCheckCreated(check) {
    setCurrentCheck(check);
    setChatSeed(null);
    setShowArchivedChats(false);
    setReportRevision((current) => current + 1);
    try {
      await loadChecks();
    } catch (error) {
      showToast(
        t('The report was created, but history could not be refreshed: {message}', {
          message: error.message
        }),
        true
      );
    }
  }

  function openHistoryCheck(check, view = 'symptom') {
    setCurrentCheck({ ...check });
    setChatSeed(null);
    setShowArchivedChats(false);
    setReportRevision((current) => current + 1);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteHistoryCheck(check) {
    if (
      !window.confirm(
        t('Delete this symptom check and all its related chats and branches? This cannot be undone.')
      )
    )
      return;
    try {
      await api(`/api/checks/${encodeURIComponent(check.id)}`, { method: 'DELETE' });
      if (currentCheck?.id === check.id) {
        setCurrentCheck(null);
        setChatSeed(null);
        setShowArchivedChats(false);
        setReportRevision((current) => current + 1);
      }
      await loadChecks();
      showToast(t('Symptom check and related chats deleted.'));
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function startNewCheck() {
    setCurrentCheck(null);
    setChatSeed(null);
    setShowArchivedChats(false);
    setReportRevision((current) => current + 1);
  }

  function openOtherChats() {
    setCurrentCheck(null);
    setChatSeed(null);
    setShowArchivedChats(true);
    setActiveView('chat');
  }

  function discussCondition(condition) {
    const points = condition.simpleExplanationPoints;
    const explanation =
      Array.isArray(points) && points.length ? points.join(' ') : condition.simpleExplanation;
    const symptomQuery =
      currentCheck?.symptoms?.trim() ||
      currentCheck?.tags?.join(', ') ||
      t('No written symptom query was saved.');
    const guidanceSummary = currentCheck?.analysis?.summary || t('No symptom-check summary was saved.');
    setChatSeed({
      id: `condition-${Date.now()}`,
      checkId: currentCheck?.id || null,
      label: t('Symptom-check summary'),
      content: [
        t('Your query: {query}', { query: symptomQuery }),
        t('Guidance summary: {summary}', { summary: guidanceSummary }),
        t('Selected pattern: {name}. {explanation}', { name: condition.name, explanation })
      ].join('\n\n')
    });
    setActiveView('chat');
  }

  async function signOut() {
    try {
      await api('/api/logout', { method: 'POST' });
    } catch {
      // Clear the local session view even if the server is temporarily unreachable.
    }
    showSignedOut();
  }

  if (booting) {
    return (
      <div className="boot-screen" role="status">
        <div className="spin" />
        <span>{t('Opening MedGuide AI…')}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthGate initialError={authError} onAuthenticated={completeAuthentication} onToast={showToast} />
        <Toast toast={toast} onClose={closeToast} />
      </>
    );
  }

  return (
    <>
      <AppShell user={user} activeView={activeView} onNavigate={navigate}>
        <SymptomChecker
          active={activeView === 'symptom'}
          aiConfigured={aiConfigured}
          currentCheck={currentCheck}
          revision={reportRevision}
          onCheckCreated={handleCheckCreated}
          onStartNewCheck={startNewCheck}
          onOpenSources={setModalSources}
          onDiscuss={discussCondition}
          onNavigate={navigate}
          onToast={showToast}
          onAiConfigurationError={() => setAiConfigured(false)}
        />
        <HealthAssistant
          key={`${currentCheck?.id || (showArchivedChats ? 'archive' : 'current')}:${reportRevision}`}
          active={activeView === 'chat'}
          check={currentCheck}
          showArchived={showArchivedChats}
          aiConfigured={aiConfigured}
          seed={chatSeed}
          onToast={showToast}
          onAiConfigurationError={() => setAiConfigured(false)}
        />
        <CheckHistory
          active={activeView === 'history'}
          checks={checks}
          onOpen={openHistoryCheck}
          onOpenChats={(check) => openHistoryCheck(check, 'chat')}
          onOpenOtherChats={openOtherChats}
          onDelete={deleteHistoryCheck}
        />
        <UserProfile
          active={activeView === 'profile'}
          user={user}
          checkCount={checks.length}
          onUserUpdated={setUser}
          onSignOut={signOut}
          onToast={showToast}
        />
      </AppShell>
      <ProductTour active={tourActive} onNavigate={navigate} onFinish={finishTour} />
      <SourceModal sources={modalSources} onClose={() => setModalSources(null)} />
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}

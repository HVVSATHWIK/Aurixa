import React, { useEffect, useMemo, useState } from 'react';
import NavBar from './components/NavBar';
import TelemetryPanel from './components/TelemetryPanel';
import Pipeline from './components/Pipeline';
import IntelligencePanel from './components/IntelligencePanel';
import AuditPanel from './components/AuditPanel';
import SideMenu from './components/SideMenu';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import VideoStudioModal from './components/VideoStudioModal';
import { useAurixaAuth } from './hooks/useAurixaAuth';
import { useAurixaRealtimeState } from './hooks/useAurixaRealtimeState';

function App() {
  const {
    user,
    loading,
    authError,
    isConfigured,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOutUser,
  } = useAurixaAuth();

  const {
    state,
    connection,
    analyzeArticle,
    generateAudio,
    getAudioJob,
    askNavigatorQuestion,
    generateVideoBrief,
    getVideoJob,
  } = useAurixaRealtimeState({
    enabled: Boolean(user),
  });

  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [audioPending, setAudioPending] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [audioJob, setAudioJob] = useState(null);
  const [navigatorPending, setNavigatorPending] = useState(false);
  const [navigatorError, setNavigatorError] = useState('');
  const [navigatorResponse, setNavigatorResponse] = useState(null);
  const [videoPending, setVideoPending] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoPackage, setVideoPackage] = useState(null);
  const [videoStudioOpen, setVideoStudioOpen] = useState(false);
  const [activePage, setActivePage] = useState('operations');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [authView, setAuthView] = useState('landing');

  const pageLabelMap = {
    overview: 'Overview',
    operations: 'Operations',
    intelligence: 'Intelligence',
    pipeline: 'Pipeline',
    studio: 'Studio',
    audit: 'Audit Trail',
  };

  const studio = state?.studio || {
    audio_status: '',
    audio_job_id: '',
    audio_message: '',
    audio_url: '',
    video_status: '',
    video_job_id: '',
    video_message: '',
    video_url: '',
  };
  const liveAudioStatus = audioJob?.status || studio.audio_status;
  const liveAudioUrl = audioJob?.audio_url || studio.audio_url;
  const liveAudioMessage = audioJob?.message || studio.audio_message;

  const hasLiveIntelligence = useMemo(
    () => Boolean(state?.intelligence?.generated_at),
    [state]
  );

  const backendAnalysisRunning = useMemo(
    () => String(state?.system_status || '').toUpperCase().includes('RUNNING'),
    [state?.system_status]
  );

  const hasVideoPackage = useMemo(
    () => Boolean(videoPackage?.scenes?.length),
    [videoPackage]
  );

  useEffect(() => {
    if (!user) {
      setAnalysisPending(false);
      setAudioPending(false);
      setAnalysisError('');
      setAudioError('');
      setAudioJob(null);
      setNavigatorPending(false);
      setNavigatorError('');
      setNavigatorResponse(null);
      setVideoPending(false);
      setVideoError('');
      setVideoPackage(null);
      setVideoStudioOpen(false);
      setActivePage('operations');
      setSideMenuOpen(false);
      setAuthView('landing');
    }
  }, [user]);

  useEffect(() => {
    const jobId = studio.audio_job_id || audioJob?.job_id;
    const status = (audioJob?.status || studio.audio_status || '').toLowerCase();

    if (!jobId) {
      return () => {};
    }

    if (!['queued', 'running'].includes(status)) {
      setAudioPending(false);
      return () => {};
    }

    let cancelled = false;
    let timeoutId;

    const tick = async () => {
      try {
        const payload = await getAudioJob(jobId);
        if (cancelled) {
          return;
        }

        const nextJob = payload?.job || null;
        if (nextJob) {
          setAudioJob(nextJob);
          const nextStatus = String(nextJob.status || '').toLowerCase();
          if (nextStatus === 'completed' || nextStatus === 'failed') {
            setAudioPending(false);
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setAudioError(error?.message || 'Unable to fetch audio job status.');
        }
      }

      timeoutId = setTimeout(tick, 3000);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [studio.audio_job_id, studio.audio_status, audioJob?.job_id, audioJob?.status, getAudioJob]);

  useEffect(() => {
    const jobId = videoPackage?.videoJobId;
    const status = String(videoPackage?.videoStatus || '').toLowerCase();

    if (!jobId || !['queued', 'running'].includes(status)) {
      return () => {};
    }

    let cancelled = false;
    let timeoutId;

    const tick = async () => {
      try {
        const payload = await getVideoJob(jobId);
        if (cancelled) {
          return;
        }

        const nextJob = payload?.job || null;
        if (nextJob) {
          setVideoPackage((prev) => {
            if (!prev) {
              return prev;
            }

            return {
              ...prev,
              videoJobId: String(nextJob.job_id || prev.videoJobId || ''),
              videoStatus: String(nextJob.status || prev.videoStatus || 'idle'),
              videoUrl: String(nextJob.video_url || prev.videoUrl || ''),
              providerMessage:
                String(nextJob.message || '').trim() || prev.providerMessage,
            };
          });

          const nextStatus = String(nextJob.status || '').toLowerCase();
          if (nextStatus === 'completed' || nextStatus === 'failed') {
            if (nextStatus === 'failed') {
              setVideoError(String(nextJob.message || 'Video rendering failed.'));
            }
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setVideoError(error?.message || 'Unable to fetch video render status.');
        }
      }

      timeoutId = setTimeout(tick, 3000);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [videoPackage?.videoJobId, videoPackage?.videoStatus, getVideoJob]);

  const handleAnalyzeArticle = async ({ articleUrl, articleText }) => {
    if (analysisPending) {
      return;
    }

    if (backendAnalysisRunning) {
      setAnalysisError('Analysis is already running. Wait for completion before submitting again.');
      return;
    }

    setAnalysisPending(true);
    setAnalysisError('');

    try {
      await analyzeArticle({ articleUrl, articleText });
      setNavigatorResponse(null);
      setNavigatorError('');
      setVideoError('');
    } catch (error) {
      setAnalysisError(error?.message || 'Failed to start analysis pipeline.');
    } finally {
      setAnalysisPending(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (audioPending || !hasLiveIntelligence) {
      return;
    }

    setAudioPending(true);
    setAudioError('');

    try {
      const briefingLines = (state.intelligence?.briefing || [])
        .map((line) => String(line || '').trim())
        .filter(Boolean)
        .slice(0, 3);

      const sentiment = String(state.intelligence?.sentiment || 'NEUTRAL').toUpperCase();
      const confidence = state.telemetry?.confidence_score;
      const risk = state.telemetry?.risk_score;

      const confidenceLine =
        Number.isFinite(Number(confidence))
          ? `Current confidence is ${Number(confidence)} percent.`
          : '';
      const riskLine =
        Number.isFinite(Number(risk))
          ? `Current risk is ${Number(risk)} percent.`
          : '';

      const defaultScript = [
        'AURIXA newsroom briefing.',
        ...briefingLines,
        `Overall sentiment is ${sentiment}.`,
        confidenceLine,
        riskLine,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      const payload = await generateAudio({
        scriptText: defaultScript,
      });

      if (payload?.job) {
        setAudioJob(payload.job);
      }
    } catch (error) {
      setAudioPending(false);
      setAudioError(error?.message || 'Failed to start audio generation.');
    }
  };

  const handleAskNavigatorQuestion = async (questionText) => {
    if (!hasLiveIntelligence || navigatorPending) {
      return;
    }

    setNavigatorPending(true);
    setNavigatorError('');

    try {
      const context = [
        ...(state.intelligence?.briefing || []),
        state.intelligence?.hindi_summary || '',
        state.intelligence?.telugu_summary || '',
      ]
        .join(' ')
        .trim();

      const payload = await askNavigatorQuestion({
        question: questionText,
        context,
      });

      setNavigatorResponse(payload);
    } catch (error) {
      setNavigatorError(error?.message || 'Unable to answer follow-up question.');
    } finally {
      setNavigatorPending(false);
    }
  };

  const buildLocalVideoPackage = () => {
    const briefing = state.intelligence?.briefing || [];
    if (!briefing.length) {
      throw new Error('Run live analysis first to generate a video brief.');
    }

    const entities = (state.intelligence?.entities || [])
      .slice(0, 5)
      .map((entity) => entity.name)
      .filter(Boolean);

    const confidence = Number(state.telemetry?.confidence_score || 0);
    const risk = Number(state.telemetry?.risk_score || 0);
    const recentSignals = (state.audit_trail || [])
      .slice(0, 2)
      .map((event) => event.message)
      .filter(Boolean)
      .join(' ');

    const riskNarrative =
      risk >= 50
        ? 'Editorial risk is elevated. Human review is recommended before publication.'
        : risk >= 25
          ? 'Editorial risk is moderate. Continue compliance checks while publishing updates.'
          : 'Editorial risk is currently low, and rollout readiness is strong.';

    const scenes = [
      {
        title: 'Headline Snapshot',
        body: briefing[0] || 'Latest market update loaded for newsroom playback.',
        visual: 'Hero headline with market pulse line.',
        durationSec: 12,
      },
      {
        title: 'Business Impact',
        body: briefing[1] || briefing[0],
        visual: 'Animated bar chart highlighting impact sectors.',
        durationSec: 14,
      },
      {
        title: 'Key Players',
        body: entities.length
          ? `Primary actors in this story: ${entities.join(', ')}.`
          : 'Entity extraction is still in progress for this story.',
        visual: 'Network map of companies, leaders, and themes.',
        durationSec: 12,
      },
      {
        title: 'Risk and Confidence',
        body: `Confidence is ${confidence} percent and risk is ${risk} percent. ${riskNarrative}`,
        visual: 'Dual gauge for confidence and editorial risk.',
        durationSec: 14,
      },
      {
        title: 'Vernacular Coverage',
        body:
          state.intelligence?.hindi_summary ||
          state.intelligence?.telugu_summary ||
          'Vernacular summaries will appear after language generation completes.',
        visual: 'Hindi and Telugu overlays for multilingual delivery.',
        durationSec: 16,
      },
      {
        title: 'What to Watch Next',
        body:
          recentSignals ||
          'Track policy shifts, competitor moves, and sentiment spikes for the next cycle.',
        visual: 'Timeline with prediction callouts and watchlist markers.',
        durationSec: 12,
      },
    ];

    const narrationScript = scenes
      .map((scene) => `${scene.title}. ${scene.body}`)
      .join(' ')
      .trim();

    return {
      id: Date.now(),
      title: 'AI Video Brief',
      subtitle: state.intelligence?.source_url || 'Generated from local intelligence fallback',
      scenes,
      narrationScript,
      audioUrl: liveAudioUrl || '',
      provider: 'HEURISTIC',
      providerMessage: 'Online provider unavailable. Local storyboard fallback is active.',
      sources: [],
      searchQuery: '',
      videoStatus: 'failed',
      videoJobId: '',
      videoUrl: '',
    };
  };

  const handleBuildVideoBrief = async () => {
    if (!hasLiveIntelligence || videoPending) {
      return;
    }

    setVideoPending(true);
    setVideoError('');

    try {
      const payload = await generateVideoBrief({
        focusTopic: state.intelligence?.briefing?.[0] || '',
        durationSeconds: 90,
        includeWebSearch: true,
        maxSources: 5,
        renderVideo: true,
      });

      const scenes = Array.isArray(payload?.scenes)
        ? payload.scenes
            .map((scene) => ({
              title: String(scene?.title || '').trim(),
              body: String(scene?.body || '').trim(),
              visual: String(scene?.visual || 'Editorial visual').trim(),
              durationSec: Number(scene?.duration_sec ?? scene?.durationSec ?? 12),
            }))
            .filter((scene) => scene.title && scene.body)
        : [];

      if (!scenes.length) {
        throw new Error('Video provider returned an empty scene list.');
      }

      const narrationScript =
        String(payload?.narration_script || payload?.narrationScript || '').trim() ||
        scenes.map((scene) => `${scene.title}. ${scene.body}`).join(' ').trim();

      const nextPackage = {
        id: Date.now(),
        title: String(payload?.title || 'AI Video Brief').trim(),
        subtitle:
          String(payload?.subtitle || '').trim() ||
          state.intelligence?.source_url ||
          'Generated from live article intelligence',
        scenes,
        narrationScript,
        audioUrl: liveAudioUrl || '',
        provider: String(payload?.provider || 'HEURISTIC').trim(),
        providerMessage: String(payload?.provider_message || '').trim(),
        sources: Array.isArray(payload?.sources) ? payload.sources : [],
        searchQuery: String(payload?.search_query || '').trim(),
        videoStatus: String(payload?.video_status || (payload?.video_url ? 'completed' : 'idle')).trim(),
        videoJobId: String(payload?.video_job_id || '').trim(),
        videoUrl: String(payload?.video_url || '').trim(),
      };

      setVideoPackage(nextPackage);
      setVideoStudioOpen(true);
    } catch (error) {
      const fallbackPackage = buildLocalVideoPackage();
      fallbackPackage.providerMessage = `Online video provider unavailable. ${
        error?.message || 'Local storyboard fallback is active.'
      }`;
      setVideoPackage(fallbackPackage);
      setVideoStudioOpen(true);
      setVideoError('Online video provider unavailable. Loaded local storyboard fallback.');
    } finally {
      setVideoPending(false);
    }
  };

  const handleOpenVideoStudio = () => {
    if (hasVideoPackage) {
      setVideoStudioOpen(true);
      return;
    }
    handleBuildVideoBrief();
  };

  const navigateToPage = (pageId) => {
    setActivePage(pageId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSideMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setAuthView('landing');
  };

  const renderActiveView = () => {
    if (activePage === 'operations') {
      return (
        <TelemetryPanel
          state={state}
          connection={connection}
          onAnalyzeArticle={handleAnalyzeArticle}
          analysisPending={analysisPending}
          analysisLocked={backendAnalysisRunning}
          analysisError={analysisError}
          onGenerateAudio={handleGenerateAudio}
          canGenerateAudio={hasLiveIntelligence}
          audioPending={audioPending}
          audioError={audioError}
          audioStatus={liveAudioStatus}
          audioMessage={liveAudioMessage}
          audioUrl={liveAudioUrl}
          onBuildVideoBrief={handleBuildVideoBrief}
          canBuildVideo={hasLiveIntelligence}
          videoPending={videoPending}
          videoError={videoError}
          hasVideoPackage={hasVideoPackage}
          onOpenVideoStudio={handleOpenVideoStudio}
        />
      );
    }

    if (activePage === 'intelligence') {
      return (
        <IntelligencePanel
          state={state}
          onAskNavigatorQuestion={handleAskNavigatorQuestion}
          navigatorPending={navigatorPending}
          navigatorError={navigatorError}
          navigatorResponse={navigatorResponse}
        />
      );
    }

    if (activePage === 'pipeline') {
      return (
        <section className="space-y-4">
          <Pipeline state={state} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="deck-card p-4">
              <div className="section-kicker mb-2">Current Stage</div>
              <p className="text-lg font-semibold text-slate-900">
                {state.pipeline?.active_node || 'INGESTION'}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Completed Nodes: {(state.pipeline?.completed_nodes || []).join(', ') || 'None yet'}
              </p>
            </div>

            <div className="deck-card p-4">
              <div className="section-kicker mb-2">Recent Activity</div>
              <div className="space-y-2">
                {(state.audit_trail || []).slice(0, 4).map((event, index) => (
                  <div
                    key={`${event.timestamp || 'event'}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {event.agent || 'SYSTEM'}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">{event.message}</p>
                  </div>
                ))}
                {!state.audit_trail?.length && (
                  <p className="text-sm text-slate-500">Pipeline activity appears after the first run.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (activePage === 'studio') {
      return (
        <section className="space-y-4">
          <div className="deck-card p-5">
            <div className="section-kicker mb-2">Studio Workspace</div>
            <h2 className="headline-font text-2xl text-slate-900">Audio and Video Builder</h2>
            <p className="mt-2 text-sm text-slate-600">
              Build a short video brief from live intelligence and open the player to review scenes.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateAudio}
                disabled={!hasLiveIntelligence || audioPending}
                className="rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {audioPending ? 'Generating Audio...' : 'Generate Audio'}
              </button>
              <button
                type="button"
                onClick={handleBuildVideoBrief}
                disabled={!hasLiveIntelligence || videoPending}
                className="rounded-xl border border-amber-700 bg-amber-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {videoPending ? 'Building...' : 'Build Video Brief'}
              </button>
              <button
                type="button"
                onClick={handleOpenVideoStudio}
                disabled={!hasVideoPackage && !hasLiveIntelligence}
                className="rounded-xl border border-rose-700 bg-rose-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open Studio Player
              </button>
              {videoPackage?.videoUrl ? (
                <a
                  href={videoPackage.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-emerald-700 bg-emerald-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
                >
                  Open Rendered MP4
                </a>
              ) : null}
            </div>

            {(audioError || videoError) && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {audioError || videoError}
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="section-kicker mb-1">Audio Status</div>
                <div className="text-sm font-semibold uppercase text-slate-800">{liveAudioStatus || 'idle'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="section-kicker mb-1">Scene Count</div>
                <div className="text-sm font-semibold uppercase text-slate-800">
                  {videoPackage?.scenes?.length || 0}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="section-kicker mb-1">Generator</div>
                <div className="text-sm font-semibold uppercase text-slate-800">
                  {videoPackage?.provider || state.intelligence?.provider || 'PENDING'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="section-kicker mb-1">Video Status</div>
                <div className="text-sm font-semibold uppercase text-slate-800">
                  {videoPackage?.videoStatus || 'idle'}
                </div>
              </div>
            </div>
          </div>

          {hasVideoPackage && (
            <div className="deck-card p-5">
              <div className="section-kicker mb-2">Latest Storyboard</div>
              <h3 className="headline-font text-xl text-slate-900">{videoPackage?.title || 'AI Video Brief'}</h3>
              <p className="mt-1 text-sm text-slate-600">{videoPackage?.subtitle}</p>

              <div className="mt-4 space-y-2">
                {(videoPackage?.scenes || []).slice(0, 4).map((scene, index) => (
                  <div key={`${scene.title || 'scene'}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Scene {index + 1}
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{scene.title}</p>
                    <p className="text-xs text-slate-600">{scene.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videoPackage?.sources?.length ? (
            <div className="deck-card p-5">
              <div className="section-kicker mb-2">Referenced Sources</div>
              <div className="space-y-2">
                {videoPackage.sources.slice(0, 5).map((source, index) => (
                  <a
                    key={`${source.url || source.title || 'source'}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
                  >
                    {source.title || source.url}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      );
    }

    if (activePage === 'audit') {
      return <AuditPanel state={state} />;
    }

    if (activePage === 'overview') {
      return (
        <section className="space-y-4">
          <div className="deck-card p-5 md:p-6">
            <div className="section-kicker mb-2">Command Snapshot</div>
            <h2 className="headline-font text-3xl text-slate-900">Focused workspace, one mission at a time.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Use the side navigation to switch contexts. Operations handles intake, Intelligence handles understanding,
              Studio handles output packaging, and Audit captures a transparent trace.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="section-kicker mb-1">Pipeline Stage</div>
                <div className="text-lg font-semibold text-slate-900">{state.pipeline?.active_node || 'INGESTION'}</div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="section-kicker mb-1">Confidence</div>
                <div className="text-lg font-semibold text-slate-900">{state.telemetry?.confidence_score ?? 0}%</div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="section-kicker mb-1">Risk</div>
                <div className="text-lg font-semibold text-slate-900">{state.telemetry?.risk_score ?? 0}%</div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="section-kicker mb-1">Extraction Provider</div>
                <div className="text-lg font-semibold text-slate-900">{state.intelligence?.provider || 'PENDING'}</div>
              </article>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="deck-card p-5">
              <div className="section-kicker mb-2">Latest Briefing</div>
              <div className="space-y-2">
                {(state.intelligence?.briefing || []).slice(0, 4).map((line, index) => (
                  <div key={`${line}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    {line}
                  </div>
                ))}
                {!state.intelligence?.briefing?.length && (
                  <p className="text-sm text-slate-500">Run your first analysis from Operations to populate briefing items.</p>
                )}
              </div>
            </div>

            <div className="deck-card p-5">
              <div className="section-kicker mb-2">Quick Routes</div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigateToPage('operations')}
                  className="w-full rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
                >
                  Open Operations Console
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPage('intelligence')}
                  className="w-full rounded-xl border border-amber-700 bg-amber-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
                >
                  Open Intelligence Desk
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPage('studio')}
                  className="w-full rounded-xl border border-rose-700 bg-rose-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
                >
                  Open Studio
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPage('audit')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
                >
                  Open Audit Trail
                </button>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                System status: <span className="font-semibold text-slate-800">{state.system_status}</span>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-4">
        <div className="deck-card p-5">
          <div className="section-kicker mb-2">Workspace</div>
          <p className="text-sm text-slate-600">Select a page from the menu to continue.</p>
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="aurixa-paper-bg flex min-h-screen items-center justify-center px-4">
        <div className="glass-card rounded-2xl border border-white/80 px-6 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 animate-pulse">
          Bootstrapping AURIXA
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'landing') {
      return (
        <LandingPage
          onLogin={() => setAuthView('signin')}
          onSignup={() => setAuthView('signup')}
        />
      );
    }

    return (
      <AuthScreen
        authError={authError}
        isConfigured={isConfigured}
        onEmailSignIn={signInWithEmail}
        onEmailSignUp={signUpWithEmail}
        onGoogleSignIn={signInWithGoogle}
        initialMode={authView}
        onBack={() => setAuthView('landing')}
      />
    );
  }

  return (
    <div className="aurixa-paper-bg flex min-h-screen w-full flex-col font-sans text-slate-800">
      <NavBar
        state={state}
        connection={connection}
        user={user}
        onSignOut={handleSignOut}
        activePageLabel={pageLabelMap[activePage] || 'Overview'}
        onMenuToggle={() => setSideMenuOpen((prev) => !prev)}
      />

      <div className="flex min-h-0 flex-1 px-3 pb-3 pt-3 sm:px-4 md:px-6">
        <div className="glass-card flex min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/70">
          <SideMenu
            activePage={activePage}
            onSelectPage={navigateToPage}
            open={sideMenuOpen}
            onClose={() => setSideMenuOpen(false)}
            state={state}
          />

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
            {renderActiveView()}
          </main>
        </div>
      </div>

      <VideoStudioModal
        open={videoStudioOpen}
        videoPackage={videoPackage}
        onClose={() => setVideoStudioOpen(false)}
      />
    </div>
  );
}

export default App;

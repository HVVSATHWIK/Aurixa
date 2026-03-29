import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mockState } from '../data/mockState';

const streamMode = import.meta.env.VITE_AURIXA_STREAM_MODE || 'auto';
const wsUrl = import.meta.env.VITE_AURIXA_WS_URL || '';
const pollUrl = import.meta.env.VITE_AURIXA_POLL_URL || '';
const analyzeUrl = import.meta.env.VITE_AURIXA_ANALYZE_URL || '';
const audioUrl = import.meta.env.VITE_AURIXA_AUDIO_URL || '';
const audioJobBaseUrl = import.meta.env.VITE_AURIXA_AUDIO_JOB_BASE_URL || '';
const navigatorQaUrl = import.meta.env.VITE_AURIXA_NAVIGATOR_QA_URL || '';
const videoBriefUrl = import.meta.env.VITE_AURIXA_VIDEO_BRIEF_URL || '';
const videoJobBaseUrl = import.meta.env.VITE_AURIXA_VIDEO_JOB_BASE_URL || '';
const backendOriginOverride = import.meta.env.VITE_AURIXA_BACKEND_ORIGIN || '';
const pollIntervalMs = Number(import.meta.env.VITE_AURIXA_POLL_INTERVAL_MS || 2000);
const reconnectMs = Number(import.meta.env.VITE_AURIXA_WS_RECONNECT_MS || 2000);
const simulationIntervalMs = Number(import.meta.env.VITE_AURIXA_SIMULATION_INTERVAL_MS || 2200);

const pipelineNodes = ['INGESTION', 'DRAFTING', 'COMPLIANCE', 'EDITOR', 'APPROVAL'];

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function toWebSocketOrigin(httpOrigin) {
  const normalized = normalizeOrigin(httpOrigin);
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('https://')) {
    return `wss://${normalized.slice('https://'.length)}`;
  }

  if (normalized.startsWith('http://')) {
    return `ws://${normalized.slice('http://'.length)}`;
  }

  return normalized;
}

function detectBackendOrigin() {
  if (backendOriginOverride) {
    return normalizeOrigin(backendOriginOverride);
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }

  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal && String(port) !== '8000') {
    return `${protocol}//${hostname}:8000`;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}

const backendOrigin = detectBackendOrigin();
const hasExplicitStreamEndpoints = Boolean(wsUrl || pollUrl);

const resolvedPollUrl = pollUrl || `${backendOrigin}/api/state`;
const resolvedAnalyzeUrl = analyzeUrl || `${backendOrigin}/api/analyze`;
const resolvedAudioUrl = audioUrl || `${backendOrigin}/api/generate-audio`;
const resolvedAudioJobBaseUrl = audioJobBaseUrl || `${backendOrigin}/api/audio-jobs`;
const resolvedNavigatorQaUrl = navigatorQaUrl || `${backendOrigin}/api/navigator-question`;
const resolvedVideoBriefUrl = videoBriefUrl || `${backendOrigin}/api/generate-video-brief`;
const resolvedVideoJobBaseUrl = videoJobBaseUrl || `${backendOrigin}/api/video-jobs`;
const resolvedWsUrl = wsUrl || `${toWebSocketOrigin(backendOrigin)}/ws/state`;

function resolveHttpEndpoint(pathname, explicitUrl = '') {
  if (explicitUrl) {
    return explicitUrl;
  }

  if (resolvedPollUrl) {
    const base = new URL(resolvedPollUrl);
    return new URL(pathname, `${base.origin}/`).toString();
  }

  if (resolvedWsUrl) {
    const protocol = resolvedWsUrl.startsWith('wss://') ? 'https://' : 'http://';
    const withoutProtocol = resolvedWsUrl.replace(/^wss?:\/\//, '');
    const host = withoutProtocol.split('/')[0];
    return `${protocol}${host}${pathname}`;
  }

  return '';
}

function normalizeState(candidate, fallback) {
  const source = candidate && typeof candidate === 'object' ? candidate : fallback;

  const entities = Array.isArray(source.intelligence?.entities)
    ? source.intelligence.entities
        .map((entity) => {
          if (!entity) {
            return null;
          }

          if (typeof entity === 'string') {
            return { name: entity, type: 'OTHER' };
          }

          return {
            name: String(entity.name || '').trim(),
            type: String(entity.type || 'OTHER').trim(),
          };
        })
        .filter((entity) => entity?.name)
    : fallback.intelligence.entities;

  return {
    task_id: source.task_id || fallback.task_id,
    system_status: source.system_status || fallback.system_status,
    iteration: Number(source.iteration ?? fallback.iteration),
    retry_count: Number(source.retry_count ?? fallback.retry_count),
    telemetry: {
      raw_input: source.telemetry?.raw_input || fallback.telemetry.raw_input,
      draft_version: source.telemetry?.draft_version || fallback.telemetry.draft_version,
      status: source.telemetry?.status || fallback.telemetry.status,
      confidence_score: Number(
        source.telemetry?.confidence_score ?? fallback.telemetry.confidence_score
      ),
      risk_score: Number(source.telemetry?.risk_score ?? fallback.telemetry.risk_score),
    },
    pipeline: {
      active_node: source.pipeline?.active_node || fallback.pipeline.active_node,
      completed_nodes: Array.isArray(source.pipeline?.completed_nodes)
        ? source.pipeline.completed_nodes
        : fallback.pipeline.completed_nodes,
    },
    intelligence: {
      violations: Array.isArray(source.intelligence?.violations)
        ? source.intelligence.violations
        : fallback.intelligence.violations,
      ruleset: source.intelligence?.ruleset || fallback.intelligence.ruleset,
      briefing: Array.isArray(source.intelligence?.briefing)
        ? source.intelligence.briefing
        : fallback.intelligence.briefing,
      entities,
      provider: source.intelligence?.provider || fallback.intelligence.provider || 'PENDING',
      provider_message:
        source.intelligence?.provider_message ||
        fallback.intelligence.provider_message ||
        'Awaiting first analysis run.',
      sentiment:
        source.intelligence?.sentiment || fallback.intelligence.sentiment,
      hindi_summary:
        source.intelligence?.hindi_summary || fallback.intelligence.hindi_summary,
      telugu_summary:
        source.intelligence?.telugu_summary || fallback.intelligence.telugu_summary,
      source_url: source.intelligence?.source_url || fallback.intelligence.source_url,
      generated_at:
        source.intelligence?.generated_at || fallback.intelligence.generated_at,
    },
    audit_trail: Array.isArray(source.audit_trail) ? source.audit_trail : fallback.audit_trail,
    studio: {
      audio_status: source.studio?.audio_status || fallback.studio.audio_status,
      audio_job_id: source.studio?.audio_job_id || fallback.studio.audio_job_id,
      audio_message: source.studio?.audio_message || fallback.studio.audio_message,
      audio_url: source.studio?.audio_url || fallback.studio.audio_url,
      video_status: source.studio?.video_status || fallback.studio.video_status,
      video_job_id: source.studio?.video_job_id || fallback.studio.video_job_id,
      video_message: source.studio?.video_message || fallback.studio.video_message,
      video_url: source.studio?.video_url || fallback.studio.video_url,
    },
  };
}

function extractStatePayload(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  if (message.state && typeof message.state === 'object') {
    return message.state;
  }

  if (message.payload && typeof message.payload === 'object') {
    return message.payload;
  }

  return message;
}

function nowIsoTs() {
  return new Date().toISOString();
}

function nowHmsTs() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function buildLocalBriefing(sourceText = '') {
  const normalized = String(sourceText || '').trim();
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24);

  const briefing = [
    sentences[0] || 'Local fallback extracted the latest available source input.',
    sentences[1] || 'Detailed model extraction is unavailable while backend connectivity is down.',
    sentences[2] || 'Retry when backend service is online for full multilingual intelligence output.',
  ];

  return briefing.slice(0, 3);
}

function buildLocalEntities(sourceText = '') {
  const matches = String(sourceText || '').match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,}){0,2}\b/g) || [];
  const unique = [...new Set(matches)].slice(0, 5);
  return unique.map((name) => ({ name, type: 'OTHER' }));
}

function buildLocalNavigatorPayload(question, intelligence = {}, rawInput = '') {
  const trimmed = String(question || '').trim();
  const briefing = Array.isArray(intelligence?.briefing) ? intelligence.briefing : [];
  const entities = Array.isArray(intelligence?.entities) ? intelligence.entities : [];
  const keyEntities = entities
    .map((entry) => (entry && typeof entry === 'object' ? entry.name : String(entry || '')))
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const answerParts = [];
  if (briefing.length) {
    answerParts.push(`Current summary: ${briefing.slice(0, 2).join(' ')}`);
  }
  if (keyEntities) {
    answerParts.push(`Key entities in focus: ${keyEntities}.`);
  }
  if (!briefing.length && rawInput) {
    answerParts.push('Using local fallback context from the latest source input.');
  }
  if (!answerParts.length) {
    answerParts.push('Local fallback has limited context. Run analysis again when backend is available.');
  }

  return {
    question: trimmed,
    answer: answerParts.join(' '),
    follow_ups: [
      'What changed most since the previous update?',
      'Which entity should we watch first?',
      'What is the immediate business implication?',
    ],
    generated_at: nowIsoTs(),
  };
}

export function useAurixaRealtimeState({ enabled = true } = {}) {
  const [state, setState] = useState(mockState);
  const [connection, setConnection] = useState({
    transport: 'simulated',
    status: 'idle',
    error: '',
    lastUpdatedAt: '',
  });

  const teardownRef = useRef(() => {});
  const localAudioJobsRef = useRef({});

  const toConnectivityError = useCallback((error, endpoint) => {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('failed to fetch') || message.includes('networkerror')) {
      return new Error(
        `Backend is unreachable at ${endpoint}. Start backend with npm run backend:dev and retry.`
      );
    }
    return error;
  }, []);

  const isConnectivityIssue = useCallback((error) => {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('backend is unreachable') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('network request failed')
    );
  }, []);

  const markLocalFallbackConnection = useCallback((reason) => {
    setConnection((prev) => ({
      ...prev,
      transport: 'simulated',
      status: 'simulated',
      error: reason,
      lastUpdatedAt: nowIsoTs(),
    }));
  }, []);

  const runLocalAnalysisFallback = useCallback(
    ({ articleUrl = '', articleText = '' }) => {
      const sourceText = String(articleText || articleUrl || '').trim();
      const briefing = buildLocalBriefing(sourceText);
      const entities = buildLocalEntities(sourceText);
      const generatedAt = nowIsoTs();
      const nextIteration = Number(state?.iteration || 0) + 1;
      const fallbackMessage = 'Backend is offline. Local fallback analysis completed in-browser.';

      setState((prev) =>
        normalizeState(
          {
            ...prev,
            system_status: 'LOCAL FALLBACK READY',
            iteration: nextIteration,
            telemetry: {
              ...prev.telemetry,
              raw_input: sourceText || 'Local fallback used because backend is unreachable.',
              draft_version: `v${nextIteration}.0`,
              status: 'Approved',
              confidence_score: 68,
              risk_score: 34,
            },
            pipeline: {
              active_node: 'APPROVAL',
              completed_nodes: ['INGESTION', 'DRAFTING', 'COMPLIANCE', 'EDITOR'],
            },
            intelligence: {
              ...prev.intelligence,
              violations: [],
              ruleset: 'Browser fallback extraction protocol v1',
              briefing,
              entities,
              sentiment: 'NEUTRAL',
              hindi_summary: 'Hindi summary is unavailable in local fallback mode.',
              telugu_summary: 'Telugu summary is unavailable in local fallback mode.',
              source_url: articleUrl || prev.intelligence?.source_url || '',
              generated_at: generatedAt,
              provider: 'HEURISTIC',
              provider_message: fallbackMessage,
            },
            audit_trail: [
              {
                timestamp: nowHmsTs(),
                agent: 'SYSTEM',
                message: fallbackMessage,
              },
              ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : []),
            ].slice(0, 12),
          },
          mockState
        )
      );

      markLocalFallbackConnection('Backend offline. Local fallback mode is active.');

      return {
        status: 'simulated',
        message: fallbackMessage,
      };
    },
    [markLocalFallbackConnection, state?.iteration]
  );

  const runLocalAudioFallback = useCallback(() => {
    const startedAt = nowIsoTs();
    const jobId = `local-${Date.now()}`;
    const briefing = Array.isArray(state?.intelligence?.briefing)
      ? state.intelligence.briefing
          .map((line) => String(line || '').trim())
          .filter(Boolean)
          .slice(0, 2)
      : [];
    const scriptPreview = briefing.join(' ');
    const job = {
      job_id: jobId,
      status: 'completed',
      message: scriptPreview
        ? `Backend offline. Static demo audio is disabled to avoid irrelevance. Script prepared from live briefing: ${scriptPreview}`
        : 'Backend offline. Static demo audio is disabled to avoid irrelevance. Build a video brief and use Browser Narration in Studio.',
      audio_url: '',
      started_at: startedAt,
      completed_at: startedAt,
    };

    localAudioJobsRef.current[jobId] = job;

    setState((prev) =>
      normalizeState(
        {
          ...prev,
          studio: {
            ...prev.studio,
            audio_status: 'completed',
            audio_job_id: jobId,
            audio_message: job.message,
            audio_url: job.audio_url,
          },
          audit_trail: [
            {
              timestamp: nowHmsTs(),
              agent: 'AGENT:STUDIO',
              message: job.message,
            },
            ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : []),
          ].slice(0, 12),
        },
        mockState
      )
    );

    markLocalFallbackConnection('Backend offline. Relevant audio fallback message is active.');

    return {
      status: 'accepted',
      job_id: jobId,
      job,
    };
  }, [markLocalFallbackConnection, state?.intelligence?.briefing]);

  const runLocalNavigatorFallback = useCallback(
    ({ question = '' }) => {
      const payload = buildLocalNavigatorPayload(
        question,
        state?.intelligence || {},
        state?.telemetry?.raw_input || ''
      );

      setState((prev) =>
        normalizeState(
          {
            ...prev,
            audit_trail: [
              {
                timestamp: nowHmsTs(),
                agent: 'AGENT:NAVIGATOR',
                message: 'Answered follow-up question in local fallback mode.',
              },
              ...(Array.isArray(prev.audit_trail) ? prev.audit_trail : []),
            ].slice(0, 12),
          },
          mockState
        )
      );

      markLocalFallbackConnection('Backend offline. Local navigator fallback is active.');

      return payload;
    },
    [markLocalFallbackConnection, state?.intelligence, state?.telemetry?.raw_input]
  );

  const analyzeArticle = useCallback(async ({ articleUrl = '', articleText = '' }) => {
    const endpoint = resolveHttpEndpoint('/api/analyze', resolvedAnalyzeUrl);
    if (!endpoint) {
      throw new Error('Analyze endpoint is not configured.');
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_url: articleUrl || undefined,
          article_text: articleText || undefined,
        }),
      });
    } catch (error) {
      const normalizedError = toConnectivityError(error, endpoint);
      if (isConnectivityIssue(normalizedError)) {
        return runLocalAnalysisFallback({ articleUrl, articleText });
      }
      throw normalizedError;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Failed to start analysis.';
      throw new Error(message);
    }

    return payload;
  }, [isConnectivityIssue, runLocalAnalysisFallback, toConnectivityError]);

  const generateAudio = useCallback(async ({ scriptText = '' } = {}) => {
    const endpoint = resolveHttpEndpoint('/api/generate-audio', resolvedAudioUrl);
    if (!endpoint) {
      throw new Error('Audio endpoint is not configured.');
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script_text: scriptText || undefined,
        }),
      });
    } catch (error) {
      const normalizedError = toConnectivityError(error, endpoint);
      if (isConnectivityIssue(normalizedError)) {
        return runLocalAudioFallback();
      }
      throw normalizedError;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Failed to start audio generation.';
      throw new Error(message);
    }

    return payload;
  }, [isConnectivityIssue, runLocalAudioFallback, toConnectivityError]);

  const getAudioJob = useCallback(async (jobId) => {
    if (!jobId) {
      throw new Error('jobId is required to fetch audio job state.');
    }

    const localJob = localAudioJobsRef.current[jobId];
    if (localJob) {
      return { job: localJob };
    }

    const explicitUrl = resolvedAudioJobBaseUrl
      ? `${resolvedAudioJobBaseUrl.replace(/\/$/, '')}/${jobId}`
      : '';
    const endpoint = resolveHttpEndpoint(`/api/audio-jobs/${jobId}`, explicitUrl);
    if (!endpoint) {
      throw new Error('Audio job endpoint is not configured.');
    }

    let response;
    try {
      response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      throw toConnectivityError(error, endpoint);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Failed to fetch audio job.';
      throw new Error(message);
    }

    return payload;
  }, [toConnectivityError]);

  const askNavigatorQuestion = useCallback(async ({ question = '', context = '' } = {}) => {
    const endpoint = resolveHttpEndpoint('/api/navigator-question', resolvedNavigatorQaUrl);
    if (!endpoint) {
      throw new Error('Navigator question endpoint is not configured.');
    }

    const trimmed = String(question || '').trim();
    if (trimmed.length < 3) {
      throw new Error('Question must be at least 3 characters long.');
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmed,
          context: context || undefined,
        }),
      });
    } catch (error) {
      const normalizedError = toConnectivityError(error, endpoint);
      if (isConnectivityIssue(normalizedError)) {
        return runLocalNavigatorFallback({ question: trimmed });
      }
      throw normalizedError;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Failed to answer navigator question.';
      throw new Error(message);
    }

    return payload;
  }, [isConnectivityIssue, runLocalNavigatorFallback, toConnectivityError]);

  const generateVideoBrief = useCallback(async ({
    focusTopic = '',
    durationSeconds = 90,
    includeWebSearch = true,
    maxSources = 5,
    renderVideo = true,
  } = {}) => {
    const endpoint = resolveHttpEndpoint('/api/generate-video-brief', resolvedVideoBriefUrl);
    if (!endpoint) {
      throw new Error('Video brief endpoint is not configured.');
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          focus_topic: String(focusTopic || '').trim() || undefined,
          duration_seconds: Number(durationSeconds || 90),
          include_web_search: Boolean(includeWebSearch),
          max_sources: Number(maxSources || 5),
          render_video: Boolean(renderVideo),
        }),
      });
    } catch (error) {
      throw toConnectivityError(error, endpoint);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Failed to generate video brief.';
      throw new Error(message);
    }

    return payload;
  }, [toConnectivityError]);

  const getVideoJob = useCallback(async (jobId) => {
    if (!jobId) {
      throw new Error('jobId is required to fetch video job state.');
    }

    const explicitUrl = resolvedVideoJobBaseUrl
      ? `${resolvedVideoJobBaseUrl.replace(/\/$/, '')}/${jobId}`
      : '';
    const endpoint = resolveHttpEndpoint(`/api/video-jobs/${jobId}`, explicitUrl);
    if (!endpoint) {
      throw new Error('Video job endpoint is not configured.');
    }

    let response;
    try {
      response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      throw toConnectivityError(error, endpoint);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Failed to fetch video job status.';
      throw new Error(message);
    }

    return payload;
  }, [toConnectivityError]);

  useEffect(() => {
    if (!enabled) {
      setState(mockState);
      setConnection({
        transport: 'simulated',
        status: 'idle',
        error: '',
        lastUpdatedAt: '',
      });

      return () => {};
    }

    let stopped = false;
    let ws;
    let pollTimeout;
    let reconnectTimeout;
    let simulationInterval;
    let simulationStep = 0;
    let pollingFailureCount = 0;

    const touchLastUpdated = () => new Date().toISOString();

    const applyState = (nextState, transport) => {
      setState(normalizeState(nextState, mockState));
      setConnection((prev) => ({
        ...prev,
        transport,
        status: 'connected',
        error: '',
        lastUpdatedAt: touchLastUpdated(),
      }));
    };

    const setError = (transport, errorMessage) => {
      setConnection((prev) => ({
        ...prev,
        transport,
        status: 'degraded',
        error: errorMessage,
      }));
    };

    const stopPolling = () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };

    const stopSocket = () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };

    const stopSimulation = () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };

    const startSimulation = () => {
      setConnection((prev) => ({
        ...prev,
        transport: 'simulated',
        status: 'simulated',
        error: '',
      }));

      const nextTimestamp = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
      };

      simulationInterval = setInterval(() => {
        if (stopped) {
          return;
        }

        simulationStep = (simulationStep + 1) % pipelineNodes.length;
        const activeNode = pipelineNodes[simulationStep];
        const completedNodes = pipelineNodes.slice(0, Math.max(simulationStep, 0));

        setState((prev) => {
          const nextIteration =
            activeNode === 'INGESTION' ? prev.iteration + 1 : prev.iteration;
          const nextConfidence = Math.min(
            99.9,
            Number((prev.telemetry.confidence_score + 0.4).toFixed(1))
          );
          const nextRisk = Math.max(
            6.8,
            Number((prev.telemetry.risk_score - 0.3).toFixed(1))
          );

          const stepStatus = {
            INGESTION: 'Processing',
            DRAFTING: 'Drafting',
            COMPLIANCE: 'Validation',
            EDITOR: 'Auto-correction',
            APPROVAL: 'Processing',
          };

          const nextLog = {
            timestamp: nextTimestamp(),
            agent: activeNode === 'APPROVAL' ? 'AGENT:APPROVAL' : `AGENT:${activeNode}`,
            message:
              activeNode === 'COMPLIANCE'
                ? 'Scanning for high-severity risk indicators...'
                : activeNode === 'EDITOR'
                  ? 'Applying targeted fixes to flagged sections.'
                  : activeNode === 'APPROVAL'
                    ? 'Final quality checks passed for distribution.'
                    : `${activeNode} stage actively processing enterprise content.`,
          };

          return {
            ...prev,
            iteration: nextIteration,
            telemetry: {
              ...prev.telemetry,
              status: stepStatus[activeNode] || prev.telemetry.status,
              confidence_score: nextConfidence,
              risk_score: nextRisk,
            },
            pipeline: {
              ...prev.pipeline,
              active_node: activeNode,
              completed_nodes: completedNodes,
            },
            intelligence: {
              ...prev.intelligence,
              violations: prev.intelligence.violations.map((violation) => {
                if (violation.id === 'v_02' && activeNode === 'EDITOR') {
                  return {
                    ...violation,
                    resolution_status: 'AUTO-CORRECTION COMPLETE',
                  };
                }

                if (violation.id === 'v_02' && activeNode === 'COMPLIANCE') {
                  return {
                    ...violation,
                    resolution_status: 'PENDING',
                  };
                }

                return violation;
              }),
            },
            audit_trail: [nextLog, ...prev.audit_trail].slice(0, 8),
          };
        });

        setConnection((prev) => ({
          ...prev,
          transport: 'simulated',
          status: 'simulated',
          error: '',
          lastUpdatedAt: touchLastUpdated(),
        }));
      }, simulationIntervalMs);
    };

    const startPolling = () => {
      if (!resolvedPollUrl) {
        startSimulation();
        return;
      }

      const tick = async () => {
        if (stopped) {
          return;
        }

        setConnection((prev) => ({
          ...prev,
          transport: 'polling',
          status: prev.lastUpdatedAt ? prev.status : 'connecting',
        }));

        try {
          const response = await fetch(resolvedPollUrl, {
            headers: {
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Polling failed with HTTP ${response.status}`);
          }

          const data = await response.json();
          pollingFailureCount = 0;
          applyState(extractStatePayload(data), 'polling');
        } catch (error) {
          pollingFailureCount += 1;
          setError('polling', error.message || 'Polling transport failed.');

          if (!hasExplicitStreamEndpoints && pollingFailureCount >= 2) {
            stopPolling();
            startSimulation();
            return;
          }
        } finally {
          pollTimeout = setTimeout(tick, pollIntervalMs);
        }
      };

      tick();
    };

    const startSocket = () => {
      if (!resolvedWsUrl) {
        if (streamMode === 'auto') {
          if (resolvedPollUrl) {
            startPolling();
          } else {
            startSimulation();
          }
          return;
        }

        startSimulation();
        return;
      }

      setConnection((prev) => ({
        ...prev,
        transport: 'websocket',
        status: 'connecting',
      }));

      try {
        ws = new WebSocket(resolvedWsUrl);
      } catch (error) {
        setError('websocket', error.message || 'Unable to initialize websocket transport.');
        if (streamMode === 'auto') {
          if (resolvedPollUrl) {
            startPolling();
          } else {
            startSimulation();
          }
          return;
        }
      }

      if (!ws) {
        return;
      }

      ws.onopen = () => {
        if (stopped) {
          return;
        }

        setConnection((prev) => ({
          ...prev,
          transport: 'websocket',
          status: 'connected',
          error: '',
        }));
      };

      ws.onmessage = (event) => {
        if (stopped) {
          return;
        }

        try {
          const parsed = JSON.parse(event.data);
          applyState(extractStatePayload(parsed), 'websocket');
        } catch {
          setError('websocket', 'Received non-JSON payload from websocket.');
        }
      };

      ws.onerror = () => {
        if (stopped) {
          return;
        }

        setError('websocket', 'Websocket transport error.');
      };

      ws.onclose = () => {
        if (stopped) {
          return;
        }

        if (streamMode === 'auto') {
          if (resolvedPollUrl) {
            startPolling();
          } else {
            startSimulation();
          }
          return;
        }

        reconnectTimeout = setTimeout(() => {
          startSocket();
        }, reconnectMs);
      };
    };

    if (streamMode === 'polling') {
      startPolling();
    } else if (streamMode === 'websocket') {
      startSocket();
    } else {
      startSocket();
    }

    teardownRef.current = () => {
      stopped = true;
      stopSocket();
      stopPolling();
      stopSimulation();
    };

    return () => {
      teardownRef.current();
    };
  }, [enabled]);

  return useMemo(
    () => ({
      state,
      connection,
      analyzeArticle,
      generateAudio,
      getAudioJob,
      askNavigatorQuestion,
      generateVideoBrief,
      getVideoJob,
    }),
    [
      state,
      connection,
      analyzeArticle,
      generateAudio,
      getAudioJob,
      askNavigatorQuestion,
      generateVideoBrief,
      getVideoJob,
    ]
  );
}

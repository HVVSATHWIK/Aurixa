import { useEffect, useMemo, useRef, useState } from 'react';
import { mockState } from '../data/mockState';

const streamMode = import.meta.env.VITE_AURIXA_STREAM_MODE || 'auto';
const wsUrl = import.meta.env.VITE_AURIXA_WS_URL || '';
const pollUrl = import.meta.env.VITE_AURIXA_POLL_URL || '';
const pollIntervalMs = Number(import.meta.env.VITE_AURIXA_POLL_INTERVAL_MS || 2000);
const reconnectMs = Number(import.meta.env.VITE_AURIXA_WS_RECONNECT_MS || 2000);
const simulationIntervalMs = Number(import.meta.env.VITE_AURIXA_SIMULATION_INTERVAL_MS || 2200);

const pipelineNodes = ['INGESTION', 'DRAFTING', 'COMPLIANCE', 'EDITOR', 'APPROVAL'];

function normalizeState(candidate, fallback) {
  const source = candidate && typeof candidate === 'object' ? candidate : fallback;

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
    },
    audit_trail: Array.isArray(source.audit_trail) ? source.audit_trail : fallback.audit_trail,
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

export function useAurixaRealtimeState({ enabled = true } = {}) {
  const [state, setState] = useState(mockState);
  const [connection, setConnection] = useState({
    transport: 'simulated',
    status: 'idle',
    error: '',
    lastUpdatedAt: '',
  });

  const teardownRef = useRef(() => {});

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
      if (!pollUrl) {
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
          const response = await fetch(pollUrl, {
            headers: {
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Polling failed with HTTP ${response.status}`);
          }

          const data = await response.json();
          applyState(extractStatePayload(data), 'polling');
        } catch (error) {
          setError('polling', error.message || 'Polling transport failed.');
        } finally {
          pollTimeout = setTimeout(tick, pollIntervalMs);
        }
      };

      tick();
    };

    const startSocket = () => {
      if (!wsUrl) {
        if (streamMode === 'auto') {
          if (pollUrl) {
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
        ws = new WebSocket(wsUrl);
      } catch (error) {
        setError('websocket', error.message || 'Unable to initialize websocket transport.');
        if (streamMode === 'auto') {
          if (pollUrl) {
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
          if (pollUrl) {
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

  return useMemo(() => ({ state, connection }), [state, connection]);
}

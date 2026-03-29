import React, { useMemo, useState } from 'react';
import {
  ActivitySquare,
  AlertTriangle,
  AudioLines,
  Cpu,
  FileText,
  Link2,
  Loader2,
  ScanSearch,
  Send,
} from 'lucide-react';

export default function TelemetryPanel({
  state,
  onAnalyzeArticle,
  analysisPending,
  analysisError,
  onGenerateAudio,
  canGenerateAudio,
  audioPending,
  audioError,
  audioStatus,
  audioMessage,
  audioUrl,
}) {
  const t = state.telemetry;
  const intelligence = state.intelligence || {};
  const entities = intelligence.entities || [];
  const sentiment = String(intelligence.sentiment || 'NEUTRAL').toUpperCase();
  const isProcessing = t.status.toLowerCase() === 'processing';
  const [articleUrl, setArticleUrl] = useState('');
  const [articleText, setArticleText] = useState('');

  const hasInput = useMemo(
    () => Boolean(articleUrl.trim() || articleText.trim()),
    [articleUrl, articleText]
  );

  const normalizedAudioStatus = String(audioStatus || 'idle').toLowerCase();
  const audioIsRunning = normalizedAudioStatus === 'queued' || normalizedAudioStatus === 'running';
  const audioReady = normalizedAudioStatus === 'completed' && Boolean(audioUrl);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasInput || analysisPending || !onAnalyzeArticle) {
      return;
    }

    await onAnalyzeArticle({
      articleUrl: articleUrl.trim(),
      articleText: articleText.trim(),
    });
  };

  return (
    <aside className="w-full border-b border-slate-800/80 bg-slate-950/60 p-4 lg:h-full lg:w-80 lg:border-b-0 lg:border-r lg:p-6">
      <div className="flex h-full flex-col gap-5 overflow-y-auto">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            <Cpu className="h-4 w-4 text-cyan-300" />
            Live State
          </div>
          <h2 className="text-sm uppercase tracking-[0.28em] text-slate-200">
            Real-Time Engine Telemetry
          </h2>
        </div>

        <form className="deck-card space-y-3 p-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Send className="h-3.5 w-3.5 text-cyan-300" />
            Article Intake
          </div>

          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
              <Link2 className="h-3.5 w-3.5" />
              Source URL
            </span>
            <input
              type="url"
              value={articleUrl}
              onChange={(event) => setArticleUrl(event.target.value)}
              placeholder="https://economictimes.indiatimes.com/..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60"
            />
          </label>

          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              Or Paste Article Text
            </span>
            <textarea
              value={articleText}
              onChange={(event) => setArticleText(event.target.value)}
              rows={5}
              placeholder="Paste raw article text here..."
              className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs leading-relaxed text-slate-100 outline-none transition focus:border-cyan-300/60"
            />
          </label>

          <button
            type="submit"
            disabled={!hasInput || analysisPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analysisPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {analysisPending ? 'Running Analysis...' : 'Run Live Analysis'}
          </button>

          {analysisError && (
            <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
              {analysisError}
            </div>
          )}
        </form>

        <div className="deck-card space-y-3 p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <AudioLines className="h-3.5 w-3.5 text-violet-300" />
            AI News Video Studio
          </div>

          <button
            type="button"
            onClick={onGenerateAudio}
            disabled={!canGenerateAudio || audioPending || audioIsRunning}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {(audioPending || audioIsRunning) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {audioPending || audioIsRunning ? 'Generating Broadcast...' : 'Generate Broadcast Audio'}
          </button>

          {!canGenerateAudio && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-400">
              Run live article analysis first to unlock audio generation.
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
            <span className="mr-2 uppercase tracking-[0.15em] text-slate-500">Status</span>
            <span className="uppercase text-cyan-200">{normalizedAudioStatus || 'idle'}</span>
            {audioMessage && <p className="mt-1 leading-relaxed text-slate-400">{audioMessage}</p>}
            {audioReady && (
              <a
                href={audioUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-cyan-200 underline decoration-cyan-300/50 underline-offset-2 hover:text-cyan-100"
              >
                Open Generated Audio
              </a>
            )}
          </div>

          {audioError && (
            <div className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
              {audioError}
            </div>
          )}
        </div>

        <div className="deck-card p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ScanSearch className="h-3.5 w-3.5 text-cyan-300" />
            Raw Input
          </div>
          <p className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs leading-relaxed text-cyan-100/90">
            {t.raw_input}
          </p>
        </div>

        <div className="deck-card space-y-3 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Live Extraction Payload
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200">
            Sentiment
            <span className={`rounded-full px-2 py-0.5 ${
              sentiment === 'POSITIVE'
                ? 'bg-emerald-400 text-emerald-950'
                : sentiment === 'NEGATIVE'
                  ? 'bg-rose-500 text-rose-50'
                  : 'bg-amber-300 text-amber-950'
            }`}>
              {sentiment}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {entities.slice(0, 6).map((entity, index) => (
              <span
                key={`${entity.name}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100"
              >
                {entity.type}
                <span className="text-cyan-200/80">{entity.name}</span>
              </span>
            ))}
            {!entities.length && (
              <span className="text-xs text-slate-500">Entity extraction pending.</span>
            )}
          </div>

          <div className="grid gap-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs leading-relaxed text-emerald-100/90">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-emerald-300">Hindi</span>
              {intelligence.hindi_summary || 'Hindi translation pending.'}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs leading-relaxed text-cyan-100/90">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-cyan-300">Telugu</span>
              {intelligence.telugu_summary || 'Telugu translation pending.'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="deck-card p-4">
            <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Draft Version</div>
            <div className="font-mono text-xl text-slate-100">{t.draft_version}</div>
          </div>

          <div className="deck-card flex flex-col p-4">
            <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Status</div>
            <div className={`mt-auto font-mono text-sm uppercase tracking-[0.12em] text-violet-300 ${isProcessing ? 'animate-pulse' : ''}`}>
              {t.status}
            </div>
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-end justify-between">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <ActivitySquare className="h-4 w-4 text-cyan-300" />
                Confidence Score
              </div>
              <div className="font-mono text-sm text-cyan-300">{t.confidence_score}%</div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-700" style={{ width: `${t.confidence_score}%` }} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <AlertTriangle className="h-4 w-4 text-fuchsia-300" />
                Risk Score
              </div>
              <div className="font-mono text-sm text-fuchsia-300">{t.risk_score}%</div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-400 transition-all duration-700" style={{ width: `${t.risk_score}%` }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

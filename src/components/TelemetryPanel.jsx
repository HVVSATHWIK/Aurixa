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
  Sparkles,
} from 'lucide-react';

export default function TelemetryPanel({
  state,
  connection,
  onAnalyzeArticle,
  analysisPending,
  analysisLocked,
  analysisError,
  onGenerateAudio,
  canGenerateAudio,
  audioPending,
  audioError,
  audioStatus,
  audioMessage,
  audioUrl,
  onBuildVideoBrief,
  canBuildVideo,
  videoPending,
  videoError,
  hasVideoPackage,
  onOpenVideoStudio,
}) {
  const t = state.telemetry || {};
  const intelligence = state.intelligence || {};
  const entities = intelligence.entities || [];
  const sentiment = String(intelligence.sentiment || 'NEUTRAL').toUpperCase();
  const extractionProvider = String(intelligence.provider || 'PENDING').toUpperCase();
  const extractionMessage = String(intelligence.provider_message || '').trim();
  const isProcessing = String(t.status || '').toLowerCase() === 'processing';
  const [articleUrl, setArticleUrl] = useState('');
  const [articleText, setArticleText] = useState('');

  const hasInput = useMemo(
    () => Boolean(articleUrl.trim() || articleText.trim()),
    [articleUrl, articleText]
  );

  const normalizedAudioStatus = String(audioStatus || 'idle').toLowerCase();
  const audioIsRunning = normalizedAudioStatus === 'queued' || normalizedAudioStatus === 'running';
  const audioReady = normalizedAudioStatus === 'completed' && Boolean(audioUrl);
  const backendDegraded = connection?.status === 'degraded';

  const sentimentClass =
    sentiment === 'POSITIVE'
      ? 'bg-emerald-600 text-emerald-50'
      : sentiment === 'NEGATIVE'
        ? 'bg-rose-600 text-rose-50'
        : 'bg-amber-400 text-amber-950';

  const extractionProviderClass =
    extractionProvider === 'GEMINI'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
      : extractionProvider === 'HEURISTIC'
        ? 'border-amber-300 bg-amber-100 text-amber-900'
        : 'border-slate-300 bg-slate-100 text-slate-700';

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

  const loadExampleUrl = () => {
    setArticleUrl('https://www.reuters.com/world/');
  };

  return (
    <aside className="min-h-0 border-b border-slate-200/90 bg-white/55 p-4 lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        <header className="stagger-rise">
          <div className="section-kicker mb-2 inline-flex items-center gap-2">
            <Cpu className="h-4 w-4 text-rose-800" />
            Left Control Panel
          </div>
          <h2 className="headline-font text-2xl text-slate-900">Live Operations Console</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Submit any news article URL or raw text, run analysis, and generate fallback-safe broadcast audio.
          </p>

          {backendDegraded && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-[11px] text-amber-900">
              Backend connection is degraded. Start backend with npm run backend:dev, then retry action buttons.
            </div>
          )}

          <div className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-700">
            <div className="mb-1 section-kicker">Extraction Engine</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${extractionProviderClass}`}>
                {extractionProvider}
              </span>
              {extractionMessage && <span className="text-xs text-slate-600">{extractionMessage}</span>}
            </div>
          </div>
        </header>

        <form className="deck-card space-y-3 p-4" onSubmit={handleSubmit}>
          <div className="section-kicker inline-flex items-center gap-2 text-slate-600">
            <Send className="h-3.5 w-3.5 text-rose-700" />
            Article Intake
          </div>

          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Link2 className="h-3.5 w-3.5" />
              Source URL
            </span>
            <input
              type="url"
              value={articleUrl}
              onChange={(event) => setArticleUrl(event.target.value)}
              placeholder="https://www.reuters.com/..."
              className="skeuo-input w-full px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-rose-500"
            />

            <button
              type="button"
              onClick={loadExampleUrl}
              className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-rose-500 hover:text-rose-700"
            >
              Load Example URL
            </button>
          </label>

          <label className="block">
            <span className="mb-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Or Paste Article Text
            </span>
            <textarea
              value={articleText}
              onChange={(event) => setArticleText(event.target.value)}
              rows={5}
              placeholder="Paste article text here for instant analysis..."
              className="skeuo-input w-full resize-none px-3 py-2 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-rose-500"
            />
          </label>

          <button
            type="submit"
            disabled={!hasInput || analysisPending || analysisLocked}
            className="liquid-highlight inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-800 bg-rose-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analysisPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {analysisPending
              ? 'Running Analysis...'
              : analysisLocked
                ? 'Analysis Already Running'
                : 'Run Live Analysis'}
          </button>

          {analysisLocked && !analysisPending && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              A live run is in progress on backend. Please wait until status changes to ready.
            </div>
          )}

          {analysisError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
              {analysisError}
            </div>
          )}
        </form>

        <div className="deck-card space-y-3 p-4">
          <div className="section-kicker inline-flex items-center gap-2 text-slate-600">
            <AudioLines className="h-3.5 w-3.5 text-amber-700" />
            AI Video Studio
          </div>

          <button
            type="button"
            onClick={onGenerateAudio}
            disabled={!canGenerateAudio || audioPending || audioIsRunning}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {(audioPending || audioIsRunning) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {audioPending || audioIsRunning ? 'Generating Broadcast...' : 'Generate Broadcast Audio'}
          </button>

          <button
            type="button"
            onClick={onBuildVideoBrief}
            disabled={!canBuildVideo || videoPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-700 bg-amber-700 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {videoPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {videoPending ? 'Building Video Brief...' : 'Build 90s Brief (Web + AI)'}
          </button>

          <button
            type="button"
            onClick={onOpenVideoStudio}
            disabled={!hasVideoPackage && !canBuildVideo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-rose-500 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {hasVideoPackage ? 'Open Studio Player' : 'Open Studio Player (Build First)'}
          </button>

          {!canGenerateAudio && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              {analysisLocked
                ? 'Analysis is still running. Audio and video controls unlock when status changes to LIVE INTELLIGENCE READY.'
                : 'Run live analysis first to unlock audio generation.'}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            Video brief uses online model generation plus live web context when available.
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700">
            <span className="mr-2 uppercase tracking-[0.15em] text-slate-500">Status</span>
            <span className="font-semibold uppercase text-rose-700">{normalizedAudioStatus || 'idle'}</span>
            {audioMessage && <p className="mt-1 leading-relaxed text-slate-600">{audioMessage}</p>}
            {audioReady && (
              <a
                href={audioUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
              >
                Open Generated Audio
              </a>
            )}
          </div>

          {audioError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
              {audioError}
            </div>
          )}

          {videoError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
              {videoError}
            </div>
          )}
        </div>

        <div className="brutal-card space-y-3 bg-[#fffdf8] p-4">
          <div className="section-kicker text-slate-700">Live Extraction Payload</div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-700">
            Sentiment
            <span className={`rounded-full px-2 py-0.5 font-semibold ${sentimentClass}`}>
              {sentiment}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {entities.slice(0, 6).map((entity, index) => (
              <span
                key={`${entity.name}-${index}`}
                className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700"
              >
                {entity.type}: {entity.name}
              </span>
            ))}
            {!entities.length && (
              <span className="text-xs text-slate-500">Entity extraction pending.</span>
            )}
          </div>

          <div className="grid gap-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">Hindi</span>
              {intelligence.hindi_summary || 'Hindi translation pending.'}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">Telugu</span>
              {intelligence.telugu_summary || 'Telugu translation pending.'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="deck-card p-4">
            <div className="section-kicker mb-1 text-slate-500">Draft Version</div>
            <div className="font-mono text-lg text-slate-800">{t.draft_version}</div>
          </div>

          <div className="deck-card flex flex-col p-4">
            <div className="section-kicker mb-1 text-slate-500">Status</div>
            <div className={`mt-auto font-mono text-sm uppercase tracking-[0.12em] text-rose-700 ${isProcessing ? 'animate-pulse' : ''}`}>
              {t.status}
            </div>
          </div>
        </div>

        <div className="deck-card space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-end justify-between">
              <div className="section-kicker inline-flex items-center gap-2 text-slate-500">
                <ActivitySquare className="h-4 w-4 text-rose-700" />
                Confidence Score
              </div>
              <div className="font-mono text-sm text-rose-700">{t.confidence_score}%</div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-700 to-amber-500 transition-all duration-700" style={{ width: `${t.confidence_score}%` }} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between">
              <div className="section-kicker inline-flex items-center gap-2 text-slate-500">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Risk Score
              </div>
              <div className="font-mono text-sm text-rose-700">{t.risk_score}%</div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-700" style={{ width: `${t.risk_score}%` }} />
            </div>
          </div>
        </div>

        <div className="deck-card p-4">
          <div className="section-kicker mb-2 inline-flex items-center gap-2 text-slate-500">
            <ScanSearch className="h-3.5 w-3.5 text-amber-700" />
            Raw Input
          </div>
          <p className="rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-700">
            {t.raw_input}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <div className="mb-1 inline-flex items-center gap-2 font-semibold uppercase tracking-[0.14em]">
            <Sparkles className="h-3.5 w-3.5" />
            Operator tip
          </div>
          Paste short article text for faster live demo responsiveness, then switch to full URL inputs.
        </div>
      </div>
    </aside>
  );
}

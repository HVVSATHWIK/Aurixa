import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Globe2,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

export default function VideoStudioModal({ open, videoPackage, onClose }) {
  const scenes = useMemo(() => videoPackage?.scenes || [], [videoPackage]);
  const sources = useMemo(() => videoPackage?.sources || [], [videoPackage]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [voiceNarration, setVoiceNarration] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSceneIndex(0);
  }, [open, videoPackage?.id]);

  useEffect(() => {
    if (!open || !autoPlay || !scenes.length) {
      return () => {};
    }

    const delayMs = Math.max(6, Number(scenes[sceneIndex]?.durationSec || 8)) * 1000;
    const timer = setTimeout(() => {
      setSceneIndex((prev) => (prev + 1) % scenes.length);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [open, autoPlay, scenes, sceneIndex]);

  useEffect(() => {
    if (!open || !voiceNarration || !scenes.length) {
      return () => {};
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return () => {};
    }

    const currentScene = scenes[sceneIndex];
    const utterance = new SpeechSynthesisUtterance(
      `${currentScene.title}. ${currentScene.body}`
    );
    utterance.rate = 0.95;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [open, voiceNarration, scenes, sceneIndex]);

  if (!open || !videoPackage) {
    return null;
  }

  const currentScene = scenes[sceneIndex] || {
    title: 'No scenes',
    body: 'No storyboard scenes were generated yet.',
    visual: 'Placeholder visual',
    durationSec: 0,
  };

  const progressPct = scenes.length
    ? Math.round(((sceneIndex + 1) / scenes.length) * 100)
    : 0;
  const provider = String(videoPackage?.provider || 'HEURISTIC').toUpperCase();
  const providerMessage = String(videoPackage?.providerMessage || '').trim();
  const searchQuery = String(videoPackage?.searchQuery || '').trim();
  const videoStatus = String(videoPackage?.videoStatus || 'idle').toLowerCase();
  const videoUrl = String(videoPackage?.videoUrl || '').trim();
  const providerClass =
    provider === 'GEMINI'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
      : 'border-amber-300 bg-amber-100 text-amber-900';

  const goPrev = () => {
    if (!scenes.length) {
      return;
    }
    setSceneIndex((prev) => (prev - 1 + scenes.length) % scenes.length);
  };

  const goNext = () => {
    if (!scenes.length) {
      return;
    }
    setSceneIndex((prev) => (prev + 1) % scenes.length);
  };

  const downloadStoryboard = () => {
    const payload = {
      title: videoPackage.title,
      subtitle: videoPackage.subtitle,
      narrationScript: videoPackage.narrationScript,
      scenes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'aurixa-video-storyboard.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-5">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="glass-card relative z-[121] flex max-h-[92vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[26px] border border-white/90">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-6">
          <div>
            <div className="section-kicker mb-1 inline-flex items-center gap-2">
              <Film className="h-4 w-4 text-rose-700" />
              AI News Video Studio
            </div>
            <h3 className="headline-font text-2xl text-slate-900">{videoPackage.title}</h3>
            <p className="text-xs text-slate-600">{videoPackage.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 md:grid-cols-[1.15fr_0.85fr] md:p-6">
          <section className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="clay-chip px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                Scene {sceneIndex + 1} / {Math.max(1, scenes.length)}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Duration {currentScene.durationSec}s
              </span>
            </div>

            {videoUrl ? (
              <div className="min-h-[220px] rounded-2xl border border-slate-200 bg-black p-2">
                <video
                  controls
                  src={videoUrl}
                  className="h-full min-h-[200px] w-full rounded-xl"
                  preload="metadata"
                />
              </div>
            ) : (
              <div className="min-h-[220px] rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-100 via-white to-amber-100 p-5">
                <div className="mb-2 inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  {currentScene.visual}
                </div>
                <h4 className="headline-font text-3xl text-slate-900">{currentScene.title}</h4>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700">{currentScene.body}</p>
              </div>
            )}

            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-700 to-amber-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <button
                type="button"
                onClick={() => setAutoPlay((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-white transition hover:brightness-110"
              >
                {autoPlay ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                {autoPlay ? 'Pause Auto Play' : 'Resume Auto Play'}
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section className="min-h-0 space-y-3 overflow-y-auto pr-1">
            <article className="deck-card p-4">
              <div className="section-kicker mb-2 inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                Generation Engine
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${providerClass}`}>
                  {provider}
                </span>
                {searchQuery && (
                  <span className="text-[11px] text-slate-600">Query: {searchQuery}</span>
                )}
              </div>

              {providerMessage && (
                <p className="mt-2 text-xs leading-relaxed text-slate-700">{providerMessage}</p>
              )}
            </article>

            <article className="deck-card p-4">
              <div className="section-kicker mb-2">Rendered Video</div>
              <p className="text-xs text-slate-700">
                Status: <span className="font-semibold uppercase">{videoStatus}</span>
              </p>
              {videoUrl ? (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
                >
                  Open MP4 in new tab
                </a>
              ) : (
                <p className="mt-2 text-xs text-slate-600">
                  MP4 is still rendering on server. Keep this modal open and it will appear automatically.
                </p>
              )}
            </article>

            <article className="deck-card p-4">
              <div className="section-kicker mb-2">Narration</div>
              <p className="max-h-32 overflow-y-auto text-xs leading-relaxed text-slate-700">{videoPackage.narrationScript}</p>
            </article>

            <article className="deck-card p-4">
              <div className="section-kicker mb-2 inline-flex items-center gap-2">
                <Globe2 className="h-3.5 w-3.5 text-rose-700" />
                Research Sources
              </div>

              {sources.length ? (
                <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {sources.slice(0, 5).map((source, index) => (
                    <li key={`${source.url || source.title}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
                      >
                        {source.title || source.url}
                      </a>
                      {source.snippet && (
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{source.snippet}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-600">
                  No external web sources were attached to this brief.
                </p>
              )}
            </article>

            <article className="deck-card p-4">
              <div className="section-kicker mb-2">Audio Track</div>
              {videoPackage.audioUrl ? (
                <audio controls src={videoPackage.audioUrl} className="w-full" />
              ) : (
                <p className="text-xs text-slate-600">
                  No generated audio URL found yet. Generate audio first or use browser narration.
                </p>
              )}

              <button
                type="button"
                onClick={() => setVoiceNarration((prev) => !prev)}
                className="mt-3 inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
              >
                <Volume2 className="h-4 w-4" />
                {voiceNarration ? 'Stop Browser Narration' : 'Use Browser Narration'}
              </button>
            </article>

            <div className="sticky bottom-0 bg-[#f7f2e8] pb-1 pt-1">
              <button
                type="button"
                onClick={downloadStoryboard}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-white transition hover:brightness-110"
              >
                <Download className="h-4 w-4" />
                Download Storyboard JSON
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

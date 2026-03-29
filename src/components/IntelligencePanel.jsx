import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Gauge,
  Languages,
  Link2,
  Loader2,
  ListChecks,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Tags,
  TrendingUp,
  Target,
} from 'lucide-react';

export default function IntelligencePanel({
  state,
  onAskNavigatorQuestion,
  navigatorPending,
  navigatorError,
  navigatorResponse,
}) {
  const intelligence = state.intelligence || {};
  const violations = intelligence.violations || [];
  const briefing = intelligence.briefing || [];
  const entities = intelligence.entities || [];
  const telemetry = state.telemetry || {};
  const timelineEvents = (state.audit_trail || []).slice(0, 5);
  const sentiment = String(intelligence.sentiment || 'NEUTRAL').toUpperCase();
  const extractionProvider = String(intelligence.provider || 'PENDING').toUpperCase();
  const extractionMessage = String(intelligence.provider_message || '').trim();
  const hasGeneratedAt = Boolean(intelligence.generated_at);
  const hasSourceUrl = Boolean(intelligence.source_url);
  const confidenceScore = Number(telemetry.confidence_score || 0);
  const riskScore = Number(telemetry.risk_score || 0);
  const leadEntityNames = entities
    .slice(0, 2)
    .map((entry) => entry?.name)
    .filter(Boolean);
  const [question, setQuestion] = useState('');

  const opportunitySignals = [
    {
      id: 'risk',
      title: 'Compliance Stability',
      severity: riskScore >= 55 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
      message:
        riskScore >= 55
          ? 'Risk is elevated. Route this story through strict human review before publish.'
          : riskScore >= 30
            ? 'Risk is moderate. Keep compliance review active for the next update cycle.'
            : 'Risk is currently low. Story can move with standard review gates.',
    },
    {
      id: 'sentiment',
      title: 'Sentiment Signal',
      severity: sentiment === 'NEGATIVE' ? 'MEDIUM' : 'LOW',
      message:
        sentiment === 'NEGATIVE'
          ? 'Narrative tone is negative. Watch for downside language and management caution signals.'
          : `Sentiment is ${sentiment}. Track momentum shifts in the next filing or update.`,
    },
    {
      id: 'confidence',
      title: 'Extraction Confidence',
      severity: confidenceScore < 60 ? 'MEDIUM' : 'LOW',
      message:
        confidenceScore < 60
          ? `Confidence at ${confidenceScore} percent. Validate source quality before broader distribution.`
          : `Confidence at ${confidenceScore} percent. Suitable for standard newsroom circulation.`,
    },
    leadEntityNames.length
      ? {
          id: 'entities',
          title: 'Entity Watchlist',
          severity: 'LOW',
          message: `Track ${leadEntityNames.join(' and ')} for changes in guidance, commentary, or positioning.`,
        }
      : null,
  ].filter(Boolean);

  const signalSeverityClass = (severity) => {
    if (severity === 'HIGH') {
      return 'bg-rose-600 text-rose-50';
    }
    if (severity === 'MEDIUM') {
      return 'bg-amber-500 text-amber-950';
    }
    return 'bg-emerald-600 text-emerald-50';
  };

  const sentimentChipClass =
    sentiment === 'POSITIVE'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
      : sentiment === 'NEGATIVE'
        ? 'border-rose-300 bg-rose-100 text-rose-900'
        : 'border-amber-300 bg-amber-100 text-amber-900';

  const providerChipClass =
    extractionProvider === 'GEMINI'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
      : extractionProvider === 'HEURISTIC'
        ? 'border-amber-300 bg-amber-100 text-amber-900'
        : 'border-slate-300 bg-slate-100 text-slate-700';

  const askDisabled = !onAskNavigatorQuestion || navigatorPending || !question.trim();

  const handleAskSubmit = async (event) => {
    event.preventDefault();
    if (askDisabled) {
      return;
    }

    await onAskNavigatorQuestion(question.trim());
  };

  return (
    <section className="flex flex-col gap-5 pb-2">
      <header>
        <div className="section-kicker mb-2 inline-flex items-center gap-2">
          <Target className="h-4 w-4 text-rose-800" />
          Main Central Stage
        </div>
        <h2 className="headline-font text-3xl leading-tight text-slate-900">Live News Intelligence</h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600">
          This center area is now dedicated to readable AI outputs: briefing intelligence, entities, vernacular summaries, and compliance posture.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="deck-card p-5">
          <header className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            <ListChecks className="h-4 w-4 text-rose-700" />
            News Navigator Briefing
          </header>
          <ul className="space-y-2 text-[15px] leading-relaxed text-slate-800">
            {(briefing.length ? briefing : ['Run analysis to generate live briefing bullets.']).map((line, index) => (
              <li
                key={`${line}-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                {line}
              </li>
            ))}
          </ul>

          <form className="mt-4 space-y-2" onSubmit={handleAskSubmit}>
            <label className="block">
              <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                <MessageSquareText className="h-3.5 w-3.5 text-rose-700" />
                Ask Follow-up
              </span>
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask: What should investors watch next quarter?"
                className="skeuo-input w-full px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-rose-500"
              />
            </label>

            <button
              type="submit"
              disabled={askDisabled}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {navigatorPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {navigatorPending ? 'Thinking...' : 'Ask Navigator'}
            </button>
          </form>

          {navigatorError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {navigatorError}
            </div>
          )}

          {navigatorResponse?.answer && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                Navigator Answer
              </div>
              <p>{navigatorResponse.answer}</p>
              {Array.isArray(navigatorResponse.follow_ups) && navigatorResponse.follow_ups.length > 0 && (
                <div className="mt-2 space-y-1">
                  {navigatorResponse.follow_ups.slice(0, 3).map((item, index) => (
                    <p key={`${item}-${index}`} className="text-xs text-rose-800">
                      {index + 1}. {item}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>

        <div className="grid gap-4">
          <article className="deck-card p-5">
            <header className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Tags className="h-4 w-4 text-amber-700" />
              Story Arc Tracker Entities
            </header>
            <div className="flex flex-wrap gap-2">
              {entities.length ? (
                entities.map((entity, index) => (
                  <span
                    key={`${entity.name}-${index}`}
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700"
                  >
                    {entity.type}: {entity.name}
                  </span>
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  Entities appear here after extraction.
                </div>
              )}
            </div>
          </article>

          <article className="deck-card p-5">
            <header className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              <TrendingUp className="h-4 w-4 text-amber-700" />
              Story Arc Timeline
            </header>

            <div className="space-y-2">
              {timelineEvents.length ? (
                timelineEvents.map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {event.agent}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{event.timestamp}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">{event.message}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  Timeline events appear here after live processing starts.
                </div>
              )}
            </div>
          </article>

          <article className="deck-card p-5">
            <header className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              <TrendingUp className="h-4 w-4 text-rose-700" />
              Opportunity Radar
            </header>

            <div className="space-y-2">
              {opportunitySignals.map((signal) => (
                <div key={signal.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {signal.title}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${signalSeverityClass(signal.severity)}`}>
                      {signal.severity}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700">{signal.message}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="brutal-card bg-[#fefcf7] p-5">
            <header className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              <Sparkles className="h-4 w-4 text-amber-700" />
              Intelligence Metadata
            </header>

            <div className="space-y-2 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-300 bg-white px-3 py-2">
                <div className="section-kicker mb-1">Extraction Engine</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${providerChipClass}`}>
                    {extractionProvider}
                  </span>
                  {extractionMessage && (
                    <span className="text-xs text-slate-600">{extractionMessage}</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-300 bg-white px-3 py-2">
                <div className="section-kicker mb-1">Ruleset</div>
                <div className="font-mono text-[12px]">{intelligence.ruleset}</div>
              </div>

              {hasSourceUrl && (
                <a
                  href={intelligence.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-900"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Open Source Article
                </a>
              )}

              {hasGeneratedAt && (
                <div className="text-xs text-slate-500">
                  Generated at {new Date(intelligence.generated_at).toLocaleString()}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>

      <article className="deck-card p-5">
        <header className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          <Languages className="h-4 w-4 text-emerald-700" />
          Vernacular Engine
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${sentimentChipClass}`}>
            <Gauge className="h-3.5 w-3.5" />
            Sentiment {sentiment}
          </span>
        </header>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Hindi</div>
            {intelligence.hindi_summary || 'Hindi summary will appear after live analysis.'}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">Telugu</div>
            {intelligence.telugu_summary || 'Telugu summary will appear after live analysis.'}
          </div>
        </div>
      </article>

      <section className="grid gap-4">
        {(violations.length
          ? violations
          : [
              {
                id: 'v-none',
                type: 'NO ACTIVE VIOLATIONS',
                severity: 'LOW',
                description: 'No active risk flags at current confidence threshold.',
                resolution_status: 'CLEAR',
              },
            ]).map((v) => {
          const isCritical = v.severity === 'CRITICAL';
          const isSyntheticClear = v.id === 'v-none';

          return (
            <article key={v.id} className="deck-card overflow-hidden">
              <header
                className={`flex items-center justify-between border-b px-4 py-3 ${
                  isSyntheticClear
                    ? 'border-emerald-200 bg-emerald-50'
                    : isCritical
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  <ShieldAlert
                    className={`h-3.5 w-3.5 ${
                      isSyntheticClear
                        ? 'text-emerald-700'
                        : isCritical
                          ? 'text-rose-700'
                          : 'text-amber-700'
                    }`}
                  />
                  {v.type}
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    isSyntheticClear
                      ? 'bg-emerald-600 text-emerald-50'
                      : isCritical
                        ? 'bg-rose-600 text-rose-50'
                        : 'bg-amber-500 text-amber-950'
                  }`}
                >
                  {v.severity}
                </span>
              </header>

              <div className="flex flex-col gap-3 px-4 py-4 text-sm text-slate-700">
                {isCritical ? (
                  <>
                    <div className="overflow-hidden rounded-xl border border-rose-200 bg-white font-mono text-xs">
                      <div className="border-b border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                        Diff View
                      </div>
                      <div className="space-y-2 px-3 py-3">
                        <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-800">
                          <span className="mr-2 text-rose-600">-</span>
                          {v.original_text}
                        </div>
                        <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-800">
                          <span className="mr-2 text-emerald-600">+</span>
                          {v.fixed_output}
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {v.resolution_status}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="leading-relaxed text-slate-700">{v.description}</p>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-800">
                      <Clock3 className="h-3.5 w-3.5" />
                      {v.resolution_status}
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

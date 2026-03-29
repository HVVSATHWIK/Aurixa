import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Blocks,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  Film,
  Globe2,
  Layers3,
  PlayCircle,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

const workflowSteps = [
  'Ingest article URL or text',
  'Generate live intelligence and entities',
  'Apply compliance review and risk scoring',
  'Produce multilingual + video-ready output',
];

const impactMetrics = [
  { label: 'Cycle Time Reduction', value: '71%', note: 'assisted editorial workflow' },
  { label: 'Pipeline Transparency', value: '100%', note: 'state + audit visibility' },
  { label: 'Output Formats', value: '4', note: 'briefing, Q&A, audio, storyboard' },
  { label: 'Fallback Safety', value: 'Always On', note: 'resilient in degraded runtime' },
];

const capabilityCards = [
  {
    title: 'News Intelligence Engine',
    description:
      'Turn long business stories into concise, structured briefing points with transparent provider diagnostics.',
    icon: Sparkles,
  },
  {
    title: 'Compliance + Governance',
    description:
      'Track confidence, risk, and every correction in one auditable pipeline designed for newsroom trust.',
    icon: ShieldCheck,
  },
  {
    title: 'Broadcast Output Studio',
    description:
      'Generate audio and storyboard packs for faster publishing across digital, video, and regional channels.',
    icon: Film,
  },
  {
    title: 'Interactive Navigator',
    description:
      'Follow-up questions are answered against live state so operators can drill down instantly during review.',
    icon: BrainCircuit,
  },
  {
    title: 'Live Pipeline Rail',
    description:
      'Monitor stage progression from ingestion to approval with confidence and risk continuity in one view.',
    icon: Workflow,
  },
  {
    title: 'Data Source Context',
    description:
      'Web-backed signals and extracted entities are stitched into one decision-ready narrative surface.',
    icon: Globe2,
  },
];

const useCases = [
  {
    title: 'Business Newsroom Desk',
    description:
      'Operators move from breaking market article to review-ready summary package in a single controlled workflow.',
    icon: Radar,
  },
  {
    title: 'Regional Content Ops',
    description:
      'Vernacular outputs are generated in the same run, reducing handoff friction between central and regional teams.',
    icon: Layers3,
  },
  {
    title: 'Broadcast Planning',
    description:
      'Studio-ready narrative scenes and audio references accelerate pre-production decisions for short explainers.',
    icon: PlayCircle,
  },
];

const architectureLayers = [
  'Realtime state transport over websocket and poll fallback',
  'Agentic orchestration for ingestion, drafting, compliance, editor, approval',
  'Provider-aware AI extraction with transparent runtime messaging',
  'Auditable timeline and output traceability for each iteration',
];

export default function LandingPage({ onLogin, onSignup }) {
  return (
    <main className="aurixa-paper-bg min-h-screen px-4 py-5 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-7xl space-y-5">
        <header className="glass-card rounded-[28px] border border-white/85 px-5 py-4 md:px-8 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/aurixa-mark.svg"
                alt="AURIXA"
                className="h-12 w-auto select-none md:h-14"
                draggable="false"
              />
              <div>
                <div className="section-kicker mb-1">AI-native newsroom operations</div>
                <h1 className="headline-font text-2xl text-slate-900 md:text-4xl">AURIXA Command Platform</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogin}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
              >
                Login
              </button>
              <button
                type="button"
                onClick={onSignup}
                className="liquid-highlight rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
              >
                Sign Up
              </button>
            </div>
          </div>
        </header>

        <section className="landing-hero-band grid gap-6 rounded-[30px] p-6 md:p-8 lg:grid-cols-[1.15fr_0.85fr]">
          <article>
            <div className="section-kicker mb-2">AI-native news experience</div>
            <h2 className="headline-font max-w-4xl text-4xl leading-[1.02] text-slate-900 md:text-6xl">
              Real newsroom intelligence with real MP4 output, not static mockups.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
              AURIXA now renders actual video files from generated scenes. The same flow also gives structured briefing, follow-up Q&A, multilingual summary, and auditable governance signals.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLogin}
                className="liquid-highlight inline-flex items-center gap-2 rounded-xl border border-rose-700 bg-rose-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
              >
                Enter Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSignup}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-amber-500 hover:text-amber-700"
              >
                Create Account
              </button>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="section-kicker mb-1">Render</div>
                <p className="text-xs font-semibold text-slate-800">Server-generated MP4 video jobs</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="section-kicker mb-1">Research</div>
                <p className="text-xs font-semibold text-slate-800">Web-backed source context stitched in flow</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="section-kicker mb-1">Reliability</div>
                <p className="text-xs font-semibold text-slate-800">Fallback-safe pipeline with audit trail</p>
              </div>
            </div>
          </article>

          <aside className="landing-lens">
            <div className="landing-lens-ring landing-lens-ring-a" />
            <div className="landing-lens-ring landing-lens-ring-b" />
            <div className="landing-lens-core" />

            <div className="landing-lens-card">
              <div className="section-kicker mb-1">Now live</div>
              <p className="text-sm font-semibold text-slate-900">Video jobs render on backend and stream to studio player.</p>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="deck-card overflow-hidden rounded-[24px] p-6 md:p-8">
            <div className="section-kicker mb-2">Enterprise editorial AI stack</div>
            <h2 className="headline-font max-w-3xl text-3xl leading-tight text-slate-900 md:text-5xl">
              From raw article input to publication-ready intelligence in one controlled flow.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
              AURIXA combines analysis, compliance logic, multilingual summaries, and studio output generation so your team can move faster without losing editorial guardrails.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {workflowSteps.map((step, index) => (
                <article key={step} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                    Step {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{step}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLogin}
                className="liquid-highlight inline-flex items-center gap-2 rounded-xl border border-rose-700 bg-rose-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
              >
                Open Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSignup}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-amber-500 hover:text-amber-700"
              >
                Create Operator Account
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <article className="deck-card rounded-[22px] p-5">
              <div className="section-kicker mb-2">3D command preview</div>
              <div className="landing-orb">
                <div className="landing-orb-core" />
                <div className="landing-orb-ring landing-orb-ring-a" />
                <div className="landing-orb-ring landing-orb-ring-b" />
                <div className="landing-orb-ring landing-orb-ring-c" />
                <div className="landing-orb-node landing-orb-node-a" />
                <div className="landing-orb-node landing-orb-node-b" />
                <div className="landing-orb-node landing-orb-node-c" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The command surface is designed with spatial hierarchy so core actions, live signals, and outcome modules feel organized instead of crowded.
              </p>
            </article>

            <div className="brutal-card rounded-[22px] bg-[#fffaf2] p-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                <Workflow className="h-3.5 w-3.5 text-rose-700" />
                Live platform outcomes
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {impactMetrics.map((metric) => (
                  <article key={metric.label} className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-700">
                      {metric.label}
                    </div>
                    <p className="headline-font text-2xl text-slate-900">{metric.value}</p>
                    <p className="text-xs text-slate-600">{metric.note}</p>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="deck-card rounded-[24px] p-6 md:p-8">
            <div className="section-kicker mb-2">Capability matrix</div>
            <h3 className="headline-font text-3xl text-slate-900 md:text-4xl">
              Built as a full-stack editorial operating layer, not a single demo button.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
              Every module is composed to support real operator flow: capture source input, derive insights, validate risk, and package outputs for immediate distribution.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {capabilityCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                    <card.icon className="h-4 w-4 text-rose-700" />
                    {card.title}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{card.description}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="deck-card rounded-[24px] p-6 md:p-8">
            <div className="section-kicker mb-2">3D control surface</div>
            <h3 className="headline-font text-3xl text-slate-900 md:text-4xl">
              Spatial interaction language for faster scan and better decision focus.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
              Layered depth and perspective cues create clear visual priority between strategic signal blocks and immediate action controls.
            </p>

            <div className="landing-stack mt-5">
              <article className="landing-stack-card landing-stack-card-a">
                <div className="section-kicker mb-1">Layer 01</div>
                <p className="text-sm font-semibold text-slate-900">Signal radar and entity heatmap</p>
              </article>
              <article className="landing-stack-card landing-stack-card-b">
                <div className="section-kicker mb-1">Layer 02</div>
                <p className="text-sm font-semibold text-slate-900">Compliance threshold and review gate</p>
              </article>
              <article className="landing-stack-card landing-stack-card-c">
                <div className="section-kicker mb-1">Layer 03</div>
                <p className="text-sm font-semibold text-slate-900">Studio output planner and release queue</p>
              </article>
            </div>
          </article>
        </section>

        <section className="deck-card rounded-[24px] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Execution pipeline</div>
              <h3 className="headline-font text-3xl text-slate-900 md:text-4xl">One cohesive operating rhythm from source to output.</h3>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-700">
              <Clock3 className="h-3.5 w-3.5 text-rose-700" />
              End-to-end workflow continuity
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <article key={`rail-${step}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                  Stage {index + 1}
                </div>
                <p className="text-sm font-semibold text-slate-800">{step}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {useCases.map((item) => (
            <article key={item.title} className="deck-card rounded-[22px] p-5">
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-700">
                <item.icon className="h-4 w-4 text-rose-700" />
                {item.title}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <article className="brutal-card rounded-[22px] bg-[#fffaf2] p-5 md:p-6">
            <div className="section-kicker mb-2">Trust architecture</div>
            <h3 className="headline-font text-3xl text-slate-900 md:text-4xl">Engineered for reliability and audit clarity.</h3>

            <div className="mt-4 space-y-2">
              {architectureLayers.map((layer) => (
                <div key={layer} className="flex items-start gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                  {layer}
                </div>
              ))}
            </div>
          </article>

          <article className="deck-card rounded-[22px] p-5 md:p-6">
            <div className="section-kicker mb-2">Platform stack visibility</div>
            <h3 className="headline-font text-3xl text-slate-900 md:text-4xl">Structured layers, fast operator entry, and execution control.</h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  <Blocks className="h-4 w-4 text-rose-700" />
                  Orchestration Layer
                </div>
                <p className="text-sm text-slate-700">Agentic pipeline control with stage-wise observability.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  <Database className="h-4 w-4 text-rose-700" />
                  State Layer
                </div>
                <p className="text-sm text-slate-700">Single source of truth for telemetry, intelligence, and audit events.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-rose-700" />
                  Governance Layer
                </div>
                <p className="text-sm text-slate-700">Provider diagnostics and compliance context with traceable runtime messages.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  <BarChart3 className="h-4 w-4 text-rose-700" />
                  Output Layer
                </div>
                <p className="text-sm text-slate-700">Studio-ready content packaging with multilingual and briefing consistency.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onLogin}
                className="liquid-highlight inline-flex items-center gap-2 rounded-xl border border-rose-700 bg-rose-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110"
              >
                Open Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSignup}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-amber-500 hover:text-amber-700"
              >
                Create Account
              </button>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

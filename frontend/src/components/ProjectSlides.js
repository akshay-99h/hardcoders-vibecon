import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiArrowRight, HiCheckCircle, HiShieldCheck, HiSparkles } from 'react-icons/hi2';
import { Button } from './ui/button';

const SLIDES = [
  {
    id: 'cover',
    label: 'Opening',
  },
  {
    id: 'scorecard',
    label: 'Evaluation Fit',
  },
  {
    id: 'originality',
    label: 'Originality',
  },
  {
    id: 'validation',
    label: 'User Value',
  },
  {
    id: 'execution',
    label: 'Execution',
  },
  {
    id: 'market',
    label: 'Story + Market',
  },
  {
    id: 'emergent',
    label: 'Use of Emergent',
  },
  {
    id: 'team',
    label: 'Team Fit',
  },
  {
    id: 'swot',
    label: 'SWOT',
  },
  {
    id: 'lean-canvas',
    label: 'Lean Canvas',
  },
  {
    id: 'close',
    label: 'Close',
  },
];

const EVALUATION_CARDS = [
  {
    title: 'Originality & Clarity',
    answer: 'Mission-mode, action-first guidance.',
  },
  {
    title: 'Validation / User Value',
    answer: 'High-friction legal and gov workflows.',
  },
  {
    title: 'UI/UX + Polish + Robustness',
    answer: 'End-to-end paths with guardrails.',
  },
  {
    title: 'Storytelling + Market Potential',
    answer: 'Clear wedge and expansion path.',
  },
  {
    title: 'Use of Emergent',
    answer: 'Integrated auth + full-stack speed.',
  },
  {
    title: 'Team-Product Fit',
    answer: 'Domain + build + ship discipline.',
  },
];

function MetricCard({ title, answer }) {
  return (
    <div className="rounded-2xl border border-border bg-card/85 p-4 h-full">
      <div className="flex items-start gap-2.5">
        <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{answer}</p>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function SlideCard({ title, items, tone = 'default' }) {
  const toneClasses = tone === 'accent'
    ? 'border-primary/30 bg-primary/10'
    : tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : tone === 'warn'
        ? 'border-amber-500/35 bg-amber-500/10'
        : tone === 'danger'
          ? 'border-rose-500/35 bg-rose-500/10'
          : 'border-border bg-card/80';

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VectorAccent({ className = '' }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rakshaSlideGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.65" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="90" fill="none" stroke="url(#rakshaSlideGradient)" strokeWidth="2.5" />
      <circle cx="120" cy="120" r="62" fill="none" stroke="url(#rakshaSlideGradient)" strokeWidth="2" />
      <path d="M36 144 C 72 84, 136 76, 196 102" fill="none" stroke="url(#rakshaSlideGradient)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="72" cy="118" r="5.5" fill="currentColor" />
      <circle cx="170" cy="102" r="4.5" fill="currentColor" />
    </svg>
  );
}

function ProjectSlides() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);

  const activeSlide = SLIDES[slideIndex];

  const goPrev = useCallback(() => {
    setSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'textarea' || tagName === 'input' || tagName === 'select' || target.isContentEditable) {
          return;
        }
      }

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goPrev();
      }
      if (event.key === 'Home') {
        event.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, navigate]);

  const renderSlideContent = () => {
    switch (activeSlide.id) {
      case 'cover':
        return (
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.95fr]">
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-background to-background p-6 sm:p-8">
              <VectorAccent className="absolute -right-12 -top-10 h-44 w-44 text-primary/30" />
              <VectorAccent className="absolute -left-16 -bottom-16 h-52 w-52 text-primary/15" />
              <div className="flex items-center gap-2 text-primary mb-3">
                <HiShieldCheck className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">RakshaAI Project Deck</span>
              </div>
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-foreground leading-tight max-w-3xl">
                Legal + Financial Guidance,
                <span className="text-primary"> Ready to Execute</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl">
                A practical AI co-pilot for citizen-facing workflows, from clarity to action.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>Chat + Voice</Pill>
                <Pill>Document OCR</Pill>
                <Pill>Draft + Export</Pill>
                <Pill>Automation Ready</Pill>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-card/80 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Live Product Surface</h3>
                <div className="space-y-2">
                  {[
                    'Auth + session model',
                    'Mission chat workflows',
                    'Voice + AI call mode',
                    'Document analysis + generation',
                    'Usage & billing control',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <HiCheckCircle className="w-4 h-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-4">
                <VectorAccent className="absolute -right-8 -bottom-10 h-32 w-32 text-emerald-400/35" />
                <h3 className="text-sm font-semibold text-foreground mb-3">Demo Flow Snapshot</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Problem', 'Guidance', 'Draft', 'Export'].map((step) => (
                    <div key={step} className="rounded-xl border border-border bg-background/70 p-2.5 text-xs font-medium text-muted-foreground text-center">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'scorecard':
        return (
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.85fr]">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">How We Match The Judging Rubric</h2>
              <p className="text-sm text-muted-foreground mt-2">Each evaluation lens is mapped to a visible product proof.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {EVALUATION_CARDS.map((metric) => (
                  <MetricCard
                    key={metric.title}
                    title={metric.title}
                    answer={metric.answer}
                  />
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-5">
              <VectorAccent className="absolute -right-10 -top-8 h-32 w-32 text-primary/25" />
              <h3 className="text-sm font-semibold text-foreground mb-3">Narrative Arc</h3>
              <div className="space-y-3">
                {[
                  'Clear problem framing',
                  'Actionable workflow proof',
                  'Execution quality in live paths',
                  'Scalable GTM and team fit',
                ].map((item, idx) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'originality':
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <SlideCard
              title="Originality & Clarity"
              tone="accent"
              items={[
                'Insight: users need action packs, not long chat threads.',
                'Mission-mode structure converts guidance into steps.',
                'One product for legal, financial, and gov workflows.',
              ]}
            />
            <SlideCard
              title="Why This Is Different"
              items={[
                'Document-to-decision path in one flow.',
                'Voice + text + export in the same journey.',
                'Compliance-aware response style for citizen tasks.',
              ]}
            />
            <div className="rounded-2xl border border-border bg-card/80 p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-3">Pitch Line</h3>
              <p className="text-xl sm:text-2xl font-bold leading-tight text-foreground">
                "From confusion to execution in one assistant."
              </p>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid gap-3">
              <SlideCard
                title="Validation / User Value"
                tone="success"
                items={[
                  'Targets painful, high-stakes citizen moments.',
                  'Useful in first session: explain, draft, export.',
                  'Repeat use from notices, filings, follow-ups.',
                ]}
              />
              <div className="rounded-2xl border border-border bg-card/80 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Core Personas</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    'Salary earner with legal notice',
                    'Small business owner',
                    'Family managing govt paperwork',
                  ].map((persona) => (
                    <div key={persona} className="rounded-xl border border-border bg-background/80 p-3 text-sm text-muted-foreground">
                      {persona}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Value Loop In Demo</h3>
              <div className="space-y-3">
                {[
                  'Understand issue',
                  'Get step-by-step action',
                  'Generate official draft',
                  'Export and submit',
                  'Track and follow up',
                ].map((step, idx) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'execution':
        return (
          <div className="grid gap-4">
            <SlideCard
              title="UI/UX, Execution, Polish & Robustness"
              tone="accent"
              items={[
                'Working paths: chat, voice, docs, export, billing.',
                'Fast-first interaction with action controls.',
                'Consistent state handling and conversation continuity.',
              ]}
            />
            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">End-to-End Path</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {['Auth', 'Ask', 'Analyze', 'Act', 'Export', 'Follow-Up'].map((step) => (
                  <div key={step} className="rounded-xl border border-border bg-background/80 p-3 text-center text-sm text-muted-foreground font-medium">
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                'Session token validation',
                'Quota + feature limit checks',
                'File type + size guardrails',
                'Error fallback messaging',
              ].map((guardrail) => (
                <div key={guardrail} className="rounded-xl border border-border bg-card/80 p-3 text-sm text-muted-foreground">
                  {guardrail}
                </div>
              ))}
            </div>
          </div>
        );

      case 'market':
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <SlideCard
              title="Storytelling + Market Potential"
              tone="accent"
              items={[
                'Why now: rising digital service dependence.',
                'Why us: end-to-end workflow product, not chatbot only.',
                'Narrative: clarity -> confidence -> completion.',
              ]}
            />
            <SlideCard
              title="Route To First 100 Users"
              items={[
                'Community legal clinics + civic groups.',
                'Targeted WhatsApp and local community channels.',
                'Referral flywheel from solved cases.',
              ]}
            />
            <SlideCard
              title="Path To 1–10K MRR"
              tone="success"
              items={[
                'Free utility -> paid power workflows.',
                'Pro tier for heavy repeat users.',
                'B2B2C partnerships with service centers.',
              ]}
            />
            <SlideCard
              title="Market Ceiling"
              items={[
                'Large, recurring citizen workflow demand.',
                'Expansion to more filing categories.',
                'Long-term trust moat via execution quality.',
              ]}
            />
          </div>
        );

      case 'emergent':
        return (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <SlideCard
              title="Use of Emergent"
              tone="accent"
              items={[
                'OAuth-backed session flow integration.',
                'Rapid full-stack iteration across backend + frontend.',
                'Productized quickly with deployment-ready structure.',
              ]}
            />

            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Where Emergent Helped Most</h3>
              <div className="space-y-2">
                {[
                  'Authentication foundation',
                  'Scaffolded API routing',
                  'Fast iteration loops',
                  'Integration confidence',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HiSparkles className="w-4 h-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-5 lg:col-span-2">
              <p className="text-2xl font-bold text-foreground leading-tight">
                "Emergent accelerated build speed without compromising product depth."
              </p>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="grid gap-4">
            <SlideCard
              title="Team-Product Fit"
              tone="accent"
              items={[
                'Strong full-stack ownership of the product loop.',
                'Comfort with ambiguous, high-impact domains.',
                'Fast shipping with practical quality checks.',
              ]}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card/80 p-4">
                <h3 className="text-sm font-semibold text-foreground">Domain Understanding</h3>
                <p className="mt-2 text-sm text-muted-foreground">Citizen pain points, procedural friction, trust barriers.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/80 p-4">
                <h3 className="text-sm font-semibold text-foreground">Execution Rhythm</h3>
                <p className="mt-2 text-sm text-muted-foreground">Feature build, test, iterate, polish in rapid cycles.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/80 p-4">
                <h3 className="text-sm font-semibold text-foreground">Operational Discipline</h3>
                <p className="mt-2 text-sm text-muted-foreground">Error paths, limits, and resilient defaults built in.</p>
              </div>
            </div>
          </div>
        );

      case 'swot':
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">SWOT Analysis</h2>
            <p className="mt-2 text-sm text-muted-foreground">Strategic view for launch and scale.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SlideCard
                title="Strengths"
                tone="success"
                items={[
                  'Integrated workflow depth',
                  'Practical, action-ready outputs',
                  'Multimodal interaction surface',
                ]}
              />
              <SlideCard
                title="Weaknesses"
                tone="warn"
                items={[
                  'Trust-building still in progress',
                  'Needs stronger live field validation',
                  'Limited early distribution channels',
                ]}
              />
              <SlideCard
                title="Opportunities"
                tone="accent"
                items={[
                  'Large underserved citizen segment',
                  'Partnership-led distribution',
                  'Category expansion across workflows',
                ]}
              />
              <SlideCard
                title="Threats"
                tone="danger"
                items={[
                  'Generic assistant competition',
                  'Regulatory or policy shifts',
                  'Slow adoption without trust signals',
                ]}
              />
            </div>
          </div>
        );

      case 'lean-canvas':
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Bento Lean Canvas</h2>
            <p className="mt-2 text-sm text-muted-foreground">Compact operating model for the business.</p>
            <div className="mt-5 grid gap-3 grid-cols-1 md:grid-cols-12">
              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-4">
                <h3 className="text-sm font-semibold text-foreground">Problem</h3>
                <p className="mt-2 text-sm text-muted-foreground">Legal and financial workflows are confusing, slow, and high-stress.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-4">
                <h3 className="text-sm font-semibold text-foreground">Customer Segments</h3>
                <p className="mt-2 text-sm text-muted-foreground">Citizens, small businesses, families managing government paperwork.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-4">
                <h3 className="text-sm font-semibold text-foreground">Unique Value</h3>
                <p className="mt-2 text-sm text-muted-foreground">One assistant from issue discovery to completed action.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-6">
                <h3 className="text-sm font-semibold text-foreground">Solution</h3>
                <p className="mt-2 text-sm text-muted-foreground">Guided workflows, AI drafts, document parsing, export-ready outputs.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-3">
                <h3 className="text-sm font-semibold text-foreground">Channels</h3>
                <p className="mt-2 text-sm text-muted-foreground">Community outreach, legal networks, referral loops.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-3">
                <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
                <p className="mt-2 text-sm text-muted-foreground">Freemium to paid plans and partner-led distribution.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-4">
                <h3 className="text-sm font-semibold text-foreground">Cost Structure</h3>
                <p className="mt-2 text-sm text-muted-foreground">Model inference, infra hosting, support, and product iteration.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-4">
                <h3 className="text-sm font-semibold text-foreground">Key Metrics</h3>
                <p className="mt-2 text-sm text-muted-foreground">Activation, completion rate, repeat workflows, conversion.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/85 p-4 md:col-span-4">
                <h3 className="text-sm font-semibold text-foreground">Unfair Advantage</h3>
                <p className="mt-2 text-sm text-muted-foreground">Workflow-focused UX + execution quality + trust-centered design.</p>
              </div>
            </div>
          </div>
        );

      case 'close':
        return (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
              <h2 className="text-3xl sm:text-4xl font-black leading-tight text-foreground">
                RakshaAI is built for
                <span className="text-primary"> real outcomes.</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                Product depth, evaluation fit, and clear path to adoption.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>All rubric dimensions covered</Pill>
                <Pill>Live end-to-end product</Pill>
                <Pill>Scale-ready direction</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Demo Sequence</h3>
              <div className="space-y-2">
                {[
                  'Problem setup',
                  'Live guided workflow',
                  'Draft + export output',
                  'Automation extension handoff',
                ].map((item, idx) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(15,73,189,0.18),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_50%_95%,rgba(15,73,189,0.12),transparent_45%)]" />
      <VectorAccent className="pointer-events-none absolute -left-20 top-24 h-72 w-72 text-primary/10" />
      <VectorAccent className="pointer-events-none absolute -right-20 bottom-16 h-80 w-80 text-emerald-400/10" />

      <div className="relative max-w-[1280px] mx-auto px-3 sm:px-6 pt-5 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <HiShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Presentation Mode</p>
              <p className="text-sm font-semibold text-foreground">RakshaAI Evaluation Deck</p>
            </div>
          </div>
          <p className="hidden sm:block text-xs text-muted-foreground">Use keyboard: ← / →</p>
        </div>

        <div className="rounded-3xl border border-border bg-background/75 backdrop-blur-sm shadow-lg p-3 sm:p-5">
          <div className="mb-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2 pr-2">
            {SLIDES.map((slide, index) => {
              const isActive = index === slideIndex;
              return (
                <button
                  key={slide.id}
                  onClick={() => setSlideIndex(index)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {index + 1}. {slide.label}
                </button>
              );
            })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.section
              key={activeSlide.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-4 sm:p-6 min-h-[58vh]"
            >
              <VectorAccent className="absolute -right-16 top-8 h-40 w-40 text-primary/12" />
              <VectorAccent className="absolute -left-16 bottom-4 h-36 w-36 text-emerald-400/15" />
              {renderSlideContent()}
            </motion.section>
          </AnimatePresence>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card/70 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={goPrev} disabled={slideIndex === 0}>
              <HiArrowLeft className="w-4 h-4" />
              Left
            </Button>
            <Button variant="default" onClick={() => navigate('/')}>
              Home
            </Button>
            <Button variant="outline" onClick={goNext} disabled={slideIndex === SLIDES.length - 1}>
              Right
              <HiArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground font-medium">
            Slide {slideIndex + 1} / {SLIDES.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectSlides;

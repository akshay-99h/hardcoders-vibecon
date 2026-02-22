import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiArrowRight, HiCheckCircle, HiShieldCheck, HiSparkles } from 'react-icons/hi2';
import { Button } from './ui/button';

const SLIDES = [
  {
    id: 'cover',
    label: 'Opening',
    notePrompt: 'Add your 20-second opening hook for this slide.',
  },
  {
    id: 'scorecard',
    label: 'Evaluation Fit',
    notePrompt: 'Add one sentence on how judges should score this.',
  },
  {
    id: 'originality',
    label: 'Originality',
    notePrompt: 'Add your strongest “why this is fresh” example.',
  },
  {
    id: 'validation',
    label: 'User Value',
    notePrompt: 'Add your real user pain story and expected impact.',
  },
  {
    id: 'execution',
    label: 'Execution',
    notePrompt: 'Add your favorite robust flow or edge-case save.',
  },
  {
    id: 'market',
    label: 'Story + Market',
    notePrompt: 'Add your first 100 users plan and pricing angle.',
  },
  {
    id: 'emergent',
    label: 'Use of Emergent',
    notePrompt: 'Add what was only possible because of Emergent.',
  },
  {
    id: 'team',
    label: 'Team Fit',
    notePrompt: 'Add team strengths and execution velocity proof.',
  },
  {
    id: 'swot',
    label: 'SWOT',
    notePrompt: 'Add 1 strategic move based on SWOT.',
  },
  {
    id: 'lean-canvas',
    label: 'Lean Canvas',
    notePrompt: 'Add your chosen wedge and GTM narrative.',
  },
  {
    id: 'close',
    label: 'Close',
    notePrompt: 'Add your final ask and demo call to action.',
  },
];

const EVALUATION_CARDS = [
  {
    title: 'Originality & Clarity',
    weight: 10,
    answer: 'Mission-mode, action-first guidance.',
  },
  {
    title: 'Validation / User Value',
    weight: 25,
    answer: 'High-friction legal and gov workflows.',
  },
  {
    title: 'UI/UX + Polish + Robustness',
    weight: 25,
    answer: 'End-to-end paths with guardrails.',
  },
  {
    title: 'Storytelling + Market Potential',
    weight: 15,
    answer: 'Clear wedge and expansion path.',
  },
  {
    title: 'Use of Emergent',
    weight: 15,
    answer: 'Integrated auth + full-stack speed.',
  },
  {
    title: 'Team-Product Fit',
    weight: 10,
    answer: 'Domain + build + ship discipline.',
  },
];

function MetricCard({ title, weight, answer }) {
  return (
    <div className="rounded-2xl border border-border bg-card/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs font-semibold rounded-full bg-primary/12 text-primary px-2 py-1">{weight}%</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${weight * 4}%` }} />
      </div>
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

function ProjectSlides() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);
  const [speakerNotes, setSpeakerNotes] = useState(() => {
    try {
      const raw = window.localStorage.getItem('raksha_slides_notes_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const activeSlide = SLIDES[slideIndex];

  const goPrev = useCallback(() => {
    setSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
  }, []);

  useEffect(() => {
    window.localStorage.setItem('raksha_slides_notes_v1', JSON.stringify(speakerNotes));
  }, [speakerNotes]);

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

  const updateNote = (value) => {
    setSpeakerNotes((prev) => ({
      ...prev,
      [activeSlide.id]: value,
    }));
  };

  const renderSlideContent = () => {
    switch (activeSlide.id) {
      case 'cover':
        return (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-background to-background p-6 sm:p-8">
              <div className="flex items-center gap-2 text-primary mb-3">
                <HiShieldCheck className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">RakshaAI Project Deck</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-foreground leading-tight">
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
                <h3 className="text-sm font-semibold text-foreground mb-3">Evaluation Coverage</h3>
                <div className="space-y-2">
                  {EVALUATION_CARDS.map((metric) => (
                    <div key={metric.title} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{metric.title}</span>
                      <span className="font-semibold text-foreground">{metric.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>

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
            </div>
          </div>
        );

      case 'scorecard':
        return (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">How We Match The Judging Rubric</h2>
            <p className="text-sm text-muted-foreground mt-2">Each metric is addressed with a direct product proof.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EVALUATION_CARDS.map((metric) => (
                <MetricCard
                  key={metric.title}
                  title={metric.title}
                  weight={metric.weight}
                  answer={metric.answer}
                />
              ))}
            </div>
          </div>
        );

      case 'originality':
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <SlideCard
              title="Originality & Clarity (10%)"
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
                title="Validation / User Value (25%)"
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
              title="UI/UX, Execution, Polish & Robustness (25%)"
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
              title="Storytelling + Market Potential (15%)"
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
              title="Use of Emergent (15%)"
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
              title="Team-Product Fit (10%)"
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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(15,73,189,0.18),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_50%_95%,rgba(15,73,189,0.12),transparent_45%)]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <HiShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Presentation Mode</p>
              <p className="text-sm font-semibold text-foreground">RakshaAI Evaluation Deck</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Use keyboard: ← / →</p>
        </div>

        <div className="rounded-3xl border border-border bg-background/75 backdrop-blur-sm shadow-lg p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-2">
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

          <AnimatePresence mode="wait">
            <motion.section
              key={activeSlide.id}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl border border-border bg-card/40 p-4 sm:p-6"
            >
              {renderSlideContent()}

              <div className="mt-5 rounded-2xl border border-dashed border-border bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Pointers</p>
                  <p className="text-xs text-muted-foreground">Saved locally on this browser</p>
                </div>
                <textarea
                  value={speakerNotes[activeSlide.id] || ''}
                  onChange={(event) => updateNote(event.target.value)}
                  placeholder={activeSlide.notePrompt}
                  className="w-full min-h-[95px] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </motion.section>
          </AnimatePresence>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card/70 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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

          <div className="text-sm text-muted-foreground font-medium">
            Slide {slideIndex + 1} / {SLIDES.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectSlides;

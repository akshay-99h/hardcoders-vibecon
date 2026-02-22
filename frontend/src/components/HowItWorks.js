import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiShieldCheck, HiCheckCircle, HiSparkles } from 'react-icons/hi2';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/translations';
import LanguageToggle from './LanguageToggle';

function HowItWorks() {
  const { language } = useLanguage();

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

  const features = [
    {
      icon: <HiShieldCheck className="w-6 h-6" />,
      title: t(language, 'howItWorks.feature1Title'),
      description: t(language, 'howItWorks.feature1Desc')
    },
    {
      icon: <HiSparkles className="w-6 h-6" />,
      title: t(language, 'howItWorks.feature2Title'),
      description: t(language, 'howItWorks.feature2Desc')
    },
    {
      icon: <HiCheckCircle className="w-6 h-6" />,
      title: t(language, 'howItWorks.feature3Title'),
      description: t(language, 'howItWorks.feature3Desc')
    }
  ];

  const timelineSteps = [1, 2, 3, 4].map((stepNum) => ({
    stepNum,
    title: t(language, `howItWorks.step${stepNum}Title`),
    description: t(language, `howItWorks.step${stepNum}Desc`)
  }));

  const renderTimelinePreview = (stepNum) => {
    if (stepNum === 1) {
      return (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">U</span>
            </div>
            <div className="flex-1">
              <div className="h-2 w-20 rounded-full bg-primary/20 mb-1.5" />
              <div className="h-2 w-14 rounded-full bg-muted" />
            </div>
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4m-2 0h12v9H6v-9z" />
              </svg>
            </div>
          </div>
          <div className="rounded-md bg-muted/50 border border-border px-2.5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center text-[9px] font-bold text-blue-600">
                G
              </div>
              <div className="h-1.5 w-16 rounded-full bg-muted-foreground/25" />
            </div>
            <div className="w-5 h-5 rounded bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
              +
            </div>
          </div>
        </div>
      );
    }

    if (stepNum === 2) {
      return (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="space-y-2 mb-3">
            <div className="max-w-[82%] rounded-xl rounded-tl-sm bg-primary/10 border border-primary/20 px-2.5 py-2">
              <div className="h-1.5 w-20 rounded-full bg-primary/35 mb-1.5" />
              <div className="h-1.5 w-14 rounded-full bg-primary/25" />
            </div>
            <div className="max-w-[84%] ml-auto rounded-xl rounded-tr-sm bg-muted border border-border px-2.5 py-2">
              <div className="h-1.5 w-24 rounded-full bg-muted-foreground/25 mb-1.5" />
              <div className="h-1.5 w-16 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background px-2.5 py-2 flex items-center gap-2">
            <div className="h-1.5 w-full rounded-full bg-muted" />
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-4-4l4 4-4 4" />
              </svg>
            </div>
          </div>
        </div>
      );
    }

    if (stepNum === 3) {
      return (
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex-1 rounded-md border border-border bg-muted/40 p-2.5">
              <div className="h-2 w-16 rounded-full bg-primary/25 mb-2.5" />
              <div className="space-y-2">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-700 text-[9px] flex items-center justify-center font-bold">
                      {idx}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted-foreground/20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center">
              <HiSparkles className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mt-2.5 h-2 w-28 rounded-full bg-muted-foreground/20" />
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <div className="mb-3">
          <div className="h-2 rounded-full bg-muted mb-2">
            <div className="h-2 w-[72%] rounded-full bg-primary/60" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="rounded-md border border-border bg-muted/40 px-2 py-1.5 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-primary/15 text-[9px] font-semibold text-primary flex items-center justify-center">
                  {idx}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="h-1.5 w-20 rounded-full bg-muted-foreground/20" />
          <div className="h-1.5 w-14 rounded-full bg-primary/45" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HiArrowLeft className="w-5 h-5" />
            <span>{t(language, 'howItWorks.backToHome')}</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <HiShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">{t(language, 'rakshaAI')}</span>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            {t(language, 'howItWorks.title')}
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            {t(language, 'howItWorks.subtitle')}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                className="group p-6 rounded-lg bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <div className="text-primary">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mb-16"
          >
            <div className="rounded-2xl border border-border/80 bg-card/50 p-4 sm:p-6 lg:p-8">
              <div className="mb-8 flex items-center justify-between gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {t(language, 'landingPage.seeHowItWorks')}
                </h2>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {timelineSteps.length} Steps
                </span>
              </div>

              <div className="relative mx-auto max-w-3xl pl-8 sm:pl-10 lg:pl-14">
                <div className="absolute left-[11px] sm:left-[13px] lg:left-[23px] top-2 bottom-2 w-px lg:w-0.5 bg-gradient-to-b from-primary/55 via-primary/35 to-border" />
                <div className="space-y-4 lg:space-y-5">
                  {timelineSteps.map((step, index) => (
                    <motion.article
                      key={step.stepNum}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.2 + index * 0.08 }}
                      className="relative rounded-xl border border-border bg-background p-4 lg:p-5 shadow-sm"
                    >
                      <div className="absolute -left-[34px] sm:-left-[38px] lg:-left-[52px] top-5 lg:top-6 w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-primary bg-background text-primary text-xs lg:text-sm font-semibold flex items-center justify-center">
                        {step.stepNum}
                      </div>
                      <h3 className="text-base lg:text-lg font-semibold text-foreground mb-1.5">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      {renderTimelinePreview(step.stepNum)}
                    </motion.article>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-card border border-border rounded-lg p-8 text-center"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {t(language, 'howItWorks.readyTitle')}
            </h3>
            <p className="text-base text-muted-foreground mb-6">
              {t(language, 'howItWorks.readyDesc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => {
                  const redirectUrl = window.location.origin + '/chat';
                  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
                }}
              >
                {t(language, 'howItWorks.getStartedNow')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  window.location.href = '/slides';
                }}
              >
                View Slides
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="border-t border-border mt-20 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => window.location.href = '/terms'} className="hover:text-foreground transition-colors">
              {t(language, 'landingPage.termsOfService')}
            </button>
            <button onClick={() => window.location.href = '/privacy'} className="hover:text-foreground transition-colors">
              {t(language, 'landingPage.privacyPolicy')}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{t(language, 'landingPage.copyright')}</p>
        </div>
      </div>
    </div>
  );
}

export default HowItWorks;

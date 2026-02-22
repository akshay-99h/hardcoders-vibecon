import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiShieldCheck, HiCheckCircle, HiSparkles } from 'react-icons/hi2';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/translations';
import LanguageToggle from './LanguageToggle';

function HowItWorks() {
  const [theme, setTheme] = useState('light');
  const { language } = useLanguage();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    
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

  const renderStepGraphic = (stepNum) => {
    if (stepNum === 1) {
      return (
        <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">U</span>
            </div>
            <div className="flex-1">
              <div className="h-2.5 w-24 rounded-full bg-primary/20 mb-1.5" />
              <div className="h-2.5 w-16 rounded-full bg-muted" />
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4m-2 0h12v9H6v-9z" />
              </svg>
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-[10px] font-bold text-blue-600">
                G
              </div>
              <div className="h-2 w-24 rounded-full bg-muted-foreground/25" />
            </div>
            <div className="w-5 h-5 rounded bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              +
            </div>
          </div>
        </div>
      );
    }

    if (stepNum === 2) {
      return (
        <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="space-y-2.5 mb-4">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-primary/10 border border-primary/20 px-3 py-2">
              <div className="h-2 w-32 rounded-full bg-primary/35 mb-1.5" />
              <div className="h-2 w-20 rounded-full bg-primary/25" />
            </div>
            <div className="max-w-[84%] ml-auto rounded-2xl rounded-tr-sm bg-muted border border-border px-3 py-2">
              <div className="h-2 w-36 rounded-full bg-muted-foreground/25 mb-1.5" />
              <div className="h-2 w-28 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2 flex items-center gap-2">
            <div className="h-2 w-full rounded-full bg-muted" />
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-4-4l4 4-4 4" />
              </svg>
            </div>
          </div>
        </div>
      );
    }

    if (stepNum === 3) {
      return (
        <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex-1 rounded-lg border border-border bg-muted/40 p-3">
              <div className="h-2.5 w-24 rounded-full bg-primary/25 mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-700 text-[10px] flex items-center justify-center font-bold">
                      {idx}
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted-foreground/20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
              <HiSparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-3 h-2.5 w-40 rounded-full bg-muted-foreground/20" />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="mb-4">
          <div className="h-2.5 rounded-full bg-muted mb-2">
            <div className="h-2.5 w-[75%] rounded-full bg-primary/60" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="rounded-md border border-border bg-muted/40 px-2 py-2 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-primary/15 text-[10px] font-semibold text-primary flex items-center justify-center">
                  {idx}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="h-2 w-24 rounded-full bg-muted-foreground/20" />
          <div className="h-2 w-20 rounded-full bg-primary/45" />
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

          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + stepNum * 0.1 }}
                className="mb-8"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{stepNum}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {t(language, `howItWorks.step${stepNum}Title`)}
                  </h2>
                </div>
                <p className="text-base text-muted-foreground mb-6 ml-0 sm:ml-16">
                  {t(language, `howItWorks.step${stepNum}Desc`)}
                </p>
                <div className="ml-0 sm:ml-16 rounded-lg border-2 border-border/70 bg-muted/20 p-4 sm:p-6">
                  {renderStepGraphic(stepNum)}
                </div>
              </motion.div>
            </div>
          ))}

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
            <Button
              size="lg"
              onClick={() => {
                const redirectUrl = window.location.origin + '/chat';
                window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
            >
              {t(language, 'howItWorks.getStartedNow')}
            </Button>
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

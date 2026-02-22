import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowRight, HiSun, HiMoon, HiShieldCheck } from 'react-icons/hi2';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/translations';
import LanguageToggle from './LanguageToggle';
import { BackgroundSnippets } from './ui/background-snippets';
import DotBackdrop from './ui/demo';

function LandingPage() {
  const [theme, setTheme] = useState('light');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    setIsDropdownOpen(false);
  };

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/chat';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen lg:h-screen bg-background transition-colors duration-300 overflow-x-hidden relative">
      <BackgroundSnippets />
      <DotBackdrop />
      <div className="absolute inset-0 -z-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute left-4 top-4 sm:left-6 sm:top-6 z-40"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
            <HiShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-primary">{t(language, 'rakshaAI')}</span>
        </div>
      </motion.div>
      
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 z-50 flex items-center gap-2">
        <LanguageToggle />
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors text-xs sm:text-sm font-medium text-foreground"
          >
            {theme === 'dark' ? <HiMoon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <HiSun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span className="hidden sm:inline capitalize">{theme}</span>
            <svg className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform", isDropdownOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDropdownOpen && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute right-0 mt-2 w-32 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
              <button onClick={() => handleThemeChange('light')} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors", theme === 'light' ? "bg-accent text-accent-foreground" : "text-foreground")}>
                <HiSun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button onClick={() => handleThemeChange('dark')} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors", theme === 'dark' ? "bg-accent text-accent-foreground" : "text-foreground")}>
                <HiMoon className="w-4 h-4" />
                <span>Dark</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-8 lg:py-8 flex items-center justify-center min-h-screen lg:min-h-0 lg:h-full">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              {t(language, 'landingPage.heroTitle')}{' '}
              <span className="text-primary">{t(language, 'landingPage.heroTitleHighlight')}</span>{' '}
              {t(language, 'landingPage.heroTitleEnd')}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 lg:mb-10 max-w-2xl mx-auto lg:mx-0">
              {t(language, 'landingPage.heroDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8 lg:mb-10 justify-center lg:justify-start">
              <Button onClick={handleLogin} size="lg" className="group">
                <span>{t(language, 'landingPage.getStarted')}</span>
                <HiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.location.href = '/how-it-works'}>
                {t(language, 'landingPage.seeHowItWorks')}
              </Button>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.8 }} className="hidden lg:flex flex-col gap-3">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <button onClick={() => window.location.href = '/terms'} className="hover:text-foreground transition-colors">
                  {t(language, 'landingPage.termsOfService')}
                </button>
                <button onClick={() => window.location.href = '/privacy'} className="hover:text-foreground transition-colors">
                  {t(language, 'landingPage.privacyPolicy')}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{t(language, 'landingPage.copyright')}</p>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative hidden lg:block">
            <div className="relative mx-auto w-full max-w-md xl:max-w-lg">
              <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-r from-primary/35 via-primary/10 to-transparent blur-xl opacity-70"></div>
              <div className="relative max-h-[72vh] overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-2xl">
                <img
                  src="/images/comic-strip.png"
                  alt="RakshaAI helping a citizen understand a legal notice"
                  className="w-full h-full object-contain object-top"
                  loading="eager"
                  onError={(event) => {
                    event.currentTarget.src = 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.8 }} className="lg:hidden mt-10 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <button onClick={() => window.location.href = '/terms'} className="hover:text-foreground transition-colors">{t(language, 'landingPage.termsOfService')}</button>
            <button onClick={() => window.location.href = '/privacy'} className="hover:text-foreground transition-colors">{t(language, 'landingPage.privacyPolicy')}</button>
          </div>
          <p className="text-sm text-muted-foreground">{t(language, 'landingPage.copyright')}</p>
        </motion.div>
      </div>
    </div>
  );
}

export default LandingPage;

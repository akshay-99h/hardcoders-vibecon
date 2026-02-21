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
                <p className="text-base text-muted-foreground mb-6 ml-16">
                  {t(language, `howItWorks.step${stepNum}Desc`)}
                </p>
                <div className="ml-16 rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(language, 'howItWorks.imagePlaceholder')}</p>
                  </div>
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

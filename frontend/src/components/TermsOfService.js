import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiShieldCheck } from 'react-icons/hi2';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/translations';
import LanguageToggle from './LanguageToggle';

function TermsOfService() {
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
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            {t(language, 'terms.title')}
          </h1>
          <p className="text-base text-muted-foreground mb-12">
            {t(language, 'terms.lastUpdated')}
          </p>

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <h2>{t(language, 'terms.agreement')}</h2>
            <p className="text-muted-foreground">
              These Terms of Service govern your access to and use of RakshaAI's services. By accessing or using our Services, you agree to be bound by these Terms.
            </p>

            <div className="mt-12 p-4 bg-card border border-border rounded-lg">
              <p className="text-base text-foreground font-medium">{t(language, 'rakshaAI')}</p>
              <p className="text-base text-muted-foreground">{t(language, 'terms.email')}</p>
            </div>
          </div>
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

export default TermsOfService;

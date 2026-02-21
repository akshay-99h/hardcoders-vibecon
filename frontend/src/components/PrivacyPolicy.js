import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiShieldCheck } from 'react-icons/hi2';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../lib/translations';
import LanguageToggle from './LanguageToggle';

function PrivacyPolicy() {
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
            {t(language, 'privacy.title')}
          </h1>
          <p className="text-base text-muted-foreground mb-12">
            {t(language, 'privacy.lastUpdated')}
          </p>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.introTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {t(language, 'privacy.introPara1')}
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t(language, 'privacy.introPara2')}
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.infoCollectTitle')}</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">{t(language, 'privacy.personalInfoTitle')}</h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {t(language, 'privacy.personalInfoDesc')}
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4 mb-4">
              <li>{t(language, 'privacy.personalInfo1')}</li>
              <li>{t(language, 'privacy.personalInfo2')}</li>
              <li>{t(language, 'privacy.personalInfo3')}</li>
              <li>{t(language, 'privacy.personalInfo4')}</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">{t(language, 'privacy.usageInfoTitle')}</h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {t(language, 'privacy.usageInfoDesc')}
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>{t(language, 'privacy.usageInfo1')}</li>
              <li>{t(language, 'privacy.usageInfo2')}</li>
              <li>{t(language, 'privacy.usageInfo3')}</li>
              <li>{t(language, 'privacy.usageInfo4')}</li>
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.howWeUseTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {t(language, 'privacy.howWeUseDesc')}
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>{t(language, 'privacy.howWeUse1')}</li>
              <li>{t(language, 'privacy.howWeUse2')}</li>
              <li>{t(language, 'privacy.howWeUse3')}</li>
              <li>{t(language, 'privacy.howWeUse4')}</li>
              <li>{t(language, 'privacy.howWeUse5')}</li>
              <li>{t(language, 'privacy.howWeUse6')}</li>
              <li>{t(language, 'privacy.howWeUse7')}</li>
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.dataSecurityTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {t(language, 'privacy.dataSecurityDesc')}
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>{t(language, 'privacy.dataSecurity1')}</li>
              <li>{t(language, 'privacy.dataSecurity2')}</li>
              <li>{t(language, 'privacy.dataSecurity3')}</li>
              <li>{t(language, 'privacy.dataSecurity4')}</li>
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.dataRetentionTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t(language, 'privacy.dataRetentionDesc')}
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.yourRightsTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {t(language, 'privacy.yourRightsDesc')}
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>{t(language, 'privacy.yourRights1')}</li>
              <li>{t(language, 'privacy.yourRights2')}</li>
              <li>{t(language, 'privacy.yourRights3')}</li>
              <li>{t(language, 'privacy.yourRights4')}</li>
              <li>{t(language, 'privacy.yourRights5')}</li>
              <li>{t(language, 'privacy.yourRights6')}</li>
            </ul>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.thirdPartyTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t(language, 'privacy.thirdPartyDesc')}
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.childrenTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t(language, 'privacy.childrenDesc')}
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.changesTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t(language, 'privacy.changesDesc')}
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t(language, 'privacy.contactTitle')}</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              {t(language, 'privacy.contactDesc')}
            </p>
            <div className="mt-4 p-4 bg-card border border-border rounded-lg">
              <p className="text-base text-foreground font-medium">{t(language, 'rakshaAI')}</p>
              <p className="text-base text-muted-foreground">{t(language, 'privacy.email')}</p>
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

export default PrivacyPolicy;

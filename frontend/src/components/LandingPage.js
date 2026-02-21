import React, { useState, useEffect } from 'react';
import { HiArrowRight } from 'react-icons/hi';

function LandingPage() {
  const [theme, setTheme] = useState('auto');

  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // Auto - use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    
    applyTheme();
  }, [theme]);

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/chat';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const backgroundWords = [
    { text: 'CLARITY', rotation: -15, top: '10%', left: '8%' },
    { text: 'SIMPLIFIED', rotation: 8, top: '25%', right: '12%' },
    { text: 'PROTECTION', rotation: -12, top: '45%', left: '5%' },
    { text: 'GUIDANCE', rotation: 10, bottom: '35%', right: '8%' },
    { text: 'CONFIDENCE', rotation: -8, bottom: '15%', left: '10%' },
    { text: 'LEGAL MADE SIMPLE', rotation: 5, top: '65%', right: '15%' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center gap-1 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-full p-1 border border-white/20">
          {['auto', 'dark', 'light'].map((mode) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                theme === mode
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {mode === 'auto' && '⚡'}
              {mode === 'dark' && '🌙'}
              {mode === 'light' && '☀️'}
              <span className="ml-1 capitalize">{mode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* LEFT SIDE - Dark Gradient with Content Box */}
      <div className="w-full md:w-1/2 relative overflow-hidden flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1b2a] to-[#050a14]">
        {/* Background Words - ONLY outside content box */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          {backgroundWords.map((word, index) => (
            <div
              key={index}
              className="absolute text-6xl md:text-7xl lg:text-8xl font-black text-white/5 blur-[1px]"
              style={{
                top: word.top,
                bottom: word.bottom,
                left: word.left,
                right: word.right,
                transform: `rotate(${word.rotation}deg)`,
              }}
            >
              {word.text}
            </div>
          ))}
        </div>

        {/* Vertical Divider */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>

        {/* Content Box */}
        <div className="relative z-10 max-w-xl mx-8 md:mx-16 lg:mx-20">
          <div 
            className="bg-gradient-to-br from-white/[0.07] to-white/[0.03] backdrop-blur-xl rounded-3xl border border-blue-500/20 p-8 md:p-10 lg:p-12 shadow-2xl"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(59, 130, 246, 0.1)' }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L4 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-8-5z"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-white">Raksha AI</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] mb-6">
              <span className="text-white">Your Shield<br />for </span>
              <span 
                className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent"
                style={{ 
                  filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.3))',
                }}
              >
                Legal &<br />Financial
              </span>
              <span className="text-white"><br />Clarity</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              Upload notices, get expert advice, and navigate complex problems with ease. 
              We translate legal jargon into plain English.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleLogin}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-semibold text-white shadow-lg hover:shadow-blue-500/50 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ boxShadow: '0 10px 40px -10px rgba(59, 130, 246, 0.5)' }}
              >
                <span>Get Started</span>
                <HiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                className="px-8 py-4 bg-white/5 backdrop-blur border border-white/10 rounded-xl font-semibold text-white hover:bg-white/10 transition-all duration-200"
              >
                See How It Works
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Comic Strip */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#2a2520] dark:to-[#1a1614] flex items-center justify-center p-8 transition-colors duration-300">
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{ 
            maxHeight: 'min(85vh, 720px)',
            boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3)'
          }}
        >
          <img 
            src="/images/comic-strip.png" 
            alt="Raksha AI - How it works: A story of getting help with legal notices" 
            className="w-full h-auto object-contain"
            style={{ maxHeight: 'min(85vh, 720px)' }}
          />
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

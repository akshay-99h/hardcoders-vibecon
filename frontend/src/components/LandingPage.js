import React, { useState, useEffect } from 'react';
import { HiArrowRight, HiSun, HiMoon } from 'react-icons/hi';

function LandingPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/chat';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background transition-colors duration-300">
      {/* Theme Toggle - Simple minimal design */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="absolute top-6 right-6 p-2 rounded-lg hover:bg-accent transition-colors z-10"
        title="Toggle theme"
      >
        {isDark ? (
          <HiSun className="w-5 h-5 text-foreground" />
        ) : (
          <HiMoon className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* LEFT SIDE - Clean minimal content */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-8 md:px-16 lg:px-24 py-16 relative">
        {/* Logo */}
        <div className="mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-8-5z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-primary">Raksha AI</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-xl w-full">
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            Your Shield for{' '}
            <span className="text-primary">Legal & Financial</span>{' '}
            Clarity
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            Upload notices, get expert advice, and navigate complex problems with ease. 
            We translate legal jargon into plain English.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleLogin}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              <span>Get Started</span>
              <HiArrowRight className="w-5 h-5" />
            </button>

            <button
              className="px-6 py-3 bg-card border border-border rounded-lg font-semibold text-foreground hover:bg-accent transition-colors"
            >
              See How It Works
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 px-8">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Terms of Service</button>
            <button className="hover:text-foreground transition-colors">Privacy Policy</button>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 Raksha AI</p>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="hidden md:block w-px bg-border"></div>

      {/* RIGHT SIDE - Comic Strip */}
      <div className="w-full md:w-1/2 bg-muted flex items-center justify-center p-8 transition-colors duration-300">
        <div className="w-full max-w-2xl">
          <img 
            src="/images/comic-strip.png" 
            alt="Raksha AI - How it works" 
            className="w-full h-auto object-contain rounded-lg"
            style={{ maxHeight: 'min(85vh, 720px)' }}
          />
        </div>
      </div>
    </div>
  );
}

export default LandingPage;

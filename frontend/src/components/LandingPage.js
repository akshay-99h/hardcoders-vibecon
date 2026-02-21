import React, { useState, useEffect } from 'react';

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
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    // Open in popup window for better UX
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      authUrl,
      'Google Sign In',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no`
    );

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Fallback to redirect if popup blocked
      window.location.href = authUrl;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background transition-colors duration-300">
      {/* LEFT SIDE - Clean Google-style SaaS UI with background pattern (50%) */}
      <div className="w-full md:w-1/2 bg-background flex flex-col justify-between items-center px-8 md:px-16 lg:px-24 py-12 md:py-16 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none select-none overflow-hidden">
          <div className="absolute inset-0 text-xs font-mono text-foreground dark:text-gray-500 whitespace-pre" style={{ 
            lineHeight: '1.8',
            letterSpacing: '0.3em',
            transform: 'rotate(-12deg) scale(1.5)',
            transformOrigin: 'center'
          }}>
            {Array(50).fill(null).map((_, i) => (
              <div key={i} className="opacity-50">
                RAKSHA AI • LEGAL CLARITY • FINANCIAL FREEDOM • GOVT SERVICES • 
              </div>
            ))}
          </div>
          {/* Random dots and characters */}
          <div className="absolute inset-0">
            {Array(100).fill(null).map((_, i) => (
              <div
                key={i}
                className="absolute text-foreground dark:text-gray-600 opacity-20 dark:opacity-30"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  fontSize: `${Math.random() * 8 + 4}px`
                }}
              >
                {['•', '○', '□', '△', '◇', '⬡', '✦', '✧'][Math.floor(Math.random() * 8)]}
              </div>
            ))}
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="absolute top-6 right-6 p-2 rounded-lg hover:bg-accent transition-colors z-10"
          title="Toggle theme"
        >
          {isDark ? (
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Logo and Main Content - Centered */}
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-xl relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-16">
            <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-background" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-8-5z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-primary">Raksha AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-8 leading-tight">
            <span className="text-foreground">Your Shield</span>
            <br />
            <span className="text-foreground">for </span>
            <span className="text-primary">Legal &</span>
            <br />
            <span className="text-primary">Financial</span>
            <br />
            <span className="text-foreground">Clarity</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-muted-foreground text-lg md:text-xl text-center mb-12 leading-relaxed max-w-lg">
            Upload notices, get expert advice, and navigate complex problems with ease. We translate legal jargon into plain English.
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={handleLogin}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-card border border-border rounded-full hover:bg-accent transition-all shadow-sm hover:shadow-md text-foreground font-medium text-base"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Login</span>
          </button>
        </div>

        {/* Footer Links */}
        <footer className="w-full flex flex-col items-center gap-4 pt-8 border-t border-border relative z-10">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Terms of Service</button>
            <button className="hover:text-foreground transition-colors">Privacy Policy</button>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 Raksha AI</p>
        </footer>
      </div>

      {/* RIGHT SIDE - Comic Strip Art (50%) */}
      <div className="w-full md:w-1/2 bg-[#fdf6e3] dark:bg-[#2a2520] flex items-center justify-center p-8 transition-colors duration-300">
        <img 
          src="/images/comic-strip.png" 
          alt="Raksha AI - How it works: A story of getting help with legal notices" 
          className="w-full h-auto max-h-[85vh] object-contain"
        />
      </div>
    </div>
  );
}

export default LandingPage;

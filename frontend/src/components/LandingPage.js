import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HiArrowRight, 
  HiSun, 
  HiMoon, 
  HiShieldCheck
} from 'react-icons/hi2';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

function LandingPage() {
  const [theme, setTheme] = useState('light');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Check system preference or localStorage
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
    <div className="min-h-screen bg-background transition-colors duration-300 overflow-hidden relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      {/* Theme Dropdown */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors text-sm font-medium text-foreground"
          >
            {theme === 'dark' ? (
              <HiMoon className="w-4 h-4" />
            ) : (
              <HiSun className="w-4 h-4" />
            )}
            <span className="capitalize">{theme}</span>
            <svg className={cn("w-4 h-4 transition-transform", isDropdownOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 w-32 rounded-md border border-border bg-popover shadow-lg overflow-hidden"
            >
              <button
                onClick={() => handleThemeChange('light')}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                  theme === 'light' ? "bg-accent text-accent-foreground" : "text-foreground"
                )}
              >
                <HiSun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                  theme === 'dark' ? "bg-accent text-accent-foreground" : "text-foreground"
                )}
              >
                <HiMoon className="w-4 h-4" />
                <span>Dark</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 flex items-center justify-center min-h-screen">
        {/* Logo - Top Left */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-0 left-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <HiShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-primary">HardCoders</span>
          </div>
        </motion.div>

        {/* Hero Section - Two Columns */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-left"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Your Shield for{' '}
              <span className="text-primary">Legal & Financial</span>{' '}
              Clarity
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-10">
              Upload notices, get expert advice, and navigate complex problems with ease. 
              We translate legal jargon into plain English.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleLogin}
                size="lg"
                className="group"
              >
                <span>Get Started</span>
                <HiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.href = '/how-it-works'}
              >
                See How It Works
              </Button>
            </div>
          </motion.div>

          {/* Right Column - Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 p-12 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground font-medium">Hero Image Placeholder</p>
                <p className="text-xs text-muted-foreground mt-2">Upload your image here</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => window.location.href = '/terms'} className="hover:text-foreground transition-colors">
              Terms of Service
            </button>
            <button onClick={() => window.location.href = '/privacy'} className="hover:text-foreground transition-colors">
              Privacy Policy
            </button>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 HardCoders</p>
        </motion.div>
      </div>
    </div>
  );
}

export default LandingPage;

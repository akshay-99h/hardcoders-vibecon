import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HiArrowRight, 
  HiSun, 
  HiMoon, 
  HiShieldCheck,
  HiCheckCircle,
  HiSparkles
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

  const features = [
    {
      icon: <SecurityCheckIcon size={24} />,
      title: "Secure & Private",
      description: "Your data is encrypted and never shared"
    },
    {
      icon: <Sparkles01Icon size={24} />,
      title: "AI-Powered",
      description: "Advanced AI to simplify complex processes"
    },
    {
      icon: <Tick02Icon size={24} />,
      title: "Easy to Use",
      description: "Step-by-step guidance for every task"
    }
  ];

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
              <Moon02Icon size={16} />
            ) : (
              <Sun03Icon size={16} />
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
                <Sun03Icon size={16} />
                <span>Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                  theme === 'dark' ? "bg-accent text-accent-foreground" : "text-foreground"
                )}
              >
                <Moon02Icon size={16} />
                <span>Dark</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 flex flex-col items-center justify-center min-h-screen">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <SecurityCheckIcon size={24} color="white" />
            </div>
            <span className="text-2xl font-bold text-primary">Raksha AI</span>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center max-w-4xl mb-12"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Your Shield for{' '}
            <span className="text-primary bg-clip-text">Legal & Financial</span>{' '}
            Clarity
          </h1>
          
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            Upload notices, get expert advice, and navigate complex problems with ease. 
            We translate legal jargon into plain English.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleLogin}
              size="lg"
              className="group"
            >
              <span>Get Started</span>
              <ArrowRight01Icon size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              variant="outline"
              size="lg"
            >
              See How It Works
            </Button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-16"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
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

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-20 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Terms of Service</button>
            <button className="hover:text-foreground transition-colors">Privacy Policy</button>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 Raksha AI</p>
        </motion.div>
      </div>
    </div>
  );
}

export default LandingPage;

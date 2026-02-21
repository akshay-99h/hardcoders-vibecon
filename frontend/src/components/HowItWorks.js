import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiShieldCheck, HiCheckCircle, HiSparkles } from 'react-icons/hi2';
import { Button } from './ui/button';

function HowItWorks() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check current theme from localStorage
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
      title: "Secure & Private",
      description: "Your data is encrypted and never shared"
    },
    {
      icon: <HiSparkles className="w-6 h-6" />,
      title: "AI-Powered",
      description: "Advanced AI to simplify complex processes"
    },
    {
      icon: <HiCheckCircle className="w-6 h-6" />,
      title: "Easy to Use",
      description: "Step-by-step guidance for every task"
    }
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HiArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <HiShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">RakshaAI</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Page Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            How It Works
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Get started with RakshaAI in just a few simple steps. Our platform makes it easy to navigate complex legal and financial processes.
          </p>

          {/* Feature Cards */}
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

          {/* Step 1 */}
          <div className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Create Your Account</h2>
              </div>
              <p className="text-base text-muted-foreground mb-6 ml-16">
                Click "Get Started" and sign in securely using your Google account. We use industry-standard authentication to keep your information safe.
              </p>
              {/* Image Placeholder */}
              <div className="ml-16 rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Image placeholder - Sign in screen</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Step 2 */}
          <div className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Start a Conversation</h2>
              </div>
              <p className="text-base text-muted-foreground mb-6 ml-16">
                Once logged in, you'll see the chat interface. Simply type your question or describe the legal/financial issue you're facing. Our AI assistant will guide you through the process.
              </p>
              {/* Image Placeholder */}
              <div className="ml-16 rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Image placeholder - Chat interface</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Step 3 */}
          <div className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Get Expert Guidance</h2>
              </div>
              <p className="text-base text-muted-foreground mb-6 ml-16">
                Our AI will analyze your situation and provide clear, step-by-step guidance. Get explanations in plain English, understand complex documents, and receive actionable advice.
              </p>
              {/* Image Placeholder */}
              <div className="ml-16 rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Image placeholder - AI response with guidance</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Step 4 */}
          <div className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Track Your Progress</h2>
              </div>
              <p className="text-base text-muted-foreground mb-6 ml-16">
                All your conversations are saved. You can return anytime to continue where you left off, review previous advice, or start a new conversation about a different topic.
              </p>
              {/* Image Placeholder */}
              <div className="ml-16 rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Image placeholder - Conversation history</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-card border border-border rounded-lg p-8 text-center"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-base text-muted-foreground mb-6">
              Join RakshaAI today and simplify your legal and financial journey.
            </p>
            <Button
              size="lg"
              onClick={() => {
                const redirectUrl = window.location.origin + '/chat';
                window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
            >
              Get Started Now
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-20 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => window.location.href = '/terms'} className="hover:text-foreground transition-colors">
              Terms of Service
            </button>
            <button onClick={() => window.location.href = '/privacy'} className="hover:text-foreground transition-colors">
              Privacy Policy
            </button>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 RakshaAI</p>
        </div>
      </div>
    </div>
  );
}

export default HowItWorks;

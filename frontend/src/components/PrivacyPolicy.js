import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiShieldCheck } from 'react-icons/hi2';

function PrivacyPolicy() {
  const [theme, setTheme] = useState('light');

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
            <span className="text-xl font-bold text-primary">HardCoders</span>
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
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Privacy Policy
          </h1>
          <p className="text-base text-muted-foreground mb-12">
            Last updated: January 2026
          </p>

          {/* Introduction */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              HardCoders ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our legal and financial guidance platform.
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.
            </p>
          </div>

          {/* Information We Collect */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Personal Information</h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              When you create an account through Google Authentication, we collect:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4 mb-4">
              <li>Your name</li>
              <li>Email address</li>
              <li>Google account ID</li>
              <li>Profile picture (if provided)</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Usage Information</h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We automatically collect certain information when you use our platform:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>Conversation history and chat messages</li>
              <li>Device information and browser type</li>
              <li>IP address and location data</li>
              <li>Usage patterns and preferences</li>
            </ul>
          </div>

          {/* How We Use Your Information */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Your Information</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>Provide, operate, and maintain our services</li>
              <li>Improve and personalize your experience</li>
              <li>Process your requests and provide customer support</li>
              <li>Send you updates and administrative information</li>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>

          {/* Data Security */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Data Security</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure data storage practices</li>
            </ul>
          </div>

          {/* Data Retention */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Data Retention</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
            </p>
          </div>

          {/* Your Rights */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </div>

          {/* Third-Party Services */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Services</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We use Google Authentication for secure login. Your use of Google Authentication is subject to Google's Privacy Policy. We do not share your personal information with third parties except as necessary to provide our services or as required by law.
            </p>
          </div>

          {/* Children's Privacy */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Children's Privacy</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </div>

          {/* Changes to This Policy */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Changes to This Policy</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </div>

          {/* Contact Us */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-card border border-border rounded-lg">
              <p className="text-base text-foreground font-medium">HardCoders</p>
              <p className="text-base text-muted-foreground">Email: privacy@hardcoders.com</p>
            </div>
          </div>
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
          <p className="text-sm text-muted-foreground">© 2026 HardCoders</p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;

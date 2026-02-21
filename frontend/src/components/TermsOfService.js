import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiShieldCheck } from 'react-icons/hi2';

function TermsOfService() {
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
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-base text-muted-foreground mb-12">
            Last updated: January 2026
          </p>

          {/* Introduction */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Agreement to Terms</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your access to and use of RakshaAI' services, including our website, applications, and any related services (collectively, the "Services").
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, do not use our Services.
            </p>
          </div>

          {/* Use of Services */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Use of Services</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Eligibility</h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              You must be at least 13 years old to use our Services. By using our Services, you represent and warrant that you meet this age requirement.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Account Registration</h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              To access certain features of our Services, you must register for an account using Google Authentication. You agree to:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </div>

          {/* Acceptable Use */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Acceptable Use</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>Use the Services for any illegal purpose or in violation of any laws</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the Services or servers</li>
              <li>Attempt to gain unauthorized access to any part of the Services</li>
              <li>Upload or transmit viruses, malware, or other malicious code</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Collect or store personal data of other users without consent</li>
              <li>Use automated systems to access the Services without permission</li>
            </ul>
          </div>

          {/* Content */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Content</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Your Content</h3>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              You retain ownership of any content you submit to the Services ("Your Content"). By submitting Your Content, you grant RakshaAI a worldwide, non-exclusive, royalty-free license to use, reproduce, and display Your Content solely to provide and improve the Services.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Our Content</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              All content provided by RakshaAI, including text, graphics, logos, and software, is owned by RakshaAI or its licensors and is protected by intellectual property laws. You may not use our content without our prior written permission.
            </p>
          </div>

          {/* Disclaimer of Warranties */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Disclaimer of Warranties</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. HARDCODERS DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-base text-muted-foreground leading-relaxed ml-4">
              <li>Merchantability and fitness for a particular purpose</li>
              <li>Accuracy, reliability, or completeness of information</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Security of data transmission</li>
            </ul>
          </div>

          {/* Not Legal Advice */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Not Legal or Financial Advice</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              The information and guidance provided through our Services are for informational purposes only and do not constitute legal, financial, or professional advice. You should consult with qualified professionals for advice specific to your situation. RakshaAI is not responsible for any actions you take based on information from our Services.
            </p>
          </div>

          {/* Limitation of Liability */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Limitation of Liability</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, HARDCODERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICES.
            </p>
          </div>

          {/* Indemnification */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Indemnification</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless RakshaAI and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising out of or related to your use of the Services or violation of these Terms.
            </p>
          </div>

          {/* Termination */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Termination</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We may terminate or suspend your access to the Services at any time, with or without cause or notice. Upon termination, your right to use the Services will immediately cease. You may also terminate your account at any time by contacting us.
            </p>
          </div>

          {/* Governing Law */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Governing Law</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which RakshaAI operates, without regard to its conflict of law provisions.
            </p>
          </div>

          {/* Changes to Terms */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Changes to Terms</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Services after such modifications constitutes your acceptance of the updated Terms.
            </p>
          </div>

          {/* Contact Information */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="mt-4 p-4 bg-card border border-border rounded-lg">
              <p className="text-base text-foreground font-medium">RakshaAI</p>
              <p className="text-base text-muted-foreground">Email: legal@hardcoders.com</p>
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
          <p className="text-sm text-muted-foreground">© 2026 RakshaAI</p>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;

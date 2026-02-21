import React from 'react';

function LandingPage() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/chat';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Mission Platform</span>
          </div>
          <button
            onClick={handleLogin}
            className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors border border-blue-200"
            data-testid="header-login-btn"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            🇮🇳 India's First AI-Powered Government Services Navigator
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Chat Your Way Through<br />Government Services with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
              AI Assistance
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Simply chat with our AI guide about what you need. Get personalized step-by-step guidance for Aadhaar, PAN, Driving License, and more - all in a friendly conversation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleLogin}
              className="btn-primary px-8 py-4 text-white rounded-xl font-semibold text-lg shadow-lg flex items-center gap-2"
              data-testid="hero-get-started-btn"
            >
              <span>💬</span>
              <span>Start Chatting Now →</span>
            </button>
            <button className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors border border-gray-200">
              Watch Demo
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Official .gov.in Sources Only</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Privacy-First (No Aadhaar/PAN Storage)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Multilingual Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Domains */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Government Services We Support
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            AI-powered guidance for common government services with step-by-step timelines
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Aadhaar */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📇</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aadhaar Services</h3>
              <p className="text-gray-600 mb-4">
                New enrollment, update details, download e-Aadhaar, check status
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">→</span>
                  Address update
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">→</span>
                  Mobile number update
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">→</span>
                  Download e-Aadhaar
                </li>
              </ul>
            </div>

            {/* PAN Card */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">PAN Card Services</h3>
              <p className="text-gray-600 mb-4">
                New PAN application, corrections, reprint, status tracking
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">→</span>
                  New PAN application
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">→</span>
                  PAN corrections
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">→</span>
                  Check application status
                </li>
              </ul>
            </div>

            {/* Driving License */}
            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🚗</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Driving License</h3>
              <p className="text-gray-600 mb-4">
                New DL application, renewal, duplicate, address change
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-purple-600">→</span>
                  Learner's license
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600">→</span>
                  Permanent DL
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600">→</span>
                  License renewal
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-600">
              <span className="font-semibold">Coming soon:</span> Passport, Voter ID, Ration Card, and more
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            How Mission Platform Works
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">1. Start a Chat</h3>
              <p className="text-gray-600 text-sm">
                Tell our AI guide what you need in plain language - like texting a friend.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">2. Get Verified Steps</h3>
              <p className="text-gray-600 text-sm">
                Receive step-by-step timeline from official government sources.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">3. Execute with Guidance</h3>
              <p className="text-gray-600 text-sm">
                Follow instructions, get safety warnings, avoid common mistakes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">4. Mission Complete</h3>
              <p className="text-gray-600 text-sm">
                Track progress, get escalation help if needed, celebrate success.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety First */}
      <section className="px-6 py-16 bg-yellow-50 border-y border-yellow-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Privacy-First Architecture</h3>
              <p className="text-gray-700 mb-4">
                Your safety is our top priority. We never ask for or store sensitive information.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>We NEVER ask for Aadhaar numbers, PAN numbers, OTPs, or passwords</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Sensitive data entered only on official .gov.in portals</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Scam detection & fake portal warnings</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Official source verification for every step</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Navigate Government Services?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of Indians getting AI-powered guidance for government services
          </p>
          <button
            onClick={handleLogin}
            className="btn-primary px-10 py-4 text-white rounded-lg font-semibold text-lg shadow-lg"
            data-testid="cta-get-started-btn"
          >
            Start Your First Mission →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto text-center">
          <p className="mb-2">© 2025 Mission Platform. Built for India.</p>
          <p className="text-sm">Privacy-first • Official sources only • Multilingual support</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

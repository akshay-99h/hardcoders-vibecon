import React from 'react';

function LandingPage() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/chat';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="font-sans text-gray-900 flex flex-col md:flex-row min-h-screen">
      {/* Left Sidebar (40% Width) */}
      <main className="w-full md:w-[40%] bg-white flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 z-20 shadow-xl relative min-h-screen">
        {/* Header/Logo Area */}
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-lg">
          <div className="flex items-center gap-3 mb-12 justify-center">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">Raksha AI</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6 text-center">
            Your Shield for <span className="text-primary">Legal & Financial</span> Clarity
          </h1>
          
          <p className="text-lg text-gray-600 mb-10 leading-relaxed text-center">
            Upload notices, get expert advice, and navigate complex problems with ease. We translate legal jargon into plain English.
          </p>

          {/* Auth Action */}
          <div className="space-y-4 w-full max-w-sm">
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Footer Links */}
        <footer className="mt-auto pt-8 border-t border-gray-100 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-gray-500 w-full">
          <button className="hover:text-primary transition-colors">Terms of Service</button>
          <button className="hover:text-primary transition-colors">Privacy Policy</button>
          <p>© 2025 Raksha AI</p>
        </footer>
      </main>

      {/* Right Comic Strip (60% Width) */}
      <section className="w-full md:w-[60%] bg-[#fdf6e3] flex items-center justify-center p-8">
        <div className="w-full h-full flex items-center justify-center">
          <img 
            src="/images/comic-strip.png" 
            alt="Raksha AI Comic Strip - How it works" 
            className="w-full h-auto max-w-4xl object-contain"
          />
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

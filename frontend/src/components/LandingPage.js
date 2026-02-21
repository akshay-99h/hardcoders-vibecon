import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

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
          <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <p>© 2025 Raksha AI</p>
        </footer>
      </main>

      {/* Right Comic Strip (60% Width) */}
      <section className="w-full md:w-[60%] bg-[#fdf6e3] grid grid-cols-1 sm:grid-cols-2 gap-4 p-8">
        {/* Panel 1: The Problem */}
        <div className="comic-panel bg-orange-50 flex items-center justify-center min-h-[300px] rounded-lg border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">😟</div>
              <p className="text-lg font-semibold text-gray-800">Confused by legal notices?</p>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-900 px-4 py-2 rounded-xl w-[90%] text-sm font-medium z-10 text-center">
            "I don't understand why I got this legal notice..."
          </div>
        </div>

        {/* Panel 2: The Frustration */}
        <div className="comic-panel bg-blue-50 flex items-center justify-center min-h-[300px] rounded-lg border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🚫</div>
              <p className="text-lg font-semibold text-gray-800">No help available</p>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-900 px-4 py-2 rounded-xl w-[90%] text-sm font-medium z-10 text-center">
            "This is a civil matter, we can't help you here."
          </div>
        </div>

        {/* Panel 3: The Solution (App Interface) */}
        <div className="comic-panel bg-primary/10 flex items-center justify-center min-h-[300px] rounded-lg border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden">
          <div className="w-3/4 h-3/4 bg-white rounded-3xl border-4 border-gray-800 p-4 shadow-lg flex flex-col items-center">
            <div className="w-full flex justify-between mb-4 px-2">
              <span className="text-[8px] font-bold">10:45</span>
              <div className="w-12 h-2 bg-gray-200 rounded-full"></div>
              <span className="text-[8px]">88%</span>
            </div>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mb-2">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <p className="text-[10px] font-bold text-primary mb-4">RAKSHA AI</p>
            <div className="w-full space-y-2">
              <div className="h-2 bg-gray-100 rounded w-full animate-pulse"></div>
              <div className="h-2 bg-gray-100 rounded w-5/6 animate-pulse"></div>
              <div className="h-2 bg-gray-100 rounded w-4/6 animate-pulse"></div>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-900 px-4 py-2 rounded-xl w-[90%] text-sm font-medium italic text-primary z-10 text-center">
            Raksha AI is analyzing your notice...<br/>and explaining it in plain English!
          </div>
        </div>

        {/* Panel 4: The Relief */}
        <div className="comic-panel bg-green-50 flex items-center justify-center min-h-[300px] rounded-lg border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">😊</div>
              <p className="text-lg font-semibold text-gray-800">Problem solved!</p>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-900 px-4 py-2 rounded-xl w-[90%] text-sm font-medium z-10 text-center">
            "Finally, I know exactly what to do. Thank you, Raksha AI!"
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

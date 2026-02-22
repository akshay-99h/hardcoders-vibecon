import { useEffect, useMemo, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

function getIsMobileViewport() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getIsStandalonePWA() {
  const hasNavigatorStandalone = typeof window.navigator.standalone === 'boolean' && window.navigator.standalone;
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const displayModeFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  return Boolean(hasNavigatorStandalone || displayModeStandalone || displayModeFullscreen);
}

export function useClientEnvironment() {
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);
  const [isStandalonePWA, setIsStandalonePWA] = useState(getIsStandalonePWA);

  useEffect(() => {
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');

    const updateViewport = () => {
      setIsMobileViewport(getIsMobileViewport());
    };

    const updateDisplayMode = () => {
      setIsStandalonePWA(getIsStandalonePWA());
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    document.addEventListener('visibilitychange', updateDisplayMode);

    if (displayModeQuery.addEventListener) {
      displayModeQuery.addEventListener('change', updateDisplayMode);
      fullscreenQuery.addEventListener('change', updateDisplayMode);
    } else {
      displayModeQuery.addListener(updateDisplayMode);
      fullscreenQuery.addListener(updateDisplayMode);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      document.removeEventListener('visibilitychange', updateDisplayMode);
      if (displayModeQuery.removeEventListener) {
        displayModeQuery.removeEventListener('change', updateDisplayMode);
        fullscreenQuery.removeEventListener('change', updateDisplayMode);
      } else {
        displayModeQuery.removeListener(updateDisplayMode);
        fullscreenQuery.removeListener(updateDisplayMode);
      }
    };
  }, []);

  const isDesktopBrowser = useMemo(
    () => !isMobileViewport && !isStandalonePWA,
    [isMobileViewport, isStandalonePWA]
  );

  return {
    isMobileViewport,
    isStandalonePWA,
    isDesktopBrowser,
  };
}

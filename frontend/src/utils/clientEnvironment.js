import { useEffect, useMemo, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

function getIsMobileViewport() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getIsLikelyMobileDevice() {
  const userAgentDataMobile = window.navigator.userAgentData?.mobile;
  if (typeof userAgentDataMobile === 'boolean') {
    return userAgentDataMobile;
  }

  const userAgent = window.navigator.userAgent || '';
  const mobileByUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const ipadDesktopMode = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return mobileByUserAgent || ipadDesktopMode;
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
  const [isLikelyMobileDevice, setIsLikelyMobileDevice] = useState(getIsLikelyMobileDevice);

  useEffect(() => {
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');

    const updateEnvironment = () => {
      setIsMobileViewport(getIsMobileViewport());
      setIsStandalonePWA(getIsStandalonePWA());
      setIsLikelyMobileDevice(getIsLikelyMobileDevice());
    };

    window.addEventListener('resize', updateEnvironment);
    window.addEventListener('orientationchange', updateEnvironment);
    document.addEventListener('visibilitychange', updateEnvironment);

    if (displayModeQuery.addEventListener) {
      displayModeQuery.addEventListener('change', updateEnvironment);
      fullscreenQuery.addEventListener('change', updateEnvironment);
    } else {
      displayModeQuery.addListener(updateEnvironment);
      fullscreenQuery.addListener(updateEnvironment);
    }

    return () => {
      window.removeEventListener('resize', updateEnvironment);
      window.removeEventListener('orientationchange', updateEnvironment);
      document.removeEventListener('visibilitychange', updateEnvironment);
      if (displayModeQuery.removeEventListener) {
        displayModeQuery.removeEventListener('change', updateEnvironment);
        fullscreenQuery.removeEventListener('change', updateEnvironment);
      } else {
        displayModeQuery.removeListener(updateEnvironment);
        fullscreenQuery.removeListener(updateEnvironment);
      }
    };
  }, []);

  const isMobileStandalonePWA = useMemo(
    () => isStandalonePWA && isLikelyMobileDevice,
    [isStandalonePWA, isLikelyMobileDevice]
  );

  const isCompactLayout = useMemo(
    () => isMobileViewport || isMobileStandalonePWA,
    [isMobileViewport, isMobileStandalonePWA]
  );

  const isDesktopBrowser = useMemo(
    () => !isCompactLayout,
    [isCompactLayout]
  );

  return {
    isMobileViewport,
    isStandalonePWA,
    isLikelyMobileDevice,
    isMobileStandalonePWA,
    isCompactLayout,
    isDesktopBrowser,
  };
}

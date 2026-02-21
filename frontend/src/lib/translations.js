export const translations = {
  en: {
    rakshaAI: "RakshaAI",
    landingPage: {
      heroTitle: "Your Shield for",
      heroTitleHighlight: "Legal & Financial",
      heroTitleEnd: "Clarity",
      heroDescription: "Upload notices, get expert advice, and navigate complex problems with ease.",
      getStarted: "Get Started",
      seeHowItWorks: "See How It Works",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      copyright: "© 2026 RakshaAI"
    },
    chat: {
      title: "RakshaAI Chat",
      subtitle: "AI-powered legal & financial guidance",
      voice: "Voice",
      newChat: "New Chat",
      logout: "Logout",
      typePlaceholder: "Type your message..."
    }
  },
  hi: {
    rakshaAI: "रक्षाAI",
    landingPage: {
      heroTitle: "आपकी सुरक्षा",
      heroTitleHighlight: "कानूनी और वित्तीय",
      heroTitleEnd: "स्पष्टता के लिए",
      heroDescription: "नोटिस अपलोड करें, विशेषज्ञ सलाह प्राप्त करें, और जटिल समस्याओं को आसानी से हल करें।",
      getStarted: "शुरू करें",
      seeHowItWorks: "यह कैसे काम करता है",
      termsOfService: "सेवा की शर्तें",
      privacyPolicy: "गोपनीयता नीति",
      copyright: "© 2026 रक्षाAI"
    },
    chat: {
      title: "रक्षाAI चैट",
      subtitle: "AI-संचालित मार्गदर्शन",
      voice: "आवाज़",
      newChat: "नई चैट",
      logout: "लॉग आउट",
      typePlaceholder: "अपना संदेश टाइप करें..."
    }
  }
};

export const t = (language, key) => {
  const keys = key.split('.');
  let value = translations[language];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
};

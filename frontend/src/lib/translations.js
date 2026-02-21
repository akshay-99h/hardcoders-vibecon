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
    
    howItWorks: {
      title: "How It Works",
      subtitle: "Get started with RakshaAI in just a few simple steps.",
      backToHome: "Back to Home",
      getStartedNow: "Get Started Now",
      readyTitle: "Ready to Get Started?",
      readyDesc: "Join RakshaAI today and simplify your legal and financial journey.",
      
      feature1Title: "Secure & Private",
      feature1Desc: "Your data is encrypted and never shared",
      feature2Title: "AI-Powered",
      feature2Desc: "Advanced AI to simplify complex processes",
      feature3Title: "Easy to Use",
      feature3Desc: "Step-by-step guidance for every task",
      
      step1Title: "Create Your Account",
      step1Desc: "Click \"Get Started\" and sign in securely using your Google account.",
      step2Title: "Start a Conversation",
      step2Desc: "Once logged in, you'll see the chat interface. Simply type your question.",
      step3Title: "Get Expert Guidance",
      step3Desc: "Our AI will analyze your situation and provide clear, step-by-step guidance.",
      step4Title: "Track Your Progress",
      step4Desc: "All your conversations are saved. You can return anytime.",
      imagePlaceholder: "Image placeholder"
    },
    
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: January 2026",
      intro: "Introduction",
      contactUs: "Contact Us",
      email: "Email: privacy@rakshaai.com"
    },
    
    terms: {
      title: "Terms of Service",
      lastUpdated: "Last updated: January 2026",
      agreement: "Agreement to Terms",
      contactUs: "Contact Us",
      email: "Email: legal@rakshaai.com"
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
    
    howItWorks: {
      title: "यह कैसे काम करता है",
      subtitle: "रक्षाAI के साथ कुछ सरल चरणों में शुरुआत करें।",
      backToHome: "होम पर वापस जाएं",
      getStartedNow: "अभी शुरू करें",
      readyTitle: "शुरू करने के लिए तैयार हैं?",
      readyDesc: "आज ही रक्षाAI से जुड़ें और अपनी यात्रा को सरल बनाएं।",
      
      feature1Title: "सुरक्षित और निजी",
      feature1Desc: "आपका डेटा एन्क्रिप्ट किया गया है और कभी साझा नहीं किया जाता",
      feature2Title: "AI-संचालित",
      feature2Desc: "जटिल प्रक्रियाओं को सरल बनाने के लिए उन्नत AI",
      feature3Title: "उपयोग में आसान",
      feature3Desc: "हर कार्य के लिए चरण-दर-चरण मार्गदर्शन",
      
      step1Title: "अपना खाता बनाएं",
      step1Desc: "\"शुरू करें\" पर क्लिक करें और अपने Google खाते से साइन इन करें।",
      step2Title: "बातचीत शुरू करें",
      step2Desc: "लॉग इन के बाद, चैट इंटरफ़ेस दिखाई देगा। बस अपना प्रश्न टाइप करें।",
      step3Title: "विशेषज्ञ मार्गदर्शन प्राप्त करें",
      step3Desc: "हमारा AI आपकी स्थिति का विश्लेषण करेगा और स्पष्ट मार्गदर्शन प्रदान करेगा।",
      step4Title: "अपनी प्रगति ट्रैक करें",
      step4Desc: "आपकी सभी बातचीत सहेजी जाती हैं। आप किसी भी समय वापस आ सकते हैं।",
      imagePlaceholder: "छवि प्लेसहोल्डर"
    },
    
    privacy: {
      title: "गोपनीयता नीति",
      lastUpdated: "अंतिम अपडेट: जनवरी 2026",
      intro: "परिचय",
      contactUs: "हमसे संपर्क करें",
      email: "ईमेल: privacy@rakshaai.com"
    },
    
    terms: {
      title: "सेवा की शर्तें",
      lastUpdated: "अंतिम अपडेट: जनवरी 2026",
      agreement: "शर्तों की स्वीकृति",
      contactUs: "हमसे संपर्क करें",
      email: "ईमेल: legal@rakshaai.com"
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

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_ROUTES = new Set(['/', '/how-it-works', '/slides', '/privacy', '/terms']);

const ROUTE_SEO = {
  '/': {
    title: 'RakshaAI - Legal & Financial Clarity',
    description:
      'RakshaAI helps citizens navigate legal, government, and financial workflows with AI guidance, document analysis, and actionable steps.',
  },
  '/how-it-works': {
    title: 'How It Works | RakshaAI',
    description:
      'See how RakshaAI turns legal notices and government tasks into clear step-by-step actions.',
  },
  '/slides': {
    title: 'RakshaAI Presentation Slides',
    description:
      'Explore RakshaAI product slides covering user value, execution, and go-to-market narrative.',
  },
  '/privacy': {
    title: 'Privacy Policy | RakshaAI',
    description: 'Read RakshaAI privacy practices and how user data is handled.',
  },
  '/terms': {
    title: 'Terms of Service | RakshaAI',
    description: 'Review RakshaAI terms of service and platform usage conditions.',
  },
  '/chat': {
    title: 'RakshaAI Chat Assistant',
    description: 'AI assistant for legal, financial, and government guidance.',
  },
  '/billing': {
    title: 'Billing | RakshaAI',
    description: 'Manage RakshaAI subscription plans and usage.',
  },
  '/call': {
    title: 'Voice Call | RakshaAI',
    description: 'Voice-enabled AI assistance from RakshaAI.',
  },
};

function upsertMeta(selector, attribute, value) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    const [attrName, attrValue] = selector
      .replace('meta[', '')
      .replace(']', '')
      .split('=');
    const cleanValue = attrValue?.replace(/"/g, '');
    if (attrName && cleanValue) {
      tag.setAttribute(attrName, cleanValue);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute(attribute, value);
}

function setCanonical(url) {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
}

function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || '/';
    const config = ROUTE_SEO[pathname] || ROUTE_SEO['/'];
    const pageUrl = `${window.location.origin}${pathname}`;
    const isPublic = PUBLIC_ROUTES.has(pathname);

    document.title = config.title;

    upsertMeta('meta[name="description"]', 'content', config.description);
    upsertMeta('meta[property="og:title"]', 'content', config.title);
    upsertMeta('meta[property="og:description"]', 'content', config.description);
    upsertMeta('meta[property="og:url"]', 'content', pageUrl);
    upsertMeta('meta[name="twitter:title"]', 'content', config.title);
    upsertMeta('meta[name="twitter:description"]', 'content', config.description);
    upsertMeta(
      'meta[name="robots"]',
      'content',
      isPublic
        ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
        : 'noindex,nofollow'
    );

    setCanonical(pageUrl);
  }, [location.pathname]);

  return null;
}

export default SeoManager;

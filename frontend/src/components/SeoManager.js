import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_ROUTES = new Set(['/', '/how-it-works', '/slides', '/privacy', '/terms', '/contact']);

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
  '/billing/overview': {
    title: 'Billing Overview | RakshaAI',
    description: 'Workspace billing overview, quota usage, and seat health.',
  },
  '/billing/pricing': {
    title: 'Pricing Plans | RakshaAI',
    description: 'Compare RakshaAI plans, usage limits, and upgrade options.',
  },
  '/billing/billing': {
    title: 'Subscription Billing | RakshaAI',
    description: 'Manage subscription status, checkout sync, and Stripe customer portal.',
  },
  '/billing/invoices': {
    title: 'Invoices | RakshaAI',
    description: 'Review billing cycles and available invoice records.',
  },
  '/billing/settings': {
    title: 'Billing Settings | RakshaAI',
    description: 'Configure billing defaults and support escalation links.',
  },
  '/billing/checkout/success': {
    title: 'Checkout Success | RakshaAI',
    description: 'Stripe checkout completed. RakshaAI is syncing your subscription status.',
  },
  '/billing/checkout/cancel': {
    title: 'Checkout Canceled | RakshaAI',
    description: 'Stripe checkout was canceled. You can restart your RakshaAI upgrade anytime.',
  },
  '/billing/return': {
    title: 'Billing Return | RakshaAI',
    description: 'Returned from Stripe billing portal to RakshaAI billing.',
  },
  '/call': {
    title: 'Voice Call | RakshaAI',
    description: 'Voice-enabled AI assistance from RakshaAI.',
  },
  '/contact': {
    title: 'Contact Us | RakshaAI',
    description: 'Submit grievances, support requests, and suspicious-login reports to RakshaAI.',
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
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';
    const config = ROUTE_SEO[normalizedPath] || ROUTE_SEO['/'];
    const pageUrl = `${window.location.origin}${normalizedPath}`;
    const isPublic = PUBLIC_ROUTES.has(normalizedPath);

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

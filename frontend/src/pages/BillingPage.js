import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function BillingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState({});
  const [billingMeta, setBillingMeta] = useState({ currency: 'INR', interval: 'month', stripe: {} });
  const [status, setStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [meRes, plansRes, statusRes] = await Promise.all([
          api.get('/api/auth/me'),
          api.get('/api/billing/plans'),
          api.get('/api/billing/status'),
        ]);
        setUser(meRes.data);
        const plansPayload = plansRes.data || {};
        setPlans(plansPayload.plans || {});
        setBillingMeta({
          currency: plansPayload.currency || 'INR',
          interval: plansPayload.interval || 'month',
          stripe: plansPayload.stripe || {},
        });
        setStatus(statusRes.data);
      } catch (err) {
        console.error('Billing bootstrap failed:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [navigate]);

  const sortedPlans = useMemo(() => ['free', 'plus', 'pro', 'business'].filter((key) => plans[key]), [plans]);

  const handleUpgrade = async (planKey) => {
    setActionLoading(planKey);
    setError('');
    try {
      const response = await api.post('/api/billing/checkout-session', { plan_key: planKey });
      const checkoutUrl = response.data?.url;
      if (!checkoutUrl) {
        throw new Error('Missing checkout URL');
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create checkout session');
    } finally {
      setActionLoading('');
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading('manage');
    setError('');
    try {
      const response = await api.post('/api/billing/customer-portal');
      const portalUrl = response.data?.url;
      if (!portalUrl) {
        throw new Error('Missing portal URL');
      }
      window.location.href = portalUrl;
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to open billing portal');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading billing...</p>
      </div>
    );
  }

  const activePlan = status?.plan_key || 'free';
  const stripePublishableKey = billingMeta?.stripe?.publishable_key || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
  const stripeKeyPreview = stripePublishableKey ? `${stripePublishableKey.slice(0, 12)}...` : 'Not set';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Billing & Usage</h1>
            <p className="text-sm text-muted-foreground">
              Logged in as {user?.name} ({user?.email})
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/chat')}
              className="px-3 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
            >
              Back to Chat
            </button>
            {activePlan !== 'free' && (
              <button
                onClick={handleManageSubscription}
                disabled={actionLoading === 'manage'}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {actionLoading === 'manage' ? 'Opening...' : 'Manage Subscription'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Stripe Test Mode</h3>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Secret key status</p>
              <p className="font-medium text-foreground mt-1">{billingMeta?.stripe?.enabled ? 'Configured' : 'Missing'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Publishable key status</p>
              <p className="font-medium text-foreground mt-1">{stripePublishableKey ? 'Configured' : 'Missing'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Publishable key preview</p>
              <p className="font-mono text-xs text-foreground mt-1">{stripeKeyPreview}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {sortedPlans.map((planKey) => {
            const plan = plans[planKey];
            const isActive = activePlan === planKey;
            const isFree = planKey === 'free';

            return (
              <div
                key={planKey}
                className={`rounded-xl border p-4 ${
                  isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{plan.label}</h2>
                  {isActive && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {isFree ? '₹0' : `₹${plan.price_inr_monthly}`}
                  <span className="text-sm font-normal text-muted-foreground">/{billingMeta?.interval || 'month'}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seats included: {plan.seats_included ?? 1}
                </p>
                <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                  {Object.entries(plan.limits || {}).map(([metric, limit]) => (
                    <li key={metric}>
                      {metric.replace(/_/g, ' ')}: {limit}
                    </li>
                  ))}
                </ul>
                {!isActive && !isFree && (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={actionLoading === planKey}
                    className="mt-4 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {actionLoading === planKey ? 'Redirecting...' : `Choose ${plan.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Usage ({status?.period_key || '-'})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Seat limit</p>
              <p className="text-lg font-semibold text-foreground">{status?.seat_limit ?? 1}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Seats used</p>
              <p className="text-lg font-semibold text-foreground">{status?.seat_used ?? 1}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Seats remaining</p>
              <p className="text-lg font-semibold text-foreground">{status?.seats_remaining ?? 0}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(status?.metrics || {}).map(([metric, metricData]) => {
              const limit = metricData.limit || 0;
              const used = metricData.used || 0;
              const ratio = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
              const exhausted = Boolean(metricData.exhausted);
              return (
                <div key={metric} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground capitalize">{metric.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {used} / {limit}
                  </p>
                  <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${exhausted ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingPage;

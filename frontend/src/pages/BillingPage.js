import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../utils/api';
import { ChartTooltipContent } from '../components/ui/chart';
import { AdminDataTable, SortableHeader } from '../components/admin/AdminDataTable';

const CHART_COLORS = ['#0f49bd', '#3f83f8', '#7cb0ff', '#9ca3af', '#f59e0b'];

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function getCheckoutNoticeClasses(tone) {
  if (tone === 'success') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (tone === 'warning') return 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (tone === 'error') return 'border-destructive/40 bg-destructive/10 text-destructive';
  return 'border-border bg-muted/40 text-foreground';
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BillingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState({});
  const [billingMeta, setBillingMeta] = useState({ currency: 'INR', interval: 'month', stripe: {} });
  const [status, setStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState(null);
  const [checkoutSyncing, setCheckoutSyncing] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
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

        let nextStatus = statusRes.data;

        const params = new URLSearchParams(location.search);
        const checkoutFlow = params.get('checkout');
        const checkoutSessionId = params.get('session_id');

        if (checkoutFlow === 'success') {
          if (!checkoutSessionId) {
            setCheckoutNotice({
              tone: 'warning',
              title: 'Checkout returned without session id',
              message: 'Add session_id={CHECKOUT_SESSION_ID} in STRIPE_CHECKOUT_SUCCESS_URL to auto-sync status.',
            });
          } else {
            setCheckoutSyncing(true);
            try {
              const paymentRes = await api.get('/api/billing/payment-status', {
                params: { session_id: checkoutSessionId },
              });
              const paymentData = paymentRes.data || {};

              const statusResAfterSync = await api.get('/api/billing/status');
              nextStatus = statusResAfterSync.data;

              const purchaseStatus = paymentData.purchase_status || 'pending';
              const checkoutStatus = paymentData.checkout_status || '-';
              const paymentStatus = paymentData.payment_status || '-';
              const subscriptionStatus = paymentData.subscription_status || '-';

              if (purchaseStatus === 'succeeded') {
                setCheckoutNotice({
                  tone: 'success',
                  title: 'Payment confirmed',
                  message: `Plan activated on this account (${paymentData.resolved_plan_key || 'paid'}).`,
                  meta: `checkout=${checkoutStatus} • payment=${paymentStatus} • subscription=${subscriptionStatus}`,
                });
              } else if (purchaseStatus === 'pending') {
                setCheckoutNotice({
                  tone: 'info',
                  title: 'Payment is still processing',
                  message: 'Status is not final yet. Refresh this page after a few seconds.',
                  meta: `checkout=${checkoutStatus} • payment=${paymentStatus} • subscription=${subscriptionStatus}`,
                });
              } else {
                setCheckoutNotice({
                  tone: 'error',
                  title: `Payment ${purchaseStatus}`,
                  message: 'Purchase did not finalize. Try checkout again.',
                  meta: `checkout=${checkoutStatus} • payment=${paymentStatus} • subscription=${subscriptionStatus}`,
                });
              }
            } catch (syncErr) {
              setCheckoutNotice({
                tone: 'error',
                title: 'Unable to sync checkout status',
                message: syncErr.response?.data?.detail || syncErr.message || 'Please try refreshing billing status.',
              });
            } finally {
              setCheckoutSyncing(false);
            }
          }
        } else if (checkoutFlow === 'cancel') {
          setCheckoutNotice({
            tone: 'info',
            title: 'Checkout canceled',
            message: 'No payment was processed.',
          });
        }

        if (checkoutFlow) {
          window.history.replaceState({}, '', window.location.pathname);
        }

        setStatus(nextStatus);
      } catch (err) {
        console.error('Billing bootstrap failed:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [navigate, location.search]);

  const sortedPlans = useMemo(
    () => ['free', 'plus', 'pro', 'business'].filter((key) => plans[key]),
    [plans]
  );

  const activePlan = status?.plan_key || 'free';
  const stripePublishableKey =
    billingMeta?.stripe?.publishable_key || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
  const stripeKeyPreview = stripePublishableKey ? `${stripePublishableKey.slice(0, 16)}...` : 'Not set';

  const usageRows = useMemo(() => {
    const metrics = status?.metrics || {};
    return Object.entries(metrics).map(([metric, data]) => {
      const used = Number(data.used || 0);
      const limit = Number(data.limit || 0);
      const remaining = Number(data.remaining || Math.max(limit - used, 0));
      return {
        metric,
        metric_label: metric.replace(/_/g, ' '),
        used,
        limit,
        remaining,
        exhausted: Boolean(data.exhausted || (limit > 0 && used >= limit)),
      };
    });
  }, [status]);

  const usageChartData = useMemo(
    () =>
      usageRows.map((row) => ({
        metric: row.metric_label,
        used: row.used,
        remaining: row.remaining,
      })),
    [usageRows]
  );

  const seatChartData = useMemo(
    () => [
      { label: 'Used', value: Number(status?.seat_used || 0) },
      { label: 'Remaining', value: Number(status?.seats_remaining || 0) },
    ],
    [status]
  );

  const usageColumns = useMemo(
    () => [
      {
        accessorKey: 'metric_label',
        header: ({ column }) => <SortableHeader column={column} title="Metric" />,
        cell: ({ row }) => <span className="capitalize">{row.original.metric_label}</span>,
      },
      {
        accessorKey: 'used',
        header: ({ column }) => <SortableHeader column={column} title="Used" />,
        cell: ({ row }) => <span>{row.original.used}</span>,
      },
      {
        accessorKey: 'limit',
        header: ({ column }) => <SortableHeader column={column} title="Limit" />,
        cell: ({ row }) => <span>{row.original.limit}</span>,
      },
      {
        accessorKey: 'remaining',
        header: ({ column }) => <SortableHeader column={column} title="Remaining" />,
        cell: ({ row }) => <span>{row.original.remaining}</span>,
      },
      {
        accessorKey: 'exhausted',
        header: ({ column }) => <SortableHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              row.original.exhausted
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {row.original.exhausted ? 'Limit reached' : 'Available'}
          </span>
        ),
      },
    ],
    []
  );

  const handleUpgrade = async (planKey) => {
    setActionLoading(planKey);
    setError('');
    setCheckoutNotice(null);

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
    setCheckoutNotice(null);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Billing & Usage</h1>
            <p className="text-sm text-muted-foreground">
              Logged in as {user?.name} ({user?.email})
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/chat')}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              Back to Chat
            </button>
            {activePlan !== 'free' && (
              <button
                onClick={handleManageSubscription}
                disabled={actionLoading === 'manage'}
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {actionLoading === 'manage' ? 'Opening...' : 'Manage Subscription'}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {checkoutNotice && (
          <div className={`mb-5 rounded-lg border p-3 text-sm ${getCheckoutNoticeClasses(checkoutNotice.tone)}`}>
            <p className="font-semibold">{checkoutNotice.title}</p>
            <p className="mt-1">{checkoutNotice.message}</p>
            {checkoutNotice.meta && <p className="mt-1 text-xs opacity-80">{checkoutNotice.meta}</p>}
          </div>
        )}

        {checkoutSyncing && (
          <div className="mb-5 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
            Syncing payment status from Stripe...
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Current Plan" value={(activePlan || 'free').toUpperCase()} hint={status?.subscription_status || 'inactive'} />
          <SummaryCard label="Seat Limit" value={status?.seat_limit ?? 1} hint={`Used ${status?.seat_used ?? 0}`} />
          <SummaryCard label="Seats Remaining" value={status?.seats_remaining ?? 0} hint={`Period ends ${formatDate(status?.current_period_end)}`} />
          <SummaryCard label="Stripe Key" value={stripePublishableKey ? 'Configured' : 'Missing'} hint={stripeKeyPreview} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-foreground">Usage Breakdown</h3>
              <p className="text-xs text-muted-foreground">Used vs remaining by feature quota.</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageChartData} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="metric" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="used" stackId="usage" fill="var(--primary)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="remaining" stackId="usage" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-foreground">Seat Allocation</h3>
              <p className="text-xs text-muted-foreground">Current seat usage for this workspace.</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={seatChartData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={88}>
                    {seatChartData.map((item, index) => (
                      <Cell key={`${item.label}-${item.value}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                      Current
                    </span>
                  )}
                </div>

                <p className="mt-2 text-2xl font-bold text-foreground">
                  {isFree ? '₹0' : `₹${plan.price_inr_monthly}`}
                  <span className="text-sm font-normal text-muted-foreground">/{billingMeta.interval || 'month'}</span>
                </p>

                <p className="mt-1 text-xs text-muted-foreground">Seats included: {plan.seats_included ?? 1}</p>

                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
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
                    className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {actionLoading === planKey ? 'Redirecting...' : `Choose ${plan.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <AdminDataTable
            title="Usage Metrics"
            description="Sorted and paginated usage details for your current billing period."
            data={usageRows}
            columns={usageColumns}
            initialPageSize={6}
            pageSizeOptions={[6, 12, 24]}
            emptyMessage="No usage data available for this period."
          />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-base font-semibold text-foreground">Stripe Test Mode Snapshot</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Secret key status</p>
              <p className="mt-1 font-medium text-foreground">{billingMeta?.stripe?.enabled ? 'Configured' : 'Missing'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Publishable key status</p>
              <p className="mt-1 font-medium text-foreground">{stripePublishableKey ? 'Configured' : 'Missing'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Current period end</p>
              <p className="mt-1 font-medium text-foreground">{formatDate(status?.current_period_end)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillingPage;

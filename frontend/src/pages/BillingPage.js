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
import {
  FiArrowLeft,
  FiChevronDown,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiSettings,
  FiTag,
} from 'react-icons/fi';
import api from '../utils/api';
import { ChartTooltipContent } from '../components/ui/chart';
import { AdminDataTable, SortableHeader } from '../components/admin/AdminDataTable';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';

const CHART_COLORS = ['#0f49bd', '#3f83f8', '#7cb0ff', '#9ca3af', '#f59e0b'];

const BILLING_SECTIONS = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Usage health and workspace summary',
    icon: FiGrid,
  },
  {
    key: 'pricing',
    label: 'Pricing',
    description: 'Plan comparison and upgrade options',
    icon: FiTag,
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'Subscription and payment controls',
    icon: FiCreditCard,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'Cycle records and receipts',
    icon: FiFileText,
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Billing defaults and account actions',
    icon: FiSettings,
  },
];

const BILLING_SECTION_KEYS = new Set(BILLING_SECTIONS.map((section) => section.key));
const BILLING_SECTION_MAP = BILLING_SECTIONS.reduce((acc, section) => {
  acc[section.key] = section;
  return acc;
}, {});

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

function resolveActiveBillingSection(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/billing';
  if (normalizedPath === '/billing') return 'overview';
  if (normalizedPath.startsWith('/billing/checkout') || normalizedPath === '/billing/return') return 'billing';

  const parts = normalizedPath.split('/').filter(Boolean);
  const section = parts[1];
  return BILLING_SECTION_KEYS.has(section) ? section : 'overview';
}

function toneToInvoiceStatus(tone) {
  if (tone === 'success') return 'paid';
  if (tone === 'error') return 'failed';
  if (tone === 'warning') return 'review';
  return 'pending';
}

function getInvoiceStatusClass(status) {
  if (status === 'paid') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'failed') return 'bg-destructive/10 text-destructive';
  if (status === 'review') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'bg-primary/10 text-primary';
}

function SummaryCard({ label, value, hint }) {
  return (
    <Card size="sm" className="h-full">
      <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
      <CardTitle className="mt-1 text-2xl">{value}</CardTitle>
      {hint && <CardDescription className="mt-1">{hint}</CardDescription>}
    </Card>
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

  const checkoutPathFlow = useMemo(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '');
    if (normalizedPath === '/billing/checkout/success') return 'success';
    if (normalizedPath === '/billing/checkout/cancel') return 'cancel';
    return null;
  }, [location.pathname]);

  useEffect(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, '');
    const parts = normalizedPath.split('/').filter(Boolean);
    if (parts[0] !== 'billing') return;
    if (parts.length !== 2) return;
    if (!BILLING_SECTION_KEYS.has(parts[1])) {
      navigate('/billing/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

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
        const checkoutFlow = params.get('checkout') || checkoutPathFlow;
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

        if (checkoutPathFlow || params.has('checkout') || params.has('session_id')) {
          window.history.replaceState({}, '', '/billing/billing');
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
  }, [checkoutPathFlow, location.search, navigate]);

  const activeSectionKey = useMemo(() => resolveActiveBillingSection(location.pathname), [location.pathname]);
  const activeSection = BILLING_SECTION_MAP[activeSectionKey] || BILLING_SECTION_MAP.overview;

  const sortedPlans = useMemo(
    () => ['free', 'plus', 'pro', 'business'].filter((key) => plans[key]),
    [plans]
  );

  const activePlan = status?.plan_key || 'free';
  const activePlanDetails = plans[activePlan];
  const stripePublishableKey =
    billingMeta?.stripe?.publishable_key || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
  const stripeKeyPreview = stripePublishableKey ? `${stripePublishableKey.slice(0, 16)}...` : 'Not set';

  const usageRows = useMemo(() => {
    const metrics = status?.metrics || {};
    return Object.entries(metrics).map(([metric, data]) => {
      const used = Number(data.used || 0);
      const limit = Number(data.limit || 0);
      const remaining = Number(data.remaining || Math.max(limit - used, 0));
      const ratio = limit > 0 ? used / limit : 0;
      return {
        metric,
        metric_label: metric.replace(/_/g, ' '),
        used,
        limit,
        remaining,
        exhausted: Boolean(data.exhausted || (limit > 0 && used >= limit)),
        ratio,
      };
    });
  }, [status]);

  const usageTotals = useMemo(() => {
    const usedTotal = usageRows.reduce((sum, row) => sum + row.used, 0);
    const limitTotal = usageRows.reduce((sum, row) => sum + row.limit, 0);
    const remainingTotal = usageRows.reduce((sum, row) => sum + row.remaining, 0);
    return {
      usedTotal,
      limitTotal,
      remainingTotal,
      utilizationPercent: limitTotal > 0 ? Math.round((usedTotal / limitTotal) * 100) : 0,
      exhaustedCount: usageRows.filter((row) => row.exhausted).length,
      nearLimitCount: usageRows.filter((row) => row.ratio >= 0.8 && row.ratio < 1).length,
    };
  }, [usageRows]);

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

  const metricKeys = useMemo(() => {
    const keys = new Set();
    sortedPlans.forEach((planKey) => {
      Object.keys(plans[planKey]?.limits || {}).forEach((metric) => keys.add(metric));
    });
    return Array.from(keys);
  }, [plans, sortedPlans]);

  const invoiceRows = useMemo(() => {
    const rows = [];
    const currency = billingMeta.currency || 'INR';
    const activePrice = Number(activePlanDetails?.price_inr_monthly || 0);

    if (status?.current_period_start || status?.current_period_end || status?.subscription_status !== 'inactive') {
      rows.push({
        id: `cycle-${status?.period_key || 'current'}`,
        reference: status?.period_key ? `Cycle ${status.period_key}` : 'Current Cycle',
        description: `${(activePlanDetails?.label || activePlan).toUpperCase()} subscription`,
        issued_at: status?.current_period_start || status?.current_period_end || new Date().toISOString(),
        due_at: status?.current_period_end || null,
        amount: activePrice,
        currency,
        status: status?.subscription_status === 'active' ? 'paid' : (status?.subscription_status || 'pending'),
      });
    }

    if (checkoutNotice) {
      rows.push({
        id: `checkout-${checkoutNotice.title}`,
        reference: 'Latest Checkout',
        description: checkoutNotice.title,
        issued_at: new Date().toISOString(),
        due_at: status?.current_period_end || null,
        amount: activePrice,
        currency,
        status: toneToInvoiceStatus(checkoutNotice.tone),
      });
    }

    return rows;
  }, [activePlan, activePlanDetails, billingMeta.currency, checkoutNotice, status]);

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

  const goToSection = (sectionKey) => {
    if (!BILLING_SECTION_KEYS.has(sectionKey)) return;
    navigate(`/billing/${sectionKey}`);
  };

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

  const renderOverviewSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Current Plan"
          value={(activePlan || 'free').toUpperCase()}
          hint={status?.subscription_status || 'inactive'}
        />
        <SummaryCard label="Seat Limit" value={status?.seat_limit ?? 1} hint={`Used ${status?.seat_used ?? 0}`} />
        <SummaryCard
          label="Usage"
          value={`${usageTotals.utilizationPercent}%`}
          hint={`${usageTotals.usedTotal}/${usageTotals.limitTotal || 0} consumed`}
        />
        <SummaryCard
          label="Limits Watch"
          value={usageTotals.exhaustedCount}
          hint={`${usageTotals.nearLimitCount} near limit`}
        />
        <SummaryCard label="Stripe Key" value={stripePublishableKey ? 'Configured' : 'Missing'} hint={stripeKeyPreview} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage Breakdown</CardTitle>
            <CardDescription>Used vs remaining by feature quota.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seat Allocation</CardTitle>
            <CardDescription>Current seat usage for this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
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
          </CardContent>
        </Card>
      </div>

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
  );

  const renderPricingSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Currency" value={billingMeta.currency || 'INR'} hint="Billing currency" />
        <SummaryCard label="Cycle" value={(billingMeta.interval || 'month').toUpperCase()} hint="Recurring period" />
        <SummaryCard label="Plans Available" value={sortedPlans.length} hint="Free + paid tiers" />
        <SummaryCard label="Active Tier" value={(activePlanDetails?.label || activePlan).toUpperCase()} hint="Current workspace plan" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sortedPlans.map((planKey) => {
          const plan = plans[planKey];
          const isActive = activePlan === planKey;
          const isFree = planKey === 'free';

          return (
            <Card
              key={planKey}
              className={isActive ? 'border-primary bg-primary/5' : ''}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.label}</CardTitle>
                  {isActive && (
                    <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                      Current
                    </span>
                  )}
                </div>
                <CardDescription className="text-2xl font-bold text-foreground">
                  {isFree ? '₹0' : `₹${plan.price_inr_monthly}`}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /{billingMeta.interval || 'month'}
                  </span>
                </CardDescription>
                <CardDescription>Seats included: {plan.seats_included ?? 1}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {Object.entries(plan.limits || {}).map(([metric, limit]) => (
                    <li key={metric}>
                      {metric.replace(/_/g, ' ')}: {limit}
                    </li>
                  ))}
                </ul>

                {!isActive && !isFree && (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => handleUpgrade(planKey)}
                    disabled={actionLoading === planKey}
                  >
                    {actionLoading === planKey ? 'Redirecting...' : `Choose ${plan.label}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Matrix</CardTitle>
          <CardDescription>Plan-by-plan quota comparison for key workspace actions.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Metric</th>
                {sortedPlans.map((planKey) => (
                  <th key={planKey} className="py-2 pr-4 font-medium capitalize">
                    {plans[planKey]?.label || planKey}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricKeys.map((metric) => (
                <tr key={metric} className="border-b border-border/60 last:border-b-0">
                  <td className="py-2 pr-4 capitalize">{metric.replace(/_/g, ' ')}</td>
                  {sortedPlans.map((planKey) => (
                    <td key={`${metric}-${planKey}`} className="py-2 pr-4 text-muted-foreground">
                      {plans[planKey]?.limits?.[metric] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillingSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Plan Status" value={status?.subscription_status || 'inactive'} hint={(activePlanDetails?.label || activePlan).toUpperCase()} />
        <SummaryCard label="Stripe Mode" value={billingMeta?.stripe?.enabled ? 'Enabled' : 'Disabled'} hint="Server-side key status" />
        <SummaryCard label="Current Period End" value={formatDate(status?.current_period_end)} hint="Subscription cycle" />
        <SummaryCard label="Seats Remaining" value={status?.seats_remaining ?? 0} hint={`of ${status?.seat_limit ?? 1} seats`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Controls</CardTitle>
          <CardDescription>Upgrade plans or manage your existing Stripe subscription.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => goToSection('pricing')}>Compare Plans</Button>
          {activePlan !== 'free' ? (
            <Button variant="outline" onClick={handleManageSubscription} disabled={actionLoading === 'manage'}>
              {actionLoading === 'manage' ? 'Opening...' : 'Manage Subscription'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => goToSection('pricing')}>
              Upgrade from Free
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Snapshot</CardTitle>
          <CardDescription>Environment diagnostics for checkout + customer portal flow.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
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
        </CardContent>
      </Card>
    </div>
  );

  const renderInvoicesSection = () => {
    const paidCount = invoiceRows.filter((row) => row.status === 'paid').length;
    const pendingCount = invoiceRows.filter((row) => row.status !== 'paid').length;
    const totalAmount = invoiceRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label="Total Records" value={invoiceRows.length} hint="Available invoice-like rows" />
          <SummaryCard label="Paid" value={paidCount} hint={`${pendingCount} pending/review`} />
          <SummaryCard label="Total Amount" value={`₹${totalAmount}`} hint="Current visible rows" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Ledger</CardTitle>
            <CardDescription>Cycle and checkout entries currently available to this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {invoiceRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoice records are available yet. Your first paid cycle or checkout event will appear here.
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Reference</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    <th className="py-2 pr-4 font-medium">Issued</th>
                    <th className="py-2 pr-4 font-medium">Due</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2 pr-4 font-medium text-foreground">{row.reference}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.description}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{formatDate(row.issued_at)}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{formatDate(row.due_at)}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {row.amount ? `${row.currency} ${row.amount}` : '-'}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs capitalize ${getInvoiceStatusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSettingsSection = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Billing Currency" value={billingMeta.currency || 'INR'} hint="Workspace setting" />
        <SummaryCard label="Interval" value={(billingMeta.interval || 'month').toUpperCase()} hint="Recurring cycle" />
        <SummaryCard label="Contact Path" value={billingMeta?.contact_us_path || '/contact'} hint="Support entry point" />
        <SummaryCard label="Alert Level" value={usageTotals.exhaustedCount > 0 ? 'Action Required' : 'Healthy'} hint={`${usageTotals.nearLimitCount} metrics near limit`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Actions</CardTitle>
          <CardDescription>Quick links for subscription management and support channels.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/chat')}>
            Back to Chat
          </Button>
          <Button variant="outline" onClick={() => navigate('/contact')}>
            Contact Support
          </Button>
          <Button onClick={() => goToSection('billing')}>Open Billing Controls</Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderActiveSection = () => {
    if (activeSectionKey === 'pricing') return renderPricingSection();
    if (activeSectionKey === 'billing') return renderBillingSection();
    if (activeSectionKey === 'invoices') return renderInvoicesSection();
    if (activeSectionKey === 'settings') return renderSettingsSection();
    return renderOverviewSection();
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
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/chat')}>Workspace</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/billing/overview')}>Billing</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-foreground">
                        {activeSection.label}
                        <FiChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Switch Billing Section</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {BILLING_SECTIONS.map((section) => (
                        <DropdownMenuItem key={section.key} onSelect={() => goToSection(section.key)}>
                          {section.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Billing & Usage</h1>
              <p className="text-sm text-muted-foreground">
                Logged in as {user?.name} ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/chat')}>
              <FiArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
            {activePlan !== 'free' && (
              <Button onClick={handleManageSubscription} disabled={actionLoading === 'manage'}>
                {actionLoading === 'manage' ? 'Opening...' : 'Manage Subscription'}
              </Button>
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

        <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <Sidebar className="sticky top-6">
              <SidebarHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Billing Navigator
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Move across dedicated billing pages without leaving this workspace.
                </p>
              </SidebarHeader>

              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Sections</SidebarGroupLabel>
                  <SidebarMenu>
                    {BILLING_SECTIONS.map((section) => {
                      const Icon = section.icon;
                      const isActive = section.key === activeSectionKey;
                      return (
                        <SidebarMenuItem key={section.key}>
                          <SidebarMenuButton
                            variant={isActive ? 'active' : 'default'}
                            className="h-auto items-start py-2.5"
                            onClick={() => goToSection(section.key)}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="text-left">
                              <span className="block">{section.label}</span>
                              <span className="block text-xs font-normal text-muted-foreground">
                                {section.description}
                              </span>
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroup>
              </SidebarContent>

              <SidebarFooter>
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Workspace</p>
                  <p className="text-sm font-semibold text-foreground">{(activePlanDetails?.label || activePlan).toUpperCase()} Plan</p>
                  <p className="text-xs text-muted-foreground">
                    {usageTotals.usedTotal}/{usageTotals.limitTotal || 0} quota units consumed
                  </p>
                </div>
              </SidebarFooter>
            </Sidebar>
          </aside>

          <main className="min-w-0">
            <div className="mb-4 lg:hidden">
              <Tabs value={activeSectionKey} onValueChange={goToSection}>
                <TabsList className="w-full justify-start gap-1 overflow-x-auto p-1">
                  {BILLING_SECTIONS.map((section) => (
                    <TabsTrigger key={section.key} value={section.key} className="shrink-0">
                      {section.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {renderActiveSection()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default BillingPage;

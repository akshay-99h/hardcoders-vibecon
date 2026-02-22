import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiArrowLeft,
  FiBarChart2,
  FiCreditCard,
  FiList,
  FiRefreshCw,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ChartTooltipContent } from '../components/ui/chart';
import { AdminDataTable, SortableHeader } from '../components/admin/AdminDataTable';
import { useClientEnvironment } from '../utils/clientEnvironment';
import api from '../utils/api';

const CHART_COLORS = ['#0f49bd', '#3f83f8', '#7cb0ff', '#9ca3af', '#f59e0b', '#ef4444'];

const NAV_GROUPS = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: FiBarChart2,
    items: [
      {
        path: '/admin/analytics/overview',
        title: 'Overview',
        subtitle: 'KPIs + plan/seat insights',
        icon: FiBarChart2,
      },
      {
        path: '/admin/analytics/usage',
        title: 'Usage Trends',
        subtitle: 'Event and activity timeline',
        icon: FiList,
      },
    ],
  },
  {
    id: 'ums',
    label: 'UMS',
    icon: FiShield,
    items: [
      {
        path: '/admin/ums/admin-whitelist',
        title: 'Admin Whitelist',
        subtitle: 'Grant or revoke admin access',
        icon: FiShield,
      },
      {
        path: '/admin/ums/users',
        title: 'User Management',
        subtitle: 'Roles, plans, seats',
        icon: FiUsers,
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: FiCreditCard,
    items: [
      {
        path: '/admin/payments',
        title: 'Payments',
        subtitle: 'Checkout and invoices',
        icon: FiCreditCard,
      },
      {
        path: '/admin/subscriptions',
        title: 'Subscriptions',
        subtitle: 'Paid plans + period status',
        icon: FiBarChart2,
      },
      {
        path: '/admin/transactions',
        title: 'Transactions',
        subtitle: 'Full billing event stream',
        icon: FiList,
      },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
const NAV_PATHS = new Set(NAV_ITEMS.map((item) => item.path));

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function formatDateShort(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function AdminConsole() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileViewport, isStandalonePWA } = useClientEnvironment();
  const isCompactLayout = isMobileViewport || isStandalonePWA;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [seats, setSeats] = useState([]);
  const [events, setEvents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [savingKey, setSavingKey] = useState('');
  const [seatDrafts, setSeatDrafts] = useState({});
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const activePath = useMemo(() => {
    const normalized = location.pathname.replace(/\/$/, '') || '/admin';
    if (NAV_PATHS.has(normalized)) {
      return normalized;
    }
    return '/admin/analytics/overview';
  }, [location.pathname]);

  const activeNavItem = useMemo(
    () => NAV_ITEMS.find((item) => item.path === activePath) || NAV_ITEMS[0],
    [activePath]
  );

  const activeGroup = useMemo(() => {
    return NAV_GROUPS.find((group) => group.items.some((item) => item.path === activePath)) || NAV_GROUPS[0];
  }, [activePath]);

  const hydrateSeatDrafts = (nextUsers) => {
    const drafts = {};
    nextUsers.forEach((entry) => {
      drafts[entry.user_id] = {
        seat_limit: Number(entry.seat_limit ?? 1),
        seat_used: Number(entry.seat_used ?? 1),
      };
    });
    setSeatDrafts(drafts);
  };

  const fetchAdminData = async ({ asRefresh = false } = {}) => {
    if (asRefresh) setRefreshing(true);
    setError('');

    try {
      const [overviewRes, usersRes, eventsRes, subscriptionsRes, seatsRes] = await Promise.all([
        api.get('/api/admin/billing/overview'),
        api.get('/api/admin/users?limit=200'),
        api.get('/api/admin/billing/events?limit=250'),
        api.get('/api/admin/subscriptions?limit=200'),
        api.get('/api/admin/seats?limit=200'),
      ]);

      const nextUsers = usersRes.data?.users || [];

      setOverview(overviewRes.data || null);
      setUsers(nextUsers);
      setEvents(eventsRes.data?.events || []);
      setSubscriptions(subscriptionsRes.data?.subscriptions || []);
      setSeats(seatsRes.data?.seats || []);
      hydrateSeatDrafts(nextUsers);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load admin console data.');
    } finally {
      if (asRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const meRes = await api.get('/api/auth/me');
        setUser(meRes.data);

        if (meRes.data?.role !== 'admin' && meRes.data?.role !== 'superadmin') {
          setLoading(false);
          return;
        }

        await fetchAdminData();
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const normalized = location.pathname.replace(/\/$/, '') || '/admin';
    if (normalized === '/admin' || !NAV_PATHS.has(normalized)) {
      navigate('/admin/analytics/overview', { replace: true });
    }
  }, [isAdmin, location.pathname, navigate]);

  const updateRole = async (targetUserId, role) => {
    const key = `role:${targetUserId}`;
    setSavingKey(key);
    setError('');

    try {
      await api.put(`/api/admin/users/${targetUserId}/role`, { role });
      setUsers((prev) =>
        prev.map((entry) =>
          entry.user_id === targetUserId
            ? {
                ...entry,
                role,
              }
            : entry
        )
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update role.');
    } finally {
      setSavingKey('');
    }
  };

  const updatePlan = async (targetUserId, planKey) => {
    const key = `plan:${targetUserId}`;
    setSavingKey(key);
    setError('');

    try {
      await api.put(`/api/admin/users/${targetUserId}/subscription`, {
        plan_key: planKey,
        subscription_status: planKey === 'free' ? 'inactive' : 'active',
      });
      await fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update plan.');
    } finally {
      setSavingKey('');
    }
  };

  const updateSeatDraft = (targetUserId, field, value) => {
    setSeatDrafts((prev) => ({
      ...prev,
      [targetUserId]: {
        ...prev[targetUserId],
        [field]: Number(value),
      },
    }));
  };

  const updateSeats = async (targetUserId) => {
    const key = `seats:${targetUserId}`;
    const draft = seatDrafts[targetUserId];
    if (!draft) return;

    setSavingKey(key);
    setError('');

    try {
      await api.put(`/api/admin/users/${targetUserId}/seats`, {
        seat_limit: Number(draft.seat_limit),
        seat_used: Number(draft.seat_used),
      });
      await fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update seat allocation.');
    } finally {
      setSavingKey('');
    }
  };

  const planBreakdownData = useMemo(() => {
    const raw = overview?.plan_breakdown || {};
    return Object.entries(raw).map(([plan, count]) => ({
      plan: plan.toUpperCase(),
      users: Number(count || 0),
    }));
  }, [overview]);

  const roleBreakdownData = useMemo(() => {
    const counters = users.reduce(
      (acc, entry) => {
        const role = entry.role || 'user';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { user: 0, admin: 0, superadmin: 0 }
    );

    return Object.entries(counters)
      .filter(([, count]) => count > 0)
      .map(([role, count]) => ({
        role: role.toUpperCase(),
        count,
      }));
  }, [users]);

  const seatSummaryData = useMemo(
    () => [
      { label: 'Used Seats', value: Number(overview?.seat_used_total || 0) },
      { label: 'Available Seats', value: Number(overview?.seat_available_total || 0) },
    ],
    [overview]
  );

  const eventsByDayData = useMemo(() => {
    const grouped = {};

    events.forEach((event) => {
      const timestamp = event.created_at;
      if (!timestamp) return;
      const dayKey = new Date(timestamp).toISOString().slice(0, 10);
      grouped[dayKey] = (grouped[dayKey] || 0) + 1;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([day, count]) => ({
        day,
        label: formatDateShort(day),
        events: count,
      }));
  }, [events]);

  const eventTypeData = useMemo(() => {
    const grouped = {};

    events.forEach((event) => {
      const type = event.event_type || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([eventType, count]) => ({
        eventType: toTitleCase(eventType),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [events]);

  const paymentEvents = useMemo(
    () =>
      events.filter((event) => {
        const type = String(event.event_type || '').toLowerCase();
        return type.includes('payment') || type.includes('invoice') || type.includes('checkout');
      }),
    [events]
  );

  const paymentLifecycleData = useMemo(() => {
    const summary = {
      checkout: 0,
      payment: 0,
      invoice: 0,
      other: 0,
    };

    paymentEvents.forEach((event) => {
      const type = String(event.event_type || '').toLowerCase();
      if (type.includes('checkout')) {
        summary.checkout += 1;
      } else if (type.includes('payment')) {
        summary.payment += 1;
      } else if (type.includes('invoice')) {
        summary.invoice += 1;
      } else {
        summary.other += 1;
      }
    });

    return [
      { phase: 'Checkout', count: summary.checkout },
      { phase: 'Payment', count: summary.payment },
      { phase: 'Invoice', count: summary.invoice },
      { phase: 'Other', count: summary.other },
    ];
  }, [paymentEvents]);

  const subscriptionsByPlanData = useMemo(() => {
    const grouped = {};

    subscriptions.forEach((sub) => {
      const plan = sub.plan_key || 'free';
      grouped[plan] = (grouped[plan] || 0) + 1;
    });

    return Object.entries(grouped).map(([plan, count]) => ({
      plan: plan.toUpperCase(),
      count,
    }));
  }, [subscriptions]);

  const adminWhitelistColumns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: ({ row }) => <span>{row.original.name || '-'}</span>,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <SortableHeader column={column} title="Email" />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email || '-'}</span>,
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <SortableHeader column={column} title="Current Role" />,
        cell: ({ row }) => {
          const role = row.original.role || 'user';
          return <span className="capitalize">{role}</span>;
        },
      },
      {
        id: 'admin_access',
        header: 'Admin Access',
        enableSorting: false,
        cell: ({ row }) => {
          const entry = row.original;
          const isSuperAdmin = entry.role === 'superadmin';
          const isChecked = entry.role === 'admin' || isSuperAdmin;
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={isChecked}
                onCheckedChange={(checked) => updateRole(entry.user_id, checked ? 'admin' : 'user')}
                disabled={isSuperAdmin || savingKey === `role:${entry.user_id}`}
                aria-label={`toggle-admin-${entry.user_id}`}
              />
              <span className="text-xs text-muted-foreground">
                {isSuperAdmin ? 'Locked (superadmin)' : isChecked ? 'Whitelisted' : 'Not whitelisted'}
              </span>
            </div>
          );
        },
      },
    ],
    [savingKey]
  );

  const userManagementColumns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: ({ row }) => <span>{row.original.name || '-'}</span>,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <SortableHeader column={column} title="Email" />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.email || '-'}</span>,
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <SortableHeader column={column} title="Role" />,
        cell: ({ row }) => {
          const entry = row.original;
          const isSaving = savingKey === `role:${entry.user_id}`;
          return (
            <select
              value={entry.role || 'user'}
              onChange={(event) => updateRole(entry.user_id, event.target.value)}
              disabled={isSaving}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          );
        },
      },
      {
        accessorKey: 'plan_key',
        header: ({ column }) => <SortableHeader column={column} title="Plan" />,
        cell: ({ row }) => {
          const entry = row.original;
          const isSaving = savingKey === `plan:${entry.user_id}`;
          return (
            <select
              value={entry.plan_key || 'free'}
              onChange={(event) => updatePlan(entry.user_id, event.target.value)}
              disabled={isSaving}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="free">free</option>
              <option value="plus">plus</option>
              <option value="pro">pro</option>
              <option value="business">business</option>
            </select>
          );
        },
      },
      {
        accessorKey: 'subscription_status',
        header: ({ column }) => <SortableHeader column={column} title="Subscription" />,
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">{row.original.subscription_status || 'inactive'}</span>
        ),
      },
      {
        id: 'seats',
        header: 'Seats',
        enableSorting: false,
        cell: ({ row }) => {
          const entry = row.original;
          const draft = seatDrafts[entry.user_id] || {
            seat_used: Number(entry.seat_used ?? 1),
            seat_limit: Number(entry.seat_limit ?? 1),
          };
          return (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={draft.seat_used}
                onChange={(event) => updateSeatDraft(entry.user_id, 'seat_used', event.target.value)}
                className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
                title="Seats used"
              />
              <span className="text-muted-foreground">/</span>
              <input
                type="number"
                min={1}
                value={draft.seat_limit}
                onChange={(event) => updateSeatDraft(entry.user_id, 'seat_limit', event.target.value)}
                className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
                title="Seat limit"
              />
              <button
                onClick={() => updateSeats(entry.user_id)}
                disabled={savingKey === `seats:${entry.user_id}`}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
              >
                Save
              </button>
            </div>
          );
        },
      },
    ],
    [savingKey, seatDrafts]
  );

  const paymentColumns = useMemo(
    () => [
      {
        accessorKey: 'event_type',
        header: ({ column }) => <SortableHeader column={column} title="Event Type" />,
        cell: ({ row }) => <span>{toTitleCase(row.original.event_type || '-')}</span>,
      },
      {
        accessorKey: 'event_id',
        header: ({ column }) => <SortableHeader column={column} title="Event ID" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.event_id || '-'}</span>,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <SortableHeader column={column} title="Timestamp" />,
        cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.created_at)}</span>,
      },
    ],
    []
  );

  const subscriptionColumns = useMemo(
    () => [
      {
        accessorKey: 'email',
        header: ({ column }) => <SortableHeader column={column} title="User" />,
        cell: ({ row }) => <span>{row.original.email || row.original.user_id}</span>,
      },
      {
        accessorKey: 'plan_key',
        header: ({ column }) => <SortableHeader column={column} title="Plan" />,
        cell: ({ row }) => <span className="uppercase">{row.original.plan_key || 'free'}</span>,
      },
      {
        accessorKey: 'subscription_status',
        header: ({ column }) => <SortableHeader column={column} title="Status" />,
        cell: ({ row }) => <span className="capitalize">{row.original.subscription_status || 'inactive'}</span>,
      },
      {
        id: 'seats',
        header: 'Seats',
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {Number(row.original.seat_used || 0)} / {Number(row.original.seat_limit || 0)}
          </span>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => <SortableHeader column={column} title="Updated" />,
        cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.updated_at)}</span>,
      },
    ],
    []
  );

  const transactionColumns = useMemo(
    () => [
      {
        accessorKey: 'event_type',
        header: ({ column }) => <SortableHeader column={column} title="Event" />,
        cell: ({ row }) => <span>{toTitleCase(row.original.event_type || '-')}</span>,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <SortableHeader column={column} title="Created" />,
        cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.created_at)}</span>,
      },
      {
        accessorKey: 'event_id',
        header: ({ column }) => <SortableHeader column={column} title="Reference" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.event_id || '-'}</span>,
      },
    ],
    []
  );

  const renderPageContent = () => {
    if (activePath === '/admin/analytics/overview') {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="Total Users" value={overview?.total_users ?? 0} />
            <MetricCard label="Billing Profiles" value={overview?.total_billing_profiles ?? 0} />
            <MetricCard label="Active Subscriptions" value={overview?.active_subscriptions ?? 0} />
            <MetricCard
              label="Stripe Mode"
              value={overview?.stripe_test_mode ? 'Configured' : 'Missing'}
              hint={overview?.stripe_publishable_key_configured ? 'Publishable key set' : 'Publishable key missing'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Plan Distribution" subtitle="How users are split across plan tiers">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planBreakdownData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="plan" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="users" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Role Distribution" subtitle="Admin and user spread in the system">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleBreakdownData} dataKey="count" nameKey="role" innerRadius={52} outerRadius={82} paddingAngle={4}>
                      {roleBreakdownData.map((entry, index) => (
                        <Cell key={`${entry.role}-${entry.count}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Seat Capacity" subtitle="Used vs available seat inventory">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={seatSummaryData} dataKey="value" nameKey="label" innerRadius={50} outerRadius={82}>
                      {seatSummaryData.map((entry, index) => (
                        <Cell key={`${entry.label}-${entry.value}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Event Timeline" subtitle="Billing events captured per day">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={eventsByDayData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="events" stroke="var(--primary)" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </div>
      );
    }

    if (activePath === '/admin/analytics/usage') {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="Tracked Events" value={events.length} />
            <MetricCard label="Payment Events" value={paymentEvents.length} />
            <MetricCard label="Paid Subscriptions" value={subscriptions.length} />
            <MetricCard label="Seat Records" value={seats.length} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Top Event Types" subtitle="Most frequent event categories">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventTypeData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="eventType" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Event Volume Trend" subtitle="Two-week event movement">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eventsByDayData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eventVolumeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="events" stroke="var(--primary)" fill="url(#eventVolumeFill)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <AdminDataTable
            title="Recent Events"
            description="Sorted, paginated table for latest billing events."
            data={events}
            columns={transactionColumns}
            initialPageSize={8}
            pageSizeOptions={[8, 16, 32]}
            emptyMessage="No billing events recorded yet."
          />
        </div>
      );
    }

    if (activePath === '/admin/ums/admin-whitelist') {
      return (
        <AdminDataTable
          title="Admin Whitelist"
          description="Use the switch to grant or revoke admin portal access. Superadmin roles remain locked."
          data={users}
          columns={adminWhitelistColumns}
          initialPageSize={8}
          pageSizeOptions={[8, 16, 32]}
          emptyMessage="No users found to whitelist."
        />
      );
    }

    if (activePath === '/admin/ums/users') {
      return (
        <AdminDataTable
          title="User Management"
          description="Sort, paginate, and customize columns while managing role, plan, and seat allocations."
          data={users}
          columns={userManagementColumns}
          initialPageSize={6}
          pageSizeOptions={[6, 12, 24]}
          emptyMessage="No users available."
        />
      );
    }

    if (activePath === '/admin/payments') {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="Stripe Mode" value={overview?.stripe_test_mode ? 'Test configured' : 'Not configured'} />
            <MetricCard
              label="Publishable Key"
              value={overview?.stripe_publishable_key_configured ? 'Configured' : 'Missing'}
            />
            <MetricCard label="Payment Events" value={paymentEvents.length} />
            <MetricCard
              label="Last Payment Event"
              value={paymentEvents[0]?.created_at ? formatDateShort(paymentEvents[0].created_at) : '-'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Payment Lifecycle" subtitle="Checkout vs payment vs invoice signal counts">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentLifecycleData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="phase" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Subscriptions by Plan" subtitle="Distribution of paid subscriptions">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={subscriptionsByPlanData} margin={{ top: 6, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="subPlanFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="plan" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} fill="url(#subPlanFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <AdminDataTable
            title="Payment Events"
            description="Checkout and Stripe billing events available in demo mode."
            data={paymentEvents}
            columns={paymentColumns}
            initialPageSize={8}
            pageSizeOptions={[8, 16, 32]}
            emptyMessage="No payment events captured yet."
          />
        </div>
      );
    }

    if (activePath === '/admin/subscriptions') {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="Paid Subscriptions" value={subscriptions.length} />
            <MetricCard
              label="Active"
              value={subscriptions.filter((sub) => (sub.subscription_status || '').toLowerCase() === 'active').length}
            />
            <MetricCard
              label="Expiring Soon"
              value={subscriptions.filter((sub) => {
                if (!sub.current_period_end) return false;
                const diffMs = new Date(sub.current_period_end).getTime() - Date.now();
                return diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
              }).length}
            />
            <MetricCard label="Allocated Seats" value={subscriptions.reduce((sum, sub) => sum + Number(sub.seat_limit || 0), 0)} />
          </div>

          <ChartCard title="Subscription Mix" subtitle="Plan-wise split for paid users">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subscriptionsByPlanData} dataKey="count" nameKey="plan" innerRadius={55} outerRadius={88}>
                    {subscriptionsByPlanData.map((entry, index) => (
                      <Cell key={`${entry.plan}-${entry.count}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <AdminDataTable
            title="Subscription Records"
            description="Plan, status, seat consumption and update timestamps."
            data={subscriptions}
            columns={subscriptionColumns}
            initialPageSize={8}
            pageSizeOptions={[8, 16, 32]}
            emptyMessage="No paid subscriptions available yet."
          />
        </div>
      );
    }

    return (
      <AdminDataTable
        title="Transactions"
        description="Global event stream for billing, subscriptions, and checkout updates."
        data={events}
        columns={transactionColumns}
        initialPageSize={12}
        pageSizeOptions={[12, 24, 48]}
        emptyMessage="No transaction events available."
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading admin console...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground">Admin Access Required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is not whitelisted for admin analytics and management modules.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <FiArrowLeft size={14} />
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  const bottomNavPaddingClass = isCompactLayout ? 'pb-36' : 'pb-28';

  return (
    <div className="min-h-screen bg-background">
      <main className={`mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 sm:pt-6 ${bottomNavPaddingClass}`}>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/chat')}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <FiArrowLeft size={14} />
              Back to Chat
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">Admin Console</h1>
              <p className="text-xs text-muted-foreground">Billing + UMS controls</p>
            </div>
          </div>

          <button
            onClick={() => fetchAdminData({ asRefresh: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </header>

        <section className="mb-5 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {activeGroup.label}
          </p>
          <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{activeNavItem.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{activeNavItem.subtitle}</p>

          <Tabs
            value={activePath}
            onValueChange={(nextPath) => {
              if (nextPath && nextPath !== activePath) {
                navigate(nextPath);
              }
            }}
            className="mt-4"
          >
            <TabsList className="w-full justify-start gap-1 overflow-x-auto p-1">
              {activeGroup.items.map((item) => (
                <TabsTrigger key={item.path} value={item.path} className="shrink-0">
                  {item.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </section>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {renderPageContent()}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.45rem)' }}
      >
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-3 gap-1 px-3 pt-2">
          {NAV_GROUPS.map((group) => {
            const Icon = group.icon;
            const isActive = group.id === activeGroup.id;
            const target = group.items.find((item) => item.path === activePath)?.path || group.items[0].path;

            return (
              <button
                key={group.id}
                onClick={() => navigate(target)}
                className={`rounded-xl px-3 py-2 text-left transition-colors ${
                  isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  <Icon size={15} />
                  <span>{group.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default AdminConsole;

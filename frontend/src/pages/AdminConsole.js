import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function AdminConsole() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [seats, setSeats] = useState([]);
  const [events, setEvents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [seatDrafts, setSeatDrafts] = useState({});
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const loadData = async () => {
    try {
      const [overviewRes, usersRes, eventsRes, subscriptionsRes, seatsRes] = await Promise.all([
        api.get('/api/admin/billing/overview'),
        api.get('/api/admin/users?limit=100'),
        api.get('/api/admin/billing/events?limit=50'),
        api.get('/api/admin/subscriptions?limit=100'),
        api.get('/api/admin/seats?limit=100'),
      ]);
      setOverview(overviewRes.data);
      const nextUsers = usersRes.data?.users || [];
      setUsers(nextUsers);
      setEvents(eventsRes.data?.events || []);
      setSubscriptions(subscriptionsRes.data?.subscriptions || []);
      setSeats(seatsRes.data?.seats || []);

      const nextSeatDrafts = {};
      nextUsers.forEach((u) => {
        nextSeatDrafts[u.user_id] = {
          seat_limit: Number(u.seat_limit ?? 1),
          seat_used: Number(u.seat_used ?? 1),
        };
      });
      setSeatDrafts(nextSeatDrafts);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load admin data');
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
        await loadData();
      } catch (err) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [navigate]);

  const updateRole = async (targetUserId, role) => {
    const key = `role:${targetUserId}`;
    setSavingKey(key);
    setError('');
    try {
      await api.put(`/api/admin/users/${targetUserId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.user_id === targetUserId ? { ...u, role } : u)));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setSavingKey('');
    }
  };

  const updatePlan = async (targetUserId, plan_key) => {
    const key = `plan:${targetUserId}`;
    setSavingKey(key);
    setError('');
    try {
      await api.put(`/api/admin/users/${targetUserId}/subscription`, { plan_key, subscription_status: 'active' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update plan');
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
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update seats');
    } finally {
      setSavingKey('');
    }
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
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Admin Only</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You do not have access to admin billing and user management tools.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Console</h1>
            <p className="text-sm text-muted-foreground">Billing dashboard and user management (admin only)</p>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="px-3 py-2 rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
          >
            Back to Chat
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Total Users" value={overview?.total_users ?? '-'} />
          <MetricCard label="Billing Profiles" value={overview?.total_billing_profiles ?? '-'} />
          <MetricCard label="Active Subscriptions" value={overview?.active_subscriptions ?? '-'} />
          <MetricCard
            label="Stripe Mode"
            value={overview?.stripe_test_mode ? 'Configured' : 'Not Configured'}
          />
          <MetricCard label="Total Seats" value={overview?.seat_limit_total ?? '-'} />
          <MetricCard label="Seats Used" value={overview?.seat_used_total ?? '-'} />
          <MetricCard label="Seats Available" value={overview?.seat_available_total ?? '-'} />
          <MetricCard
            label="Publishable Key"
            value={overview?.stripe_publishable_key_configured ? 'Configured' : 'Missing'}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 overflow-x-auto">
          <h3 className="text-lg font-semibold text-foreground mb-4">Users</h3>
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Plan</th>
                <th className="py-2">Subscription</th>
                <th className="py-2">Seats</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-b border-border">
                  <td className="py-2 text-foreground">{u.name || '-'}</td>
                  <td className="py-2 text-muted-foreground">{u.email || '-'}</td>
                  <td className="py-2">
                    <select
                      value={u.role || 'user'}
                      onChange={(e) => updateRole(u.user_id, e.target.value)}
                      disabled={savingKey === `role:${u.user_id}`}
                      className="px-2 py-1 rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <select
                      value={u.plan_key || 'free'}
                      onChange={(e) => updatePlan(u.user_id, e.target.value)}
                      disabled={savingKey === `plan:${u.user_id}`}
                      className="px-2 py-1 rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="free">free</option>
                      <option value="plus">plus</option>
                      <option value="pro">pro</option>
                      <option value="business">business</option>
                    </select>
                  </td>
                  <td className="py-2 text-muted-foreground">{u.subscription_status || 'inactive'}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={seatDrafts[u.user_id]?.seat_used ?? u.seat_used ?? 1}
                        onChange={(e) => updateSeatDraft(u.user_id, 'seat_used', e.target.value)}
                        className="w-16 px-2 py-1 rounded-md border border-border bg-background text-foreground"
                        title="Seats used"
                      />
                      <span className="text-muted-foreground">/</span>
                      <input
                        type="number"
                        min={1}
                        value={seatDrafts[u.user_id]?.seat_limit ?? u.seat_limit ?? 1}
                        onChange={(e) => updateSeatDraft(u.user_id, 'seat_limit', e.target.value)}
                        className="w-16 px-2 py-1 rounded-md border border-border bg-background text-foreground"
                        title="Seat limit"
                      />
                      <button
                        onClick={() => updateSeats(u.user_id)}
                        disabled={savingKey === `seats:${u.user_id}`}
                        className="px-2 py-1 rounded-md border border-border hover:bg-accent text-foreground"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 overflow-x-auto">
            <h3 className="text-lg font-semibold text-foreground mb-4">Seat Allocation</h3>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">User</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Seats</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((seat) => (
                  <tr key={`${seat.user_id}-${seat.updated_at || ''}`} className="border-b border-border">
                    <td className="py-2 text-foreground">{seat.email || seat.user_id}</td>
                    <td className="py-2 text-muted-foreground">{seat.plan_key || 'free'}</td>
                    <td className="py-2 text-muted-foreground">
                      {seat.seat_used ?? 0} / {seat.seat_limit ?? 0}
                    </td>
                  </tr>
                ))}
                {seats.length === 0 && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={3}>No seat allocations available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 overflow-x-auto">
            <h3 className="text-lg font-semibold text-foreground mb-4">Subscriptions</h3>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">User</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Seats</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={`${sub.user_id}-${sub.updated_at || ''}`} className="border-b border-border">
                    <td className="py-2 text-foreground">{sub.email || sub.user_id}</td>
                    <td className="py-2 text-muted-foreground">{sub.plan_key || 'free'}</td>
                    <td className="py-2 text-muted-foreground">{sub.subscription_status || 'inactive'}</td>
                    <td className="py-2 text-muted-foreground">
                      {sub.seat_used ?? 0} / {sub.seat_limit ?? 0}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {sub.updated_at ? new Date(sub.updated_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={5}>No paid subscriptions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 overflow-x-auto">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Billing Events</h3>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2">Event Type</th>
                  <th className="py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.event_id || `${event.event_type}-${event.created_at}`} className="border-b border-border">
                    <td className="py-2 text-foreground">{event.event_type}</td>
                    <td className="py-2 text-muted-foreground">
                      {event.created_at ? new Date(event.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={2}>No webhook events received yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground mt-1">{value}</p>
    </div>
  );
}

export default AdminConsole;

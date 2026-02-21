import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function AdminConsole() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const loadData = async () => {
    try {
      const [overviewRes, usersRes] = await Promise.all([
        api.get('/api/admin/billing/overview'),
        api.get('/api/admin/users?limit=100'),
      ]);
      setOverview(overviewRes.data);
      setUsers(usersRes.data?.users || []);
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
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === targetUserId ? { ...u, plan_key, subscription_status: 'active' } : u
        )
      );
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update plan');
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
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 overflow-x-auto">
          <h3 className="text-lg font-semibold text-foreground mb-4">Users</h3>
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Plan</th>
                <th className="py-2">Subscription</th>
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
                </tr>
              ))}
            </tbody>
          </table>
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

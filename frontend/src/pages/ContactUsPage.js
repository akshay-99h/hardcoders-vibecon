import React, { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import ContactSupportBlock from '../components/ui/contact-support-block';
import api from '../utils/api';

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

export default function ContactUsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [grievances, setGrievances] = useState([]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const meRes = await api.get('/api/auth/me');
        setUser(meRes.data || null);
        try {
          const grievancesRes = await api.get('/api/contact/grievances?limit=8');
          setGrievances(grievancesRes.data?.grievances || []);
        } catch {
          setGrievances([]);
        }
      } catch {
        setUser(null);
        setGrievances([]);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading support...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate(user ? '/chat' : '/')}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
          >
            <FiArrowLeft size={14} />
            {user ? 'Back to Chat' : 'Back to Home'}
          </button>
          {user ? (
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">You can submit this form even without signing in.</p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h1 className="text-2xl font-bold text-foreground">Contact Us</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Raise a grievance, billing issue, or suspicious-login concern.
            </p>
            <div className="mt-5">
              <ContactSupportBlock defaultName={user?.name || ''} defaultEmail={user?.email || ''} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">Your Recent Requests</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {user ? 'Latest support tickets from this account.' : 'Sign in to view your past requests.'}
            </p>
            <div className="mt-4 space-y-3">
              {!user && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Past requests are visible after sign-in.
                </div>
              )}
              {user && grievances.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No requests submitted yet.
                </div>
              )}
              {user && grievances.map((item) => (
                <div key={item.grievance_id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.topic}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                        item.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : item.status === 'in_review'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {String(item.status || 'open').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Ticket: {item.grievance_id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Created: {formatDate(item.created_at)}</p>
                  {item.admin_note ? (
                    <p className="mt-2 rounded-lg bg-muted/50 px-2 py-1.5 text-xs text-foreground">
                      Admin note: {item.admin_note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

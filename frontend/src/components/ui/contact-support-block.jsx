import { useMemo, useState } from 'react';
import { Call02Icon, MessageMultiple01Icon, Tick02Icon } from 'hugeicons-react';
import api from '../../utils/api';
import { useClientEnvironment } from '../../utils/clientEnvironment';
import { Card, CardContent, CardTitle } from './card';
import { Input } from './input';
import { Textarea } from './textarea';
import { Button } from './button';

const TOPICS = [
  'General Inquiry',
  'Account Issue',
  'Billing',
  'Technical Support',
  'Feedback/Suggestion',
  'Suspicious Login Activity',
];

const FAQS = [
  {
    question: 'How do I reset my password?',
    answer: "Use the login screen and complete your provider account recovery flow.",
  },
  {
    question: 'How do I update billing information?',
    answer: 'Go to Billing and open Manage Subscription to update payment details.',
  },
  {
    question: 'How do I report suspicious login activity?',
    answer: 'Submit this form with the login timestamp/device details from your alert email.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Use this form and our team will reply through the registered contact email.',
  },
];

function getRelatedFaqs(query) {
  if (!query.trim()) return [];
  const needle = query.toLowerCase();
  return FAQS.filter(
    (faq) => faq.question.toLowerCase().includes(needle) || faq.answer.toLowerCase().includes(needle)
  ).slice(0, 2);
}

function ProgressStep({ index, active, done, label }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
          done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        {index}
      </span>
      <span className={`text-xs ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

export default function ContactSupportBlock({ defaultName = '', defaultEmail = '' }) {
  const { isMobileViewport, isStandalonePWA } = useClientEnvironment();
  const compact = isMobileViewport || isStandalonePWA;

  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');

  const relatedFaqs = useMemo(() => getRelatedFaqs(message), [message]);

  const resetForm = () => {
    setStep(1);
    setTopic('');
    setMessage('');
    setName(defaultName);
    setEmail(defaultEmail);
    setSubmitting(false);
    setTicket('');
    setError('');
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && !topic) {
      setError('Please select a topic.');
      return;
    }
    if (step === 2 && !message.trim()) {
      setError('Please describe your issue.');
      return;
    }
    if (step === 3 && (!name.trim() || !email.trim())) {
      setError('Please enter your name and email.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setError('');
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/api/contact/grievances', {
        topic,
        message,
        contact_name: name,
        contact_email: email,
      });
      setTicket(response.data?.ticket_id || `grv_${Date.now()}`);
      setStep(4);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to submit request right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4 && ticket) {
    return (
      <Card className="w-full max-w-xl mx-auto">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <Tick02Icon size={24} />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Request Submitted</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Your support ticket <span className="font-semibold text-foreground">{ticket}</span> has been received.
            Our team will review and reach out at <span className="font-medium">{email}</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={resetForm}>
              Submit another request
            </Button>
            <Button variant="ghost" onClick={() => (window.location.href = '/chat')}>
              Back to chat
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="space-y-5 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Call02Icon size={20} />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              Contact Support
              <MessageMultiple01Icon size={18} />
            </CardTitle>
            <p className="text-sm text-muted-foreground">Raise a grievance or ask for account support.</p>
          </div>
        </div>

        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <ProgressStep index={1} active={step === 1} done={step > 1} label="Topic" />
          <ProgressStep index={2} active={step === 2} done={step > 2} label="Issue" />
          <ProgressStep index={3} active={step === 3} done={step > 3} label="Contact" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">What can we help you with?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOPICS.map((entry) => (
                  <Button
                    key={entry}
                    type="button"
                    variant={topic === entry ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => setTopic(entry)}
                  >
                    {entry}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">Describe your issue</label>
              <Textarea
                placeholder="Please provide details including time/date if this is security related..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
              />
              {relatedFaqs.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related FAQs</p>
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    {relatedFaqs.map((faq) => (
                      <li key={faq.question} className="text-xs text-muted-foreground">
                        {faq.question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">How should we contact you?</label>
              <Input placeholder="Your Name" value={name} onChange={(event) => setName(event.target.value)} />
              <Input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={handlePrev}>
                Back
              </Button>
            )}
            {step < 3 && (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

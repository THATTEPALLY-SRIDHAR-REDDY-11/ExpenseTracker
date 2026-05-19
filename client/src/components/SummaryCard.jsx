import { useEffect, useState } from 'react';
import { api } from '../api.js';

function friendlyError(raw) {
  if (!raw || typeof raw !== 'string') return 'Could not load summary.';
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429') || raw.toLowerCase().includes('quota')) {
    return 'Gemini free-tier limit reached. Summary will use basic stats until quota resets, or switch to gemini-2.0-flash in .env.';
  }
  if (raw.length > 200) return 'Could not load AI summary. Please try again later.';
  return raw;
}

export function SummaryCard({ refreshKey, expenseCount }) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setNotice('');
      try {
        const { data } = await api.get('/insights');
        if (!cancelled) {
          setText(data.insights || '');
          setNotice(data.notice || (data.source === 'local' ? '' : ''));
        }
      } catch (e) {
        if (!cancelled) {
          setError(friendlyError(e.response?.data?.error || e.message));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, expenseCount]);

  return (
    <section className="card summary-card" aria-live="polite">
      <h2 className="card-title">AI spending summary</h2>
      {loading && <p className="muted">Analyzing your expenses…</p>}
      {error && <p className="text-error">{error}</p>}
      {!loading && !error && (
        <>
          {notice && <p className="summary-notice">{notice}</p>}
          <p className="summary-body">{text}</p>
        </>
      )}
    </section>
  );
}

import { useState } from 'react';
import { api } from '../api.js';
import { ExpenseCard } from './ExpenseCard.jsx';

export function ExpenseList({ expenses, loading, onDeleted, onRetry }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this expense?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/expenses/${id}`);
      onDeleted(id);
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p className="muted center">Loading expenses…</p>;
  }

  if (!expenses.length) {
    return (
      <section className="empty-state">
        <p className="muted">No expenses yet. Upload a receipt to get started.</p>
        <button type="button" className="btn secondary" onClick={onRetry}>
          Refresh
        </button>
      </section>
    );
  }

  return (
    <section className="expense-list-section">
      <h2 className="section-heading">Your expenses</h2>
      <div className="expense-grid">
        {expenses.map((exp) => (
          <ExpenseCard
            key={exp._id}
            expense={exp}
            onDelete={handleDelete}
            deleting={deletingId === exp._id}
          />
        ))}
      </div>
    </section>
  );
}

import { imageUrl } from '../api.js';

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ExpenseCard({ expense, onDelete, deleting }) {
  return (
    <article className="card expense-card">
      <div className="expense-card-grid">
        <div className="expense-thumb-wrap">
          <img
            src={imageUrl(expense.image)}
            alt=""
            className="expense-thumb"
            loading="lazy"
          />
        </div>
        <div className="expense-body">
          <div className="expense-header">
            <h3 className="expense-shop">{expense.shopName}</h3>
            <span className="pill">{expense.category}</span>
          </div>
          <p className="expense-amount">{currency.format(expense.amount)}</p>
          <p className="muted small">{formatDate(expense.date)}</p>
          {expense.summary && <p className="expense-summary">{expense.summary}</p>}
          <button
            type="button"
            className="btn text danger"
            onClick={() => onDelete(expense._id)}
            disabled={deleting}
          >
            {deleting ? 'Removing…' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );
}

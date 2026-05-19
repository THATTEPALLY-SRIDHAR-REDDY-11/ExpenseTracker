/**
 * Local spending summary (no Gemini API) — used when quota is exceeded or AI fails.
 */
export function buildLocalInsights(expenses) {
  if (!expenses.length) {
    return 'Add a receipt to see spending insights here.';
  }

  const byCategory = {};
  let total = 0;
  for (const e of expenses) {
    const cat = e.category || 'Other';
    const amt = Number(e.amount) || 0;
    byCategory[cat] = (byCategory[cat] || 0) + amt;
    total += amt;
  }

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const [topCat, topAmt] = sorted[0];
  const share = total > 0 ? Math.round((topAmt / total) * 100) : 0;

  const lines = [
    `Most of your expenses are on ${topCat.toLowerCase()} (about ${share}% of tracked spending).`,
  ];

  if (sorted.length > 1) {
    const [secondCat] = sorted[1];
    lines.push(`You also spend regularly on ${secondCat.toLowerCase()}.`);
  }

  lines.push(`You have ${expenses.length} expense${expenses.length === 1 ? '' : 's'} saved.`);

  return lines.join(' ');
}

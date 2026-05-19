import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { SummaryCard } from './components/SummaryCard.jsx';
import { UploadForm } from './components/UploadForm.jsx';
import { ExpenseList } from './components/ExpenseList.jsx';
import { api } from './api.js';

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [insightRefresh, setInsightRefresh] = useState(0);

  const loadExpenses = useCallback(async () => {
    setListError('');
    setLoadingList(true);
    try {
      const { data } = await api.get('/expenses');
      setExpenses(data);
    } catch (e) {
      setListError(e.response?.data?.error || e.message || 'Could not load expenses');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleUploaded = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
    setInsightRefresh((k) => k + 1);
  };

  const handleDeleted = (id) => {
    setExpenses((prev) => prev.filter((e) => e._id !== id));
    setInsightRefresh((k) => k + 1);
  };

  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <SummaryCard refreshKey={insightRefresh} expenseCount={expenses.length} />
        <UploadForm onUploaded={handleUploaded} />
        {listError && <p className="banner error">{listError}</p>}
        <ExpenseList
          expenses={expenses}
          loading={loadingList}
          onDeleted={handleDeleted}
          onRetry={loadExpenses}
        />
      </main>
    </div>
  );
}

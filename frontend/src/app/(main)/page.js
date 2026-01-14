"use client";

import { useState, useEffect } from 'react';
import ChallengeList from '@/components/home/ChallengeList';
import TotalSpending from '@/components/home/TotalSpending';
import CategorySpending from '@/components/home/CategorySpending';
import RecentTransactions from '@/components/home/RecentTransactions';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleTransactionAdded = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('transactionAdded', handleTransactionAdded);
    return () => {
      window.removeEventListener('transactionAdded', handleTransactionAdded);
    };
  }, []);

  return (
    <main style={{ padding: '1.5rem' }}>
      <ChallengeList />
      <TotalSpending key={refreshKey} />
      <CategorySpending key={refreshKey} />
      <RecentTransactions key={refreshKey} />
    </main>
  );
}

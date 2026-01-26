"use client";

import { useState } from 'react';
import GlobalHeader from '@/components/common/GlobalHeader';
import BottomNavigation from '@/components/common/BottomNavigation';
import QuickAddPopup from '@/components/home/QuickAddPopup';

export default function ClientLayout({ children }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    // We might need a way to refresh data when transaction is added.
    // For now, we'll just close the popup. 
    // Ideally, we'd use a global context or React Query for data invalidation.

    const handleTransactionAdded = () => {
        // In a real app, trigger a global refresh or invalidate queries
        console.log("Transaction added via global quick add");
        // For simple refresh without context, we might need a custom event or just rely on page re-fetch on nav
        // But since we are on the same page, we might miss updates if we don't handle it.
        // Let's dispatch a custom event that pages can listen to.
        window.dispatchEvent(new Event('transactionAdded'));
    };

    return (
        <div style={{
            backgroundColor: '#e0e0e0',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: 'var(--background-light)',
                minHeight: '100vh',
                boxShadow: '0 0 20px rgba(0,0,0,0.1)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <GlobalHeader />

                <div style={{ flex: 1, paddingBottom: '80px' }}>
                    {children}
                </div>

                {!isPopupOpen && (
                    <BottomNavigation onQuickAddClick={() => setIsPopupOpen(true)} />
                )}

                {isPopupOpen && (
                    <QuickAddPopup
                        onClose={() => setIsPopupOpen(false)}
                        onTransactionAdded={handleTransactionAdded}
                    />
                )}
            </div>
        </div>
    );
}

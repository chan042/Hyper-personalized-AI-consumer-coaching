"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import GlobalHeader from '@/components/common/GlobalHeader';
import BottomNavigation from '@/components/common/BottomNavigation';
import QuickAddPopup from '@/components/home/QuickAddPopup';
import { NotificationProvider } from '@/contexts/NotificationContext';

const HIDE_BOTTOM_NAV_ROUTES = ['/room', '/shop', '/closet', '/chatbot'];

export default function ClientLayout({ children }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // SSR 시 기본값 사용 (mounted 이전에는 non-chatbot 상태로 고정)
    const isChatbotPage = mounted && pathname === '/chatbot';
    const hideBottomNav = mounted && HIDE_BOTTOM_NAV_ROUTES.includes(pathname);

    const handleTransactionAdded = () => {
        console.log("Transaction added via global quick add");
        window.dispatchEvent(new Event('transactionAdded'));
    };

    return (
        <NotificationProvider>
            <div style={{
                backgroundColor: '#e0e0e0',
                minHeight: isChatbotPage ? '100dvh' : '100vh',
                height: isChatbotPage ? '100dvh' : 'auto',
                display: 'flex',
                justifyContent: 'center',
                overflow: isChatbotPage ? 'hidden' : 'visible',
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '430px',
                    backgroundColor: 'var(--background-light)',
                    minHeight: isChatbotPage ? '100dvh' : '100vh',
                    height: isChatbotPage ? '100dvh' : 'auto',
                    boxShadow: '0 0 20px rgba(0,0,0,0.1)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: isChatbotPage ? 'hidden' : 'visible',
                }}>
                    <GlobalHeader />

                    <div style={{
                        flex: 1,
                        minHeight: 0,
                        paddingBottom: hideBottomNav ? '0px' : '80px',
                        overflow: isChatbotPage ? 'hidden' : 'visible',
                    }}>
                        {children}
                    </div>

                    {!isPopupOpen && !hideBottomNav && (
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
        </NotificationProvider>
    );
}

"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getNotifications as fetchNotificationsAPI,
    markAsRead as markAsReadAPI,
    markAllAsRead as markAllAsReadAPI,
    getUnreadCount as getUnreadCountAPI,
} from '@/lib/api/notification';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await fetchNotificationsAPI();
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.is_read).length);
        } catch (error) {
            console.error('알림 목록 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await getUnreadCountAPI();
            setUnreadCount(count);
        } catch (error) {
            console.error('알림 개수 조회 실패:', error);
        }
    }, []);

    // 인증 상태에 따라 폴링 시작/중지
    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated, fetchUnreadCount]);

    const markAsRead = useCallback(async (id) => {
        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        try {
            await markAsReadAPI(id);
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error);
            // 실패 시 원복
            fetchNotifications();
        }
    }, [fetchNotifications]);

    const markAllAsRead = useCallback(async () => {
        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            await markAllAsReadAPI();
        } catch (error) {
            console.error('전체 읽음 처리 실패:', error);
            fetchNotifications();
        }
    }, [fetchNotifications]);

    const value = {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification은 NotificationProvider 내부에서 사용해야 합니다.');
    }
    return context;
}

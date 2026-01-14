"use client";

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function HistoryHeader() {
    return (
        <header style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem',
            backgroundColor: 'var(--background-light)',
            position: 'sticky',
            top: 0,
            zIndex: 10
        }}>
            {/* 뒤로가기 버튼 제거됨 */}
            <h1 style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-main)'
            }}>
                실천한 AI 코칭
            </h1>
        </header>
    );
}

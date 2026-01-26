"use client";

import { MoreVertical } from 'lucide-react';

export default function CoachingHeader() {
    return (
        <header style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
            position: 'relative',
            backgroundColor: 'var(--background-light)'
        }}>
            <h1 style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-main)'
            }}>
                AI 코칭
            </h1>
            <button style={{
                position: 'absolute',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem'
            }}>
                <MoreVertical size={24} color="var(--text-main)" />
            </button>
        </header>
    );
}

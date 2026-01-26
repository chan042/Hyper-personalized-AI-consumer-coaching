"use client";

import { Image as ImageIcon } from 'lucide-react';

export default function ImageMatching() {
    return (
        <button style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            gap: '0.5rem'
        }}>
            <ImageIcon color="var(--primary)" size={28} />
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-main)' }}>이미지 매칭</span>
        </button>
    );
}

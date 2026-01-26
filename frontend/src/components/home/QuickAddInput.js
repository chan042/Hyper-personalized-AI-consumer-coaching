"use client";

import { Sparkles } from 'lucide-react';

export default function QuickAddInput({ value, onChange }) {
    return (
        <div style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main)' }}>자연어 입력</h3>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '16px',
                padding: '1rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', // Stronger shadow
                border: '2px solid var(--primary)', // Highlight border
                transition: 'all 0.2s ease'
            }}>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="예: 강남 스타벅스 4500원"
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '1.1rem',
                        color: 'var(--text-main)',
                        backgroundColor: 'transparent',
                        fontWeight: '500'
                    }}
                />
                <Sparkles size={20} color="#FFD700" style={{ marginLeft: '0.5rem' }} />
            </div>
        </div>
    );
}

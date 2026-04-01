"use client";

import { Image as ImageIcon } from 'lucide-react';

export default function ImageMatching({ onClick, disabled = false, badgeLabel = '' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '12px',
                padding: '1.5rem',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                gap: '0.5rem',
                opacity: disabled ? 0.6 : 1,
            }}
        >
            {badgeLabel ? (
                <span style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    padding: '0.2rem 0.45rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(20, 184, 166, 0.14)',
                    color: 'var(--primary-dark)',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    letterSpacing: '-0.01em',
                }}>
                    {badgeLabel}
                </span>
            ) : null}
            <ImageIcon color="var(--primary)" size={28} />
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-main)' }}>이미지 매칭</span>
        </button>
    );
}

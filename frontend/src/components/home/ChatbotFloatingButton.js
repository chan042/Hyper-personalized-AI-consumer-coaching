"use client";

import { useState } from 'react';
import { Headset } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChatbotFloatingButton() {
    const [isHovered, setIsHovered] = useState(false);
    const router = useRouter();

    return (
        <button
            onClick={() => router.push('/chatbot')}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'fixed',
                bottom: '96px',
                right: 'max(16px, calc(50vw - 199px))',
                transform: isHovered
                    ? 'translateY(-2px)'
                    : 'translateY(0)',
                height: '50px',
                padding: '0 1.15rem 0 1.25rem',
                border: 'none',
                borderRadius: '999px',
                background: isHovered
                    ? 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 48%, #7be7dd 100%)'
                    : 'linear-gradient(135deg, #0d9488 0%, #14b8a6 48%, #5eead4 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 10px 22px rgba(0, 0, 0, 0.18)',
                cursor: 'pointer',
                zIndex: 50,
                transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), background 0.22s ease',
            }}
            aria-label="Duduk AI 열기"
        >
            <span style={{
                fontSize: '0.96rem',
                fontWeight: '800',
                letterSpacing: '-0.02em',
                lineHeight: 1,
            }}>
                Duduk AI
            </span>
            <Headset size={18} strokeWidth={2.3} />
        </button>
    );
}

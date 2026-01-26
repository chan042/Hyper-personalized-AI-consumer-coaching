"use client";

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function DislikeReasonPopup({ onClose, onSubmit }) {
    const [reason, setReason] = useState('');

    // Prevent background scrolling when popup is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleSubmit = () => {
        onSubmit(reason);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end', // Bottom sheet style like QuickAdd
            justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'white',
                width: '100%',
                maxWidth: '430px',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                padding: '1.5rem',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: 'var(--text-main)'
                    }}>
                        이유를 알려주세요
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={24} color="var(--text-sub)" />
                    </button>
                </div>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="이 제안이 마음에 들지 않는 이유를 적어주세요..."
                    style={{
                        width: '100%',
                        height: '120px',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #e2e8f0',
                        resize: 'none',
                        marginBottom: '1.5rem',
                        fontSize: '1rem',
                        fontFamily: 'inherit'
                    }}
                />

                <button
                    onClick={handleSubmit}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    제출하기
                </button>
                <style jsx>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
}

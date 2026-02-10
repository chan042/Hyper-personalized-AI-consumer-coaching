"use client";

export default function LoadingOverlay({ message = '로딩 중입니다...' }) {
    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="spinner-ring"></div>
                <p style={{ color: '#64748b', fontWeight: '500' }}>{message}</p>
            </div>
        </div>
    );
}

"use client";

export default function SavingsSummary({ totalSavings = 0 }) {
    const getMessage = (amount) => {
        if (amount === 0) return "아직 절약된 금액이 없어요";
        if (amount < 5000) return "메가커피 아메리카노 2잔 값이에요 ☕️";
        if (amount < 10000) return "뜨끈한 국밥 한 그릇 먹을 수 있어요 🍚";
        if (amount < 20000) return "맛있는 치킨 한 마리 시켜먹을 수 있어요 🍗";
        if (amount < 50000) return "CGV 영화 티켓 3장 값이에요 🎬";
        return "제주도 편도 항공권 값이에요 ✈️";
    };

    return (
        <div style={{
            textAlign: 'center',
            padding: '2rem 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
        }}>
            <span style={{
                fontSize: '0.9rem',
                color: 'var(--text-sub)'
            }}>
                예상 절약액
            </span>
            <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'var(--primary)',
                fontFamily: 'var(--font-mono)'
            }}>
                ₩{totalSavings.toLocaleString()}
            </h2>
            <p style={{
                fontSize: '1rem',
                color: 'var(--text-sub)'
            }}>
                {getMessage(totalSavings)}
            </p>
        </div>
    );
}

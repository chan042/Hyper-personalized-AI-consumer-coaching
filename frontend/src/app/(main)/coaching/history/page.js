"use client";

import { CheckCircle2, Cookie, Bus, Music, Smartphone, Coffee, ShoppingBag } from 'lucide-react';

const allCompletedItems = [
    { id: 1, icon: <Cookie size={20} color="#718096" />, text: "편의점 간식 줄이기", date: "2024.03.15" },
    { id: 2, icon: <Bus size={20} color="#718096" />, text: "대중교통 이용하기", date: "2024.03.14" },
    { id: 3, icon: <Music size={20} color="#718096" />, text: "구독 서비스 정리하기", date: "2024.03.12" },
    { id: 4, icon: <Smartphone size={20} color="#718096" />, text: "통신비 요금제 변경", date: "2024.03.10" },
    { id: 5, icon: <Coffee size={20} color="#718096" />, text: "카페 대신 텀블러 사용", date: "2024.03.08" },
    { id: 6, icon: <ShoppingBag size={20} color="#718096" />, text: "충동구매 참기", date: "2024.03.05" },
    { id: 7, icon: <Cookie size={20} color="#718096" />, text: "야식 배달 줄이기", date: "2024.03.01" },
];

export default function HistoryPage() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-light)' }}>
            <h1 style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                padding: '1rem 1.5rem'
            }}>
                실천한 AI 코칭
            </h1>
            <main style={{ padding: '0 1.5rem 2rem 1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {allCompletedItems.map((item) => (
                        <div key={item.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--card-bg)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {item.icon}
                                <div>
                                    <div style={{
                                        color: 'var(--text-main)',
                                        fontSize: '1rem',
                                        marginBottom: '0.2rem'
                                    }}>
                                        {item.text}
                                    </div>
                                    <div style={{
                                        color: 'var(--text-sub)',
                                        fontSize: '0.8rem'
                                    }}>
                                        {item.date}
                                    </div>
                                </div>
                            </div>
                            <CheckCircle2 size={24} color="#2f855a" fill="#e6fffa" />
                        </div>
                    ))}
                </div>
            </main>
        </div >
    );
}

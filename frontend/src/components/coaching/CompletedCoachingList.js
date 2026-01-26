"use client";

import { CheckCircle2, Cookie, Bus, Music, Smartphone, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const completedItems = [
    { id: 1, icon: <Cookie size={20} color="#718096" />, text: "편의점 간식 줄이기" },
    { id: 2, icon: <Bus size={20} color="#718096" />, text: "대중교통 이용하기" },
    { id: 3, icon: <Music size={20} color="#718096" />, text: "구독 서비스 정리하기" },
    { id: 4, icon: <Smartphone size={20} color="#718096" />, text: "통신비 요금제 변경" },
];

export default function CompletedCoachingList() {
    return (
        <div style={{ padding: '0 1.5rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: 'var(--text-main)'
                }}>
                    실천한 AI 코칭
                </h3>
                <Link href="/coaching/history" style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--text-sub)',
                    fontSize: '0.9rem',
                    textDecoration: 'none'
                }}>
                    더보기 <ChevronRight size={16} />
                </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {completedItems.map((item) => (
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
                            <span style={{
                                color: 'var(--text-main)',
                                fontSize: '1rem'
                            }}>
                                {item.text}
                            </span>
                        </div>
                        <CheckCircle2 size={24} color="#2f855a" fill="#e6fffa" />
                    </div>
                ))}
            </div>
        </div>
    );
}

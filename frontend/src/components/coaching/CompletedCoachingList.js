"use client";

import { CheckCircle2, MapPin, Droplets, Lightbulb, ChevronRight, Sparkles, Tag } from 'lucide-react';
import Link from 'next/link';

export default function CompletedCoachingList({ cards = [] }) {
    // 카드가 없으면 컴포넌트를 렌더링하지 않음
    if (cards.length === 0) {
        return null;
    }

    const getIconForSubject = (subject) => {
        switch (subject) {
            case "행동 변화 제안": return <Sparkles size={20} color="#718096" />;
            case "누수 소비": return <Droplets size={20} color="#718096" />;
            case "위치 기반 대안": return <MapPin size={20} color="#718096" />;
            case "키워드 기반 대안": return <Tag size={20} color="#718096" />;
            default: return <Lightbulb size={20} color="#718096" />;
        }
    };

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
                    이전 코칭 카드
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
                {cards.map((card) => (
                    <div key={card.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--card-bg)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {getIconForSubject(card.tag)}
                            <span style={{
                                color: 'var(--text-main)',
                                fontSize: '1rem'
                            }}>
                                {card.title}
                            </span>
                        </div>
                        <CheckCircle2 size={24} color="#14b8a6" fill="#e6fffa" />
                    </div>
                ))}
            </div>
        </div>
    );
}

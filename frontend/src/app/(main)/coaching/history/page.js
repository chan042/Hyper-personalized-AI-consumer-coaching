"use client";

import { useState, useEffect } from 'react';
import { CheckCircle2, ShoppingBag, MapPin, Droplets, Zap, Lightbulb } from 'lucide-react';
import { getCoachingAdvice } from '@/lib/api/coaching';

export default function HistoryPage() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);

    const getIconForSubject = (subject) => {
        switch (subject) {
            case "행동 변화 제안": return <Zap size={20} color="#718096" />;
            case "누수 소비": return <Droplets size={20} color="#718096" />;
            case "위치 기반 대안": return <MapPin size={20} color="#718096" />;
            case "키워드 기반 대안": return <ShoppingBag size={20} color="#718096" />;
            default: return <Lightbulb size={20} color="#718096" />;
        }
    };

    useEffect(() => {
        const fetchCoaching = async () => {
            try {
                const data = await getCoachingAdvice();
                // Map backend data to frontend format
                // 최신 4개는 메인 페이지 상단에 노출되므로 제외
                const mappedCards = data.slice(4).map(item => ({
                    id: item.id,
                    subject: item.subject,
                    title: item.title,
                    created_at: item.created_at
                }));
                setCards(mappedCards);
            } catch (error) {
                console.error("Failed to fetch coaching:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCoaching();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-light)' }}>
            <h1 style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                padding: '1rem 1.5rem'
            }}>
                이전 코칭 카드
            </h1>
            <main style={{ padding: '0 1.5rem 2rem 1.5rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-sub)' }}>
                        로딩 중...
                    </div>
                ) : cards.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-sub)' }}>
                        아직 생성된 코칭 카드가 없습니다.
                    </div>
                ) : (
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
                                    {getIconForSubject(card.subject)}
                                    <div>
                                        <div style={{
                                            color: 'var(--text-main)',
                                            fontSize: '1rem',
                                            marginBottom: '0.2rem'
                                        }}>
                                            {card.title}
                                        </div>
                                        <div style={{
                                            color: 'var(--text-sub)',
                                            fontSize: '0.8rem'
                                        }}>
                                            {formatDate(card.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <CheckCircle2 size={24} color="#2f855a" fill="#e6fffa" />
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div >
    );
}
